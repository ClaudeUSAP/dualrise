-- Add new columns to athletes table for comprehensive scoring metrics
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS scoring_avg_all_time_raw TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS scoring_avg_vs_par_current_year TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS scoring_avg_vs_par_last_5 TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS scoring_avg_vs_par_last_7 TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS scoring_avg_vs_par_last_10 TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS scoring_avg_vs_par_all_time TEXT;

-- Fix calculate_scoring_avg_dynamic to use SUM/SUM instead of AVG
CREATE OR REPLACE FUNCTION public.calculate_scoring_avg_dynamic(athlete_uuid uuid, filter_type text DEFAULT 'all'::text, filter_value text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  avg_score DECIMAL;
  year_filter INTEGER;
  last_n_filter INTEGER;
BEGIN
  IF filter_type = 'year' AND filter_value IS NOT NULL THEN
    year_filter := filter_value::INTEGER;
  ELSIF filter_type = 'last_n' AND filter_value IS NOT NULL THEN
    last_n_filter := filter_value::INTEGER;
  END IF;

  IF filter_type = 'year' THEN
    -- Filter by specific year - use SUM(total_score) / SUM(num_rounds)
    SELECT 
      ROUND(
        SUM(tr.total_score)::DECIMAL / 
        SUM(
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        ), 2
      )
    INTO avg_score
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND t.year = year_filter::TEXT;
      
  ELSIF filter_type = 'last_n' THEN
    -- Get last N tournaments - use SUM/SUM calculation
    SELECT 
      ROUND(
        SUM(total_score)::DECIMAL / SUM(num_rounds), 2
      )
    INTO avg_score
    FROM (
      SELECT 
        tr.total_score,
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            array_length(string_to_array(tr.rounds, ','), 1)
          WHEN t.field_size::INTEGER <= 30 THEN 3
          ELSE 4
        END as num_rounds
      FROM tournament_results tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE tr.athlete_id = athlete_uuid
        AND tr.total_score IS NOT NULL
      ORDER BY t.end_date DESC NULLS LAST, t.start_date DESC NULLS LAST, t.year::INT DESC
      LIMIT last_n_filter
    ) recent_tournaments;
    
  ELSE
    -- All time calculation - use SUM/SUM
    SELECT 
      ROUND(
        SUM(tr.total_score)::DECIMAL / 
        SUM(
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        ), 2
      )
    INTO avg_score
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL;
  END IF;
  
  RETURN COALESCE(avg_score, 0);
END;
$function$;

-- Create new function for calculating average score vs par
CREATE OR REPLACE FUNCTION public.calculate_scoring_avg_vs_par_dynamic(athlete_uuid uuid, filter_type text DEFAULT 'all'::text, filter_value text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  avg_vs_par DECIMAL;
  year_filter INTEGER;
  last_n_filter INTEGER;
BEGIN
  IF filter_type = 'year' AND filter_value IS NOT NULL THEN
    year_filter := filter_value::INTEGER;
  ELSIF filter_type = 'last_n' AND filter_value IS NOT NULL THEN
    last_n_filter := filter_value::INTEGER;
  END IF;

  IF filter_type = 'year' THEN
    -- Filter by specific year
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_par::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_par::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_par::DECIMAL
        END
      ), 2)
    INTO avg_vs_par
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND t.course_par IS NOT NULL
      AND t.course_par != ''
      AND t.year = year_filter::TEXT;
      
  ELSIF filter_type = 'last_n' THEN
    -- Get last N tournaments
    SELECT 
      ROUND(AVG(score_vs_par), 2)
    INTO avg_vs_par
    FROM (
      SELECT 
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_par::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_par::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_par::DECIMAL
        END as score_vs_par
      FROM tournament_results tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE tr.athlete_id = athlete_uuid
        AND tr.total_score IS NOT NULL
        AND t.course_par IS NOT NULL
        AND t.course_par != ''
      ORDER BY t.end_date DESC NULLS LAST, t.start_date DESC NULLS LAST, t.year::INT DESC
      LIMIT last_n_filter
    ) recent_tournaments;
    
  ELSE
    -- All time calculation
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_par::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_par::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_par::DECIMAL
        END
      ), 2)
    INTO avg_vs_par
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND t.course_par IS NOT NULL
      AND t.course_par != '';
  END IF;
  
  RETURN COALESCE(avg_vs_par, 0);
