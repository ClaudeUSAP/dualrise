-- Remove the redundant raw_series_name column since series_name already stores the raw CSV value
ALTER TABLE tournaments DROP COLUMN IF EXISTS raw_series_name;