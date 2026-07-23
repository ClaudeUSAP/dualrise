-- Replace calculate_scoring_avg_vs_cr_dynamic to remove start_date/end_date usage
CREATE OR REPLACE FUNCTION public.calculate_scoring_avg_vs_cr_dynamic(
  athlete_uuid uuid,
  filter_type text DEFAULT 'all',
  filter_value text DEFAULT NULL
)
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
  -- Parse filter values
  IF filter_type = 'year' AND filter_value IS NOT NULL THEN
    year_filter := filter_value::INTEGER;
  ELSIF filter_type = 'last_n' AND filter_value IS NOT NULL THEN
    last_n_filter := filter_value::INTEGER;
  END IF;

  -- Calculate based on filter type
  IF filter_type = 'year' THEN
    -- Filter by specific year
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
      AND t.course_rating IS NOT NULL
      AND t.course_rating != ''
      AND t.year = year_filter::TEXT;
      
  ELSIF filter_type = 'last_n' THEN
    -- Get last N tournaments (order by year and creation time)
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
        AND t.course_rating IS NOT NULL
        AND t.course_rating != ''
      ORDER BY t.year::INT DESC, t.created_at DESC
      LIMIT last_n_filter
    ) recent_tournaments;
    
  ELSE
    -- All time calculation (default)
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
      AND t.course_rating IS NOT NULL
      AND t.course_rating != '';
  END IF;
  
  RETURN COALESCE(avg_vs_cr, 0);
END;
$function$;