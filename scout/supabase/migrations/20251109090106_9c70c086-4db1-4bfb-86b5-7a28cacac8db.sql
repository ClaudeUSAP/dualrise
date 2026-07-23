-- Fix remaining function missing search_path
-- Add fixed search_path to calculate_athlete_metrics function

CREATE OR REPLACE FUNCTION calculate_athlete_metrics(
  athlete_uuid UUID,
  last_n INTEGER DEFAULT NULL
)
RETURNS TABLE (
  avg_score_vs_par DECIMAL,
  avg_score_vs_cr DECIMAL,
  best_finish INTEGER,
  total_tournaments INTEGER,
  top_10_finishes INTEGER
) 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF last_n IS NOT NULL AND last_n > 0 THEN
    -- Last N tournaments calculation
    RETURN QUERY
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_par::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_par::DECIMAL
        END
      ), 2) as avg_score_vs_par,
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL
        END
      ), 2) as avg_score_vs_cr,
      MIN(tr.position) as best_finish,
      COUNT(DISTINCT tr.tournament_id)::INTEGER as total_tournaments,
      COUNT(CASE WHEN tr.position <= 10 AND tr.position > 0 THEN 1 END)::INTEGER as top_10_finishes
    FROM (
      SELECT 
        tr.*,
        t.course_par,
        t.course_rating,
        t.year
      FROM tournament_results tr
      JOIN tournaments t ON tr.tournament_id = t.id
      WHERE tr.athlete_id = athlete_uuid
        AND tr.total_score IS NOT NULL
        AND t.course_rating IS NOT NULL
        AND t.course_rating != ''
      ORDER BY t.year DESC, t.created_at DESC
      LIMIT last_n
    ) recent_tournaments;
    
  ELSE
    -- All time calculation (default)
    RETURN QUERY
    SELECT 
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_par::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_par::DECIMAL
        END
      ), 2) as avg_score_vs_par,
      ROUND(AVG(
        CASE 
          WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
            (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
          ELSE 
            (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL
        END
      ), 2) as avg_score_vs_cr,
      MIN(tr.position) as best_finish,
      COUNT(DISTINCT tr.tournament_id)::INTEGER as total_tournaments,
      COUNT(CASE WHEN tr.position <= 10 AND tr.position > 0 THEN 1 END)::INTEGER as top_10_finishes
    FROM tournament_results tr
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.athlete_id = athlete_uuid
      AND tr.total_score IS NOT NULL;
  END IF;
END;
$$;