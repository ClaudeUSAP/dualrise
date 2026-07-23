-- Step 1: Remove duplicate entries, keeping only the most recent
DELETE FROM athlete_statistics a
USING athlete_statistics b
WHERE a.id < b.id 
  AND a.athlete_id = b.athlete_id 
  AND a.metric_type = b.metric_type 
  AND a.period_type = b.period_type 
  AND COALESCE(a.period_value, '') = COALESCE(b.period_value, '');

-- Step 2: Drop the old unique constraint if it exists
DROP INDEX IF EXISTS athlete_statistics_athlete_id_metric_type_period_type_key;

-- Step 3: Add new unique index that matches our needs
CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_statistics_unique 
ON athlete_statistics(athlete_id, metric_type, period_type, COALESCE(period_value, ''));

-- Step 4: Update the cache function to work with the new unique constraint
CREATE OR REPLACE FUNCTION public.update_athlete_statistics_cache(p_athlete_id uuid, p_metric_type text DEFAULT 'scoring_avg_vs_cr'::text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  calc_value DECIMAL;
  tournament_count INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Update all-time average (using empty string for NULL to match index)
  calc_value := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'all', NULL);
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value, 
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'all_time', NULL,
    calc_value, 
    (SELECT COUNT(*) FROM tournament_results tr 
     JOIN tournaments t ON tr.tournament_id = t.id 
     WHERE tr.athlete_id = p_athlete_id 
       AND tr.total_score IS NOT NULL 
       AND t.course_rating IS NOT NULL 
       AND t.course_rating != ''),
    NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    tournaments_included = EXCLUDED.tournaments_included,
    last_calculated = NOW();
  
  -- Update current year average
  calc_value := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'year', current_year);
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'year', current_year,
    calc_value,
    (SELECT COUNT(*) FROM tournament_results tr 
     JOIN tournaments t ON tr.tournament_id = t.id 
     WHERE tr.athlete_id = p_athlete_id 
       AND tr.total_score IS NOT NULL 
       AND t.course_rating IS NOT NULL 
       AND t.course_rating != ''
       AND t.year = current_year),
    NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    tournaments_included = EXCLUDED.tournaments_included,
    last_calculated = NOW();
  
  -- Update last 5 tournaments
  calc_value := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '5');
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '5',
    calc_value, 5, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  -- Update last 10 tournaments
  calc_value := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '10');
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '10',
    calc_value, 10, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  -- Update cached columns in athletes table (using LIMIT 1 to prevent multiple row errors)
  UPDATE athletes SET
    scoring_average_vs_course_rating = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'all_time'
      LIMIT 1
    ),
    scoring_avg_vs_cr_current_year = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'year'
        AND ast.period_value = current_year
      LIMIT 1
    ),
    scoring_avg_vs_cr_last_5 = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'last_n'
        AND ast.period_value = '5'
      LIMIT 1
    ),
    scoring_avg_vs_cr_last_10 = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'last_n'
        AND ast.period_value = '10'
      LIMIT 1
    ),
    scoring_avg_vs_cr_last_update = NOW()
  WHERE id = p_athlete_id;
END;
$$;

-- Step 5: Create trigger function to auto-update cache when tournament results change
CREATE OR REPLACE FUNCTION auto_update_athlete_statistics_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_athlete_statistics_cache(OLD.athlete_id, 'scoring_avg_vs_cr');
    RETURN OLD;
  ELSE
    PERFORM update_athlete_statistics_cache(NEW.athlete_id, 'scoring_avg_vs_cr');
    RETURN NEW;
  END IF;
END;
$$;

-- Step 6: Attach trigger to tournament_results table
DROP TRIGGER IF EXISTS trigger_auto_update_athlete_statistics ON tournament_results;
CREATE TRIGGER trigger_auto_update_athlete_statistics
AFTER INSERT OR UPDATE OR DELETE ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION auto_update_athlete_statistics_cache();

-- Step 7: Backfill all existing athletes with tournament results
DO $$
DECLARE
  athlete_record RECORD;
BEGIN
  FOR athlete_record IN 
    SELECT DISTINCT athlete_id 
    FROM tournament_results 
    WHERE total_score IS NOT NULL
  LOOP
    PERFORM update_athlete_statistics_cache(athlete_record.athlete_id, 'scoring_avg_vs_cr');
  END LOOP;
END;
$$;