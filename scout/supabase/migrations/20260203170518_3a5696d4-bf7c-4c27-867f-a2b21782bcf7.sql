-- First, clean up existing invalid entries by setting them to NULL
UPDATE tournament_results SET total_score = NULL WHERE total_score = 0;

-- Add constraint to prevent future total_score = 0 entries
-- NULL is allowed (for match-play events), but 0 is not
ALTER TABLE tournament_results 
ADD CONSTRAINT total_score_positive_check 
CHECK (total_score IS NULL OR total_score > 0);