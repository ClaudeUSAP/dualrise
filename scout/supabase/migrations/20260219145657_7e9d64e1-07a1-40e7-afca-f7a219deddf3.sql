
-- Fix calculate_scoring_avg_vs_cr_dynamic to use round-weighted method
-- Instead of AVG(per-tournament average), use: (SUM(total_score) - SUM(CR * rounds)) / SUM(rounds)
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
      ROUND(
        (SUM(tr.total_score) - SUM(t.course_rating::DECIMAL * 
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        )) / NULLIF(SUM(
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        ), 0)
      , 2)
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
      ROUND(
        (SUM(total_score) - SUM(cr_x_rounds)) / NULLIF(SUM(num_rounds), 0)
      , 2)
    INTO avg_vs_cr
    FROM (
      SELECT 
        tr.total_score,
        t.course_rating::DECIMAL * (
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        ) as cr_x_rounds,
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            array_length(string_to_array(tr.rounds, ','), 1)
          WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
          ELSE 4
        END as num_rounds
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
      ROUND(
        (SUM(tr.total_score) - SUM(t.course_rating::DECIMAL * 
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        )) / NULLIF(SUM(
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        ), 0)
      , 2)
    INTO avg_vs_cr
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND tr.total_score > 0
      AND t.course_rating IS NOT NULL
      AND t.course_rating != '';
  END IF;
  
  RETURN avg_vs_cr;
END;
$function$;

-- Fix calculate_scoring_avg_vs_par_dynamic to use round-weighted method
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
      ROUND(
        (SUM(tr.total_score) - SUM(t.course_par::DECIMAL * 
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        )) / NULLIF(SUM(
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        ), 0)
      , 2)
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
      ROUND(
        (SUM(total_score) - SUM(par_x_rounds)) / NULLIF(SUM(num_rounds), 0)
      , 2)
    INTO avg_vs_par
    FROM (
      SELECT 
        tr.total_score,
        t.course_par::DECIMAL * (
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        ) as par_x_rounds,
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            array_length(string_to_array(tr.rounds, ','), 1)
          WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
          ELSE 4
        END as num_rounds
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
      ROUND(
        (SUM(tr.total_score) - SUM(t.course_par::DECIMAL * 
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        )) / NULLIF(SUM(
          CASE 
            WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
              array_length(string_to_array(tr.rounds, ','), 1)
            WHEN t.field_size IS NOT NULL AND t.field_size::INTEGER <= 30 THEN 3
            ELSE 4
          END
        ), 0)
      , 2)
    INTO avg_vs_par
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL
      AND tr.total_score > 0
      AND t.course_par IS NOT NULL
      AND t.course_par != '';
  END IF;
  
  RETURN avg_vs_par;
END;
$function$;
