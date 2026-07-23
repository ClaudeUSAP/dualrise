-- Add 'Club Competition' to the tournaments.category constraint
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_category_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_category_check 
  CHECK (category IN ('National', 'International', 'National Team', 'Club Competition'));