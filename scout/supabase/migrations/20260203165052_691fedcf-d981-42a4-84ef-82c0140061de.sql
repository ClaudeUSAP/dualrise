-- Fix: Exclude total_score = 0 from all scoring average calculations
-- This fixes the bug where placeholder tournament entries (total_score=0) were included in averages

-- ============================================================================
-- FUNCTION 1: calculate_scoring_avg_dynamic
-- ============================================================================
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
      AND tr.total_score > 0
      AND t.year = year_filter::TEXT;
      
  ELSIF filter_type = 'last_n' THEN
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
        AND tr.total_score > 0
      ORDER BY t.end_date DESC NULLS LAST, t.start_date DESC NULLS LAST, tr.import_order ASC NULLS LAST, t.year::INT DESC, tr.created_at DESC
      LIMIT last_n_filter
    ) recent_tournaments;
    
  ELSE
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
      AND tr.total_score > 0;
  END IF;
  
  -- Return NULL if no data, not 0
  RETURN avg_score;
END;
$function$;

-- ============================================================================
-- FUNCTION 2: calculate_scoring_avg_vs_cr_dynamic
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_scoring_avg_vs_cr_dynamic(athlete_uuid uuid, filter_type text DEFAULT 'all'::text, filter_value text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  avg_vs_cr DECIMAL;
  year_filter INTEGER;
  last_n_filter INTEGER;
BEGIN
  IF filter_type = 'year' AND filter_value IS NOT NULL THEN
    year_filter := filter_value::INTEGER;
  ELSIF filter_type = 'last_n' AND filter_value IS NOT NULL THEN
    last_n_filter := filter_value::INTEGER;
  END IF;

  IF filter_type = 'year' THEN
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_rating::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL
        END
      ), 2)
    INTO avg_vs_cr
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND tr.total_score > 0
      AND t.course_rating IS NOT NULL
      AND t.course_rating != ''
      AND t.year = year_filter::TEXT;
      
  ELSIF filter_type = 'last_n' THEN
    SELECT 
      ROUND(AVG(score_vs_cr), 2)
    INTO avg_vs_cr
    FROM (
      SELECT 
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_rating::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL
        END as score_vs_cr
      FROM tournament_results tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE tr.athlete_id = athlete_uuid
        AND tr.total_score IS NOT NULL
        AND tr.total_score > 0
        AND t.course_rating IS NOT NULL
        AND t.course_rating != ''
      ORDER BY t.end_date DESC NULLS LAST, t.start_date DESC NULLS LAST, tr.import_order ASC NULLS LAST, t.year::INT DESC, tr.created_at DESC
      LIMIT last_n_filter
    ) recent_tournaments;
    
  ELSE
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
          WHEN t.field_size::INTEGER <= 30 THEN 
            (tr.total_score::DECIMAL / 3) - t.course_rating::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL
        END
      ), 2)
    INTO avg_vs_cr
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND tr.total_score > 0
      AND t.course_rating IS NOT NULL
      AND t.course_rating != '';
  END IF;
  
  -- Return NULL if no data, not 0
  RETURN avg_vs_cr;
END;
$function$;

-- ============================================================================
-- FUNCTION 3: calculate_scoring_avg_vs_par_dynamic
-- ============================================================================
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
      AND tr.total_score > 0
      AND t.course_par IS NOT NULL
      AND t.course_par != ''
      AND t.year = year_filter::TEXT;
      
  ELSIF filter_type = 'last_n' THEN
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
        AND tr.total_score > 0
        AND t.course_par IS NOT NULL
        AND t.course_par != ''
      ORDER BY t.end_date DESC NULLS LAST, t.start_date DESC NULLS LAST, tr.import_order ASC NULLS LAST, t.year::INT DESC, tr.created_at DESC
      LIMIT last_n_filter
    ) recent_tournaments;
    
  ELSE
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
      AND tr.total_score > 0
      AND t.course_par IS NOT NULL
      AND t.course_par != '';
  END IF;
  
  -- Return NULL if no data, not 0
  RETURN avg_vs_par;
END;
$function$;