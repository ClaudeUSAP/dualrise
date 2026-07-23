-- Replace plain NJCAA with NJCAA 1
UPDATE athletes 
SET preferences_division = REPLACE(preferences_division, 'NJCAA', 'NJCAA 1')
WHERE preferences_division LIKE '%NJCAA%' 
  AND preferences_division NOT LIKE '%NJCAA 1%'
  AND preferences_division NOT LIKE '%NJCAA 2%'
  AND preferences_division NOT LIKE '%NJCAA1%'
  AND preferences_division NOT LIKE '%NJCAA2%';

-- Normalize NJCAA1 to NJCAA 1 and NJCAA2 to NJCAA 2
UPDATE athletes 
SET preferences_division = REPLACE(REPLACE(preferences_division, 'NJCAA1', 'NJCAA 1'), 'NJCAA2', 'NJCAA 2')
WHERE preferences_division LIKE '%NJCAA1%' OR preferences_division LIKE '%NJCAA2%';

-- Also update transfer_from_division if any exist
UPDATE athletes 
SET transfer_from_division = 'NJCAA 1'
WHERE transfer_from_division = 'NJCAA';

UPDATE athletes 
SET transfer_from_division = CASE 
  WHEN transfer_from_division = 'NJCAA1' THEN 'NJCAA 1'
  WHEN transfer_from_division = 'NJCAA2' THEN 'NJCAA 2'
  ELSE transfer_from_division 
END
WHERE transfer_from_division IN ('NJCAA1', 'NJCAA2');