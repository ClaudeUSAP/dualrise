-- Convert graduation_year from integer to text to support multiple years
ALTER TABLE athletes 
ALTER COLUMN graduation_year TYPE text 
USING graduation_year::text;

COMMENT ON COLUMN athletes.graduation_year IS 'Comma-separated graduation years (e.g., "2026, 2027")';