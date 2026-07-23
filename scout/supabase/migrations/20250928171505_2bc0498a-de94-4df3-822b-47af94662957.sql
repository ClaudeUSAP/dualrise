-- Create a function to calculate scoring average vs course rating for an athlete
CREATE OR REPLACE FUNCTION calculate_scoring_avg_vs_cr(athlete_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
  avg_vs_cr DECIMAL;
BEGIN
  -- Calculate the average of (score per round - course rating) across all tournaments
  SELECT 
    ROUND(AVG(
      CASE 
        -- Assume 3 rounds for most tournaments if rounds data is missing
        WHEN tr.rounds IS NOT NULL AND tr.rounds != '' THEN 
          (tr.total_score::DECIMAL / array_length(string_to_array(tr.rounds, ','), 1)) - t.course_rating::DECIMAL
        -- For tournaments with known field sizes, use standard round counts
        WHEN t.field_size::INTEGER <= 30 THEN 
          (tr.total_score::DECIMAL / 3) - t.course_rating::DECIMAL  -- Smaller field = 3 rounds
        ELSE 
          (tr.total_score::DECIMAL / 4) - t.course_rating::DECIMAL  -- Larger field = 4 rounds
      END
    ), 1)
  INTO avg_vs_cr
  FROM tournament_results tr
  JOIN tournaments t ON tr.tournament_id = t.id
  WHERE tr.athlete_id = athlete_uuid
    AND tr.total_score IS NOT NULL
    AND t.course_rating IS NOT NULL
    AND t.course_rating != '';
  
  RETURN COALESCE(avg_vs_cr, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Update existing athletes with calculated scoring average vs course rating
UPDATE athletes
SET scoring_average_vs_course_rating = calculate_scoring_avg_vs_cr(id)::TEXT
WHERE id IN (
  SELECT DISTINCT athlete_id 
  FROM tournament_results 
  WHERE total_score IS NOT NULL
);

-- Create a function to auto-update this value when tournament results change
CREATE OR REPLACE FUNCTION update_athlete_scoring_avg_vs_cr()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the athlete's scoring average vs course rating
  UPDATE athletes
  SET scoring_average_vs_course_rating = calculate_scoring_avg_vs_cr(COALESCE(NEW.athlete_id, OLD.athlete_id))::TEXT
  WHERE id = COALESCE(NEW.athlete_id, OLD.athlete_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update when tournament results are modified
DROP TRIGGER IF EXISTS update_scoring_avg_on_tournament_result ON tournament_results;
CREATE TRIGGER update_scoring_avg_on_tournament_result
AFTER INSERT OR UPDATE OR DELETE ON tournament_results
FOR EACH ROW
EXECUTE FUNCTION update_athlete_scoring_avg_vs_cr();