END;
$function$;

-- Update the cache function to calculate and store ALL metrics
CREATE OR REPLACE FUNCTION public.update_athlete_statistics_cache(p_athlete_id uuid, p_metric_type text DEFAULT 'scoring_avg_vs_cr'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_year TEXT;
  
  -- VS CR calculations
  calc_value_vs_cr DECIMAL;
  calc_last_5_vs_cr DECIMAL;
  calc_last_7_vs_cr DECIMAL;
  calc_last_10_vs_cr DECIMAL;
  calc_current_year_vs_cr DECIMAL;
  best_value_vs_cr DECIMAL;
  best_period_vs_cr TEXT;
  
  -- RAW score calculations
  calc_all_time_raw DECIMAL;
  calc_last_5_raw DECIMAL;
  calc_last_7_raw DECIMAL;
  calc_last_10_raw DECIMAL;
  calc_current_year_raw DECIMAL;
  best_value_raw DECIMAL;
  best_period_raw TEXT;
  
  -- VS PAR calculations
  calc_all_time_vs_par DECIMAL;
  calc_last_5_vs_par DECIMAL;
  calc_last_7_vs_par DECIMAL;
  calc_last_10_vs_par DECIMAL;
  calc_current_year_vs_par DECIMAL;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Calculate all VS CR periods
  calc_last_5_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'year', current_year);
  calc_value_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'all', NULL);
  
  -- Calculate all RAW score periods
  calc_all_time_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'all', NULL);
  calc_last_5_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'year', current_year);
  
  -- Calculate all VS PAR periods
  calc_all_time_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'all', NULL);
  calc_last_5_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'year', current_year);
  
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
  
  -- Update cached columns in athletes table
  UPDATE athletes SET
    -- VS CR columns
    scoring_average_vs_course_rating = calc_value_vs_cr::TEXT,
    scoring_avg_vs_cr_current_year = calc_current_year_vs_cr::TEXT,
    scoring_avg_vs_cr_last_5 = calc_last_5_vs_cr::TEXT,
    scoring_avg_last_7 = calc_last_7_vs_cr::TEXT,
    scoring_avg_vs_cr_last_10 = calc_last_10_vs_cr::TEXT,
    best_recent_scoring_avg = best_value_vs_cr::TEXT,
    best_recent_period = best_period_vs_cr,
    
    -- RAW score columns
    scoring_avg_all_time_raw = calc_all_time_raw::TEXT,
    scoring_avg_last_5_raw = calc_last_5_raw::TEXT,
    scoring_avg_last_7_raw = calc_last_7_raw::TEXT,
    scoring_avg_last_10_raw = calc_last_10_raw::TEXT,
    scoring_avg_current_year_raw = calc_current_year_raw::TEXT,
    best_recent_scoring_avg_raw = best_value_raw::TEXT,
    best_recent_period_raw = best_period_raw,
    
    -- VS PAR columns
    scoring_avg_vs_par_all_time = calc_all_time_vs_par::TEXT,
    scoring_avg_vs_par_last_5 = calc_last_5_vs_par::TEXT,
    scoring_avg_vs_par_last_7 = calc_last_7_vs_par::TEXT,
    scoring_avg_vs_par_last_10 = calc_last_10_vs_par::TEXT,
    scoring_avg_vs_par_current_year = calc_current_year_vs_par::TEXT,
    
    scoring_avg_vs_cr_last_update = NOW()
  WHERE id = p_athlete_id;
END;
$function$;

-- Backfill all athletes with the new calculations
DO $$
DECLARE
  athlete_record RECORD;
BEGIN
  FOR athlete_record IN SELECT id FROM athletes LOOP
    PERFORM update_athlete_statistics_cache(athlete_record.id);
  END LOOP;
END $$;