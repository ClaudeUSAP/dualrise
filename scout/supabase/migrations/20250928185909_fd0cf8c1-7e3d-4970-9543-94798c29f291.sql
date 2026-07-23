-- Update all athletes' scoring average vs course rating based on their tournament results
UPDATE athletes
SET scoring_average_vs_course_rating = calculate_scoring_avg_vs_cr(id)::TEXT
WHERE id IN (
  SELECT DISTINCT athlete_id 
  FROM tournament_results 
  WHERE total_score IS NOT NULL
);