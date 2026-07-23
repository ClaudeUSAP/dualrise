-- Drop existing constraint and recreate with Collegiate added
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_category_check;
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS check_category_values;

ALTER TABLE tournaments ADD CONSTRAINT check_category_values 
  CHECK (category IN ('National', 'International', 'National Team', 'Club Competition', 'PRO', 'Collegiate'));