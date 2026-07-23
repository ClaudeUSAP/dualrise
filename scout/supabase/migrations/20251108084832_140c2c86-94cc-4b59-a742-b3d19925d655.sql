-- Add new columns for raw scoring averages (actual scores, not vs CR)
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS best_recent_scoring_avg_raw TEXT,
ADD COLUMN IF NOT EXISTS best_recent_period_raw TEXT,
ADD COLUMN IF NOT EXISTS scoring_avg_last_5_raw TEXT,
ADD COLUMN IF NOT EXISTS scoring_avg_last_7_raw TEXT,
ADD COLUMN IF NOT EXISTS scoring_avg_last_10_raw TEXT,
ADD COLUMN IF NOT EXISTS scoring_avg_current_year_raw TEXT;

-- Create function to calculate RAW average scoring (actual scores per round, NOT vs CR)
CREATE OR REPLACE FUNCTION public.calculate_scoring_avg_dynamic(
  athlete_uuid UUID,
  filter_type TEXT DEFAULT 'all',
  filter_value TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  avg_score DECIMAL;
  year_filter INTEGER;
  last_n_filter INTEGER;
BEGIN
  -- Parse filter values
  IF filter_type = 'year' AND filter_value IS NOT NULL THEN
    year_filter := filter_value::INTEGER;
  ELSIF filter_type = 'last_n' AND filter_value IS NOT NULL THEN
    last_n_filter := filter_value::INTEGER;
  END IF;

  -- Calculate based on filter type
  IF filter_type = 'year' THEN
    -- Filter by specific year - calculate raw average score per round
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)
          WHEN t.field_size::INTEGER <= 30 THEN 
            tr.total_score::DECIMAL / 3
          ELSE 
            tr.total_score::DECIMAL / 4
        END
      ), 2)
    INTO avg_score
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND t.year = year_filter::TEXT;
      
  ELSIF filter_type = 'last_n' THEN
    -- Get last N tournaments - calculate raw average score per round
    SELECT 
      ROUND(AVG(score_per_round), 2)
    INTO avg_score
    FROM (
      SELECT 
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)
          WHEN t.field_size::INTEGER <= 30 THEN 
            tr.total_score::DECIMAL / 3
          ELSE 
            tr.total_score::DECIMAL / 4
        END as score_per_round
      FROM tournament_results tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE tr.athlete_id = athlete_uuid
        AND tr.total_score IS NOT NULL
      ORDER BY t.end_date DESC NULLS LAST, t.start_date DESC NULLS LAST, t.year::INT DESC
      LIMIT last_n_filter
    ) recent_tournaments;
    
  ELSE
    -- All time calculation - raw average score per round
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)
          WHEN t.field_size::INTEGER <= 30 THEN 
            tr.total_score::DECIMAL / 3
          ELSE 
            tr.total_score::DECIMAL / 4
        END
      ), 2)
    INTO avg_score
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL;
  END IF;
  
  RETURN COALESCE(avg_score, 0);
END;
$$;

