-- PHASE 1: Data Cleanup
-- Delete all tournament results first (foreign key dependency)
DELETE FROM tournament_results;

-- Delete all tournaments
DELETE FROM tournaments;

-- PHASE 2: Database Migration
-- Remove old field
ALTER TABLE tournaments DROP COLUMN IF EXISTS category_france;

-- Add new fields
ALTER TABLE tournaments 
  ADD COLUMN series_name TEXT,
  ADD COLUMN category TEXT DEFAULT 'National';

-- Make existing nullable fields NOT NULL (safe because table is empty)
ALTER TABLE tournaments 
  ALTER COLUMN sex SET NOT NULL,
  ALTER COLUMN location SET NOT NULL,
  ALTER COLUMN country SET NOT NULL,
  ALTER COLUMN tournament_type SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN series_name SET NOT NULL;

-- Update tournament_type default
ALTER TABLE tournaments 
  ALTER COLUMN tournament_type SET DEFAULT 'Adult';

-- Add CHECK constraints for valid values
ALTER TABLE tournaments 
  ADD CONSTRAINT check_sex_values 
    CHECK (sex IN ('Men', 'Women'));

ALTER TABLE tournaments 
  ADD CONSTRAINT check_tournament_type_values 
    CHECK (tournament_type IN ('Junior', 'Adult'));

ALTER TABLE tournaments 
  ADD CONSTRAINT check_category_values 
    CHECK (category IN ('National', 'International', 'National Team'));

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_tournaments_name ON tournaments(name);
CREATE INDEX IF NOT EXISTS idx_tournaments_series_name ON tournaments(series_name);
CREATE INDEX IF NOT EXISTS idx_tournaments_canonical_lookup 
  ON tournaments(series_name, year, sex, tournament_type, category);