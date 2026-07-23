-- Update all tournaments that have results to 'completed' status
-- This fixes existing data where tournaments were imported with 'planned' status

UPDATE tournaments
SET status = 'completed'
WHERE id IN (
  SELECT DISTINCT tournament_id 
  FROM tournament_results
)
AND status IN ('planned', 'in_progress');