-- Add new columns for Last 7 and Best Recent scoring averages
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS scoring_avg_last_7 TEXT,
ADD COLUMN IF NOT EXISTS best_recent_scoring_avg TEXT,
ADD COLUMN IF NOT EXISTS best_recent_period TEXT;

-- Update the update_athlete_statistics_cache function to include Last 7 and Best Recent
CREATE OR REPLACE FUNCTION public.update_athlete_statistics_cache(p_athlete_id uuid, p_metric_type text DEFAULT 'scoring_avg_vs_cr'::text)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  current_year TEXT;
  calc_value DECIMAL;
  calc_last_5 DECIMAL;
  calc_last_7 DECIMAL;
  calc_last_10 DECIMAL;
  calc_current_year DECIMAL;
  best_value DECIMAL;
  best_period TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Calculate all periods
  calc_last_5 := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7 := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10 := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'year', current_year);
  
  -- Determine best (lowest) recent score
  best_value := calc_last_5;
  best_period := 'Last 5';
  
  IF calc_last_7 IS NOT NULL AND (best_value IS NULL OR calc_last_7 < best_value) THEN
    best_value := calc_last_7;
    best_period := 'Last 7';
  END IF;
  
  IF calc_last_10 IS NOT NULL AND (best_value IS NULL OR calc_last_10 < best_value) THEN
    best_value := calc_last_10;
    best_period := 'Last 10';
  END IF;
  
  IF calc_current_year IS NOT NULL AND (best_value IS NULL OR calc_current_year < best_value) THEN
    best_value := calc_current_year;
    best_period := 'Current Year';
  END IF;
  
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
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'year', current_year,
    calc_current_year,
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
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '5',
    calc_last_5, 5, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  -- Update last 7 tournaments (NEW)
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '7',
    calc_last_7, 7, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  -- Update last 10 tournaments
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '10',
    calc_last_10, 10, NOW()
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
    scoring_avg_last_7 = (
      SELECT ast.calculated_value::TEXT 
      FROM athlete_statistics ast
      WHERE ast.athlete_id = p_athlete_id 
        AND ast.metric_type = p_metric_type 
        AND ast.period_type = 'last_n'
        AND ast.period_value = '7'
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
    best_recent_scoring_avg = best_value::TEXT,
    best_recent_period = best_period,
    scoring_avg_vs_cr_last_update = NOW()
  WHERE id = p_athlete_id;
END;
$function$;