-- Update the cache function to populate BOTH vs CR and raw scoring columns
CREATE OR REPLACE FUNCTION public.update_athlete_statistics_cache(
  p_athlete_id UUID,
  p_metric_type TEXT DEFAULT 'scoring_avg_vs_cr'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  
  -- VS CR calculations (existing)
  calc_value_vs_cr DECIMAL;
  calc_last_5_vs_cr DECIMAL;
  calc_last_7_vs_cr DECIMAL;
  calc_last_10_vs_cr DECIMAL;
  calc_current_year_vs_cr DECIMAL;
  best_value_vs_cr DECIMAL;
  best_period_vs_cr TEXT;
  
  -- RAW score calculations (new)
  calc_last_5_raw DECIMAL;
  calc_last_7_raw DECIMAL;
  calc_last_10_raw DECIMAL;
  calc_current_year_raw DECIMAL;
  best_value_raw DECIMAL;
  best_period_raw TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Calculate all VS CR periods (existing logic)
  calc_last_5_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'year', current_year);
  
  -- Calculate all RAW score periods (new logic)
  calc_last_5_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'year', current_year);
  
  -- Determine best (lowest) VS CR score
  best_value_vs_cr := calc_last_5_vs_cr;
  best_period_vs_cr := 'Last 5';
  
  IF calc_last_7_vs_cr IS NOT NULL AND (best_value_vs_cr IS NULL OR calc_last_7_vs_cr < best_value_vs_cr) THEN
    best_value_vs_cr := calc_last_7_vs_cr;
    best_period_vs_cr := 'Last 7';
  END IF;
  
  IF calc_last_10_vs_cr IS NOT NULL AND (best_value_vs_cr IS NULL OR calc_last_10_vs_cr < best_value_vs_cr) THEN
    best_value_vs_cr := calc_last_10_vs_cr;
    best_period_vs_cr := 'Last 10';
  END IF;
  
  IF calc_current_year_vs_cr IS NOT NULL AND (best_value_vs_cr IS NULL OR calc_current_year_vs_cr < best_value_vs_cr) THEN
    best_value_vs_cr := calc_current_year_vs_cr;
    best_period_vs_cr := 'Current Year';
  END IF;
  
  -- Determine best (lowest) RAW score
  best_value_raw := calc_last_5_raw;
  best_period_raw := 'Last 5';
  
  IF calc_last_7_raw IS NOT NULL AND (best_value_raw IS NULL OR calc_last_7_raw < best_value_raw) THEN
    best_value_raw := calc_last_7_raw;
    best_period_raw := 'Last 7';
  END IF;
  
  IF calc_last_10_raw IS NOT NULL AND (best_value_raw IS NULL OR calc_last_10_raw < best_value_raw) THEN
    best_value_raw := calc_last_10_raw;
    best_period_raw := 'Last 10';
  END IF;
  
  IF calc_current_year_raw IS NOT NULL AND (best_value_raw IS NULL OR calc_current_year_raw < best_value_raw) THEN
    best_value_raw := calc_current_year_raw;
    best_period_raw := 'Current Year';
  END IF;
  
  -- Update all-time average (using empty string for NULL to match index)
  calc_value_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'all', NULL);
  
  -- Insert/update athlete_statistics table entries
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value, 
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'all_time', NULL,
    calc_value_vs_cr, 
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
    calc_current_year_vs_cr,
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
  
  -- Update last 5, 7, 10 tournaments
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '5',
    calc_last_5_vs_cr, 5, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '7',
    calc_last_7_vs_cr, 7, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  INSERT INTO athlete_statistics (
    athlete_id, metric_type, period_type, period_value,
    calculated_value, tournaments_included, last_calculated
  ) VALUES (
    p_athlete_id, p_metric_type, 'last_n', '10',
    calc_last_10_vs_cr, 10, NOW()
  )
  ON CONFLICT (athlete_id, metric_type, period_type, COALESCE(period_value, ''))
  DO UPDATE SET 
    calculated_value = EXCLUDED.calculated_value,
    last_calculated = NOW();
  
  -- Update cached columns in athletes table
  UPDATE athletes SET
    -- VS CR columns (existing)
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
    best_recent_scoring_avg = best_value_vs_cr::TEXT,
    best_recent_period = best_period_vs_cr,
    
    -- RAW score columns (new)
    scoring_avg_last_5_raw = calc_last_5_raw::TEXT,
    scoring_avg_last_7_raw = calc_last_7_raw::TEXT,
    scoring_avg_last_10_raw = calc_last_10_raw::TEXT,
    scoring_avg_current_year_raw = calc_current_year_raw::TEXT,
    best_recent_scoring_avg_raw = best_value_raw::TEXT,
    best_recent_period_raw = best_period_raw,
    
    scoring_avg_vs_cr_last_update = NOW()
  WHERE id = p_athlete_id;
END;
$$;

-- Backfill all existing athletes with both vs CR and raw scores
DO $$
DECLARE
  athlete_record RECORD;
BEGIN
  FOR athlete_record IN 
    SELECT DISTINCT athlete_id 
    FROM tournament_results 
    WHERE athlete_id IS NOT NULL
      AND total_score IS NOT NULL
  LOOP
    PERFORM update_athlete_statistics_cache(athlete_record.athlete_id, 'scoring_avg_vs_cr');
  END LOOP;
END $$;