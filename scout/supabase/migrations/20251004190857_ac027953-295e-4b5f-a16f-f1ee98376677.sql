-- Clean slate: Truncate all tournament data
TRUNCATE TABLE tournaments CASCADE;

-- Drop date columns from tournaments table
ALTER TABLE tournaments 
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date;

-- Make year column required with default
ALTER TABLE tournaments 
ALTER COLUMN year SET NOT NULL,
ALTER COLUMN year SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::text;