-- Add Instagram handle and Swing coach fields to athletes table
ALTER TABLE athletes 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS swing_coach TEXT;

-- Standardize division naming from "NCAA D1/D2/D3" to "NCAA1/NCAA2/NCAA3"
UPDATE athletes 
SET preferences_division = REPLACE(preferences_division, 'NCAA D1', 'NCAA1')
WHERE preferences_division LIKE '%NCAA D1%';

UPDATE athletes 
SET preferences_division = REPLACE(preferences_division, 'NCAA D2', 'NCAA2')
WHERE preferences_division LIKE '%NCAA D2%';

UPDATE athletes 
SET preferences_division = REPLACE(preferences_division, 'NCAA D3', 'NCAA3')
WHERE preferences_division LIKE '%NCAA D3%';