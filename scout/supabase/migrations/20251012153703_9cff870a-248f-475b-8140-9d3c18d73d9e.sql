-- Clear corrupted position_text entries that contain timestamps from Excel date conversion
-- This only affects corrupted timestamp strings, preserving all other data
UPDATE tournament_results
SET position_text = NULL
WHERE position_text LIKE '%GMT%' 
   OR position_text LIKE '%:00:00%'
   OR (LENGTH(position_text) > 50 AND position_text NOT LIKE 'http%');