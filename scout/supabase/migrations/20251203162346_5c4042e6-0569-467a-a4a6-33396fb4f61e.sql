-- Add raw data storage columns to tournaments table
ALTER TABLE tournaments 
  ADD COLUMN IF NOT EXISTS raw_series_name TEXT,
  ADD COLUMN IF NOT EXISTS raw_date_string TEXT;