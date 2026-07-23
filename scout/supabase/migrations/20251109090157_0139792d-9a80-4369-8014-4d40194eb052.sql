-- Fix final function missing search_path
-- Add fixed search_path to update_athlete_statistics_cache function

CREATE OR REPLACE FUNCTION public.update_athlete_statistics_cache(p_athlete_id uuid, p_metric_type text DEFAULT 'scoring_avg_vs_cr'::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  current_year TEXT;
  
  -- VS CR calculations
  calc_value_vs_cr DECIMAL;
  calc_last_3_vs_cr DECIMAL;
  calc_last_5_vs_cr DECIMAL;
  calc_last_7_vs_cr DECIMAL;
  calc_last_10_vs_cr DECIMAL;
  calc_current_year_vs_cr DECIMAL;
  best_value_vs_cr DECIMAL;
  best_period_vs_cr TEXT;
  
  -- RAW score calculations
  calc_all_time_raw DECIMAL;
  calc_last_3_raw DECIMAL;
  calc_last_5_raw DECIMAL;
  calc_last_7_raw DECIMAL;
  calc_last_10_raw DECIMAL;
  calc_current_year_raw DECIMAL;
  best_value_raw DECIMAL;
  best_period_raw TEXT;
  
  -- VS PAR calculations
  calc_all_time_vs_par DECIMAL;
  calc_last_3_vs_par DECIMAL;
  calc_last_5_vs_par DECIMAL;
  calc_last_7_vs_par DECIMAL;
  calc_last_10_vs_par DECIMAL;
  calc_current_year_vs_par DECIMAL;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Calculate all VS CR periods (including Last 3 and Last 7)
  calc_last_3_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '3');
  calc_last_5_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'year', current_year);
  calc_value_vs_cr := calculate_scoring_avg_vs_cr_dynamic(p_athlete_id, 'all', NULL);
  
  -- Calculate all RAW score periods (including Last 3)
  calc_all_time_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'all', NULL);
  calc_last_3_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '3');
  calc_last_5_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year_raw := calculate_scoring_avg_dynamic(p_athlete_id, 'year', current_year);
  
  -- Calculate all VS PAR periods (including Last 3)
  calc_all_time_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'all', NULL);
  calc_last_3_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'last_n', '3');
  calc_last_5_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'last_n', '5');
  calc_last_7_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'last_n', '7');
  calc_last_10_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'last_n', '10');
  calc_current_year_vs_par := calculate_scoring_avg_vs_par_dynamic(p_athlete_id, 'year', current_year);
  
  -- Determine best (lowest) VS CR score (including Last 3)
  best_value_vs_cr := calc_last_3_vs_cr;
  best_period_vs_cr := 'Last 3';
  
  IF calc_last_5_vs_cr IS NOT NULL AND (best_value_vs_cr IS NULL OR calc_last_5_vs_cr < best_value_vs_cr) THEN
    best_value_vs_cr := calc_last_5_vs_cr;
    best_period_vs_cr := 'Last 5';
  END IF;
  
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
  
  -- Determine best (lowest) RAW score (including Last 3)
  best_value_raw := calc_last_3_raw;
  best_period_raw := 'Last 3';
  
  IF calc_last_5_raw IS NOT NULL AND (best_value_raw IS NULL OR calc_last_5_raw < best_value_raw) THEN
    best_value_raw := calc_last_5_raw;
    best_period_raw := 'Last 5';
  END IF;
  
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
  
  -- Update cached columns in athletes table (including Last 3 and Last 7 vs CR)
  UPDATE athletes SET
    -- VS CR columns
    scoring_average_vs_course_rating = calc_value_vs_cr::TEXT,
    scoring_avg_vs_cr_current_year = calc_current_year_vs_cr::TEXT,
    scoring_avg_vs_cr_last_3 = calc_last_3_vs_cr::TEXT,
    scoring_avg_vs_cr_last_5 = calc_last_5_vs_cr::TEXT,
    scoring_avg_last_7 = calc_last_7_vs_cr::TEXT,
    scoring_avg_vs_cr_last_7 = calc_last_7_vs_cr::TEXT,
    scoring_avg_vs_cr_last_10 = calc_last_10_vs_cr::TEXT,
    best_recent_scoring_avg = best_value_vs_cr::TEXT,
    best_recent_period = best_period_vs_cr,
    
    -- RAW score columns
    scoring_avg_all_time_raw = calc_all_time_raw::TEXT,
    scoring_avg_last_3_raw = calc_last_3_raw::TEXT,
    scoring_avg_last_5_raw = calc_last_5_raw::TEXT,
    scoring_avg_last_7_raw = calc_last_7_raw::TEXT,
    scoring_avg_last_10_raw = calc_last_10_raw::TEXT,
    scoring_avg_current_year_raw = calc_current_year_raw::TEXT,
    best_recent_scoring_avg_raw = best_value_raw::TEXT,
    best_recent_period_raw = best_period_raw,
    
    -- VS PAR columns
    scoring_avg_vs_par_all_time = calc_all_time_vs_par::TEXT,
    scoring_avg_vs_par_last_3 = calc_last_3_vs_par::TEXT,
    scoring_avg_vs_par_last_5 = calc_last_5_vs_par::TEXT,
    scoring_avg_vs_par_last_7 = calc_last_7_vs_par::TEXT,
    scoring_avg_vs_par_last_10 = calc_last_10_vs_par::TEXT,
    scoring_avg_vs_par_current_year = calc_current_year_vs_par::TEXT,
    
    scoring_avg_vs_cr_last_update = NOW()
  WHERE id = p_athlete_id;
END;
$function$;