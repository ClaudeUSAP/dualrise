-- Add high_school_year column to athletes table
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS high_school_year TEXT DEFAULT 'Senior';