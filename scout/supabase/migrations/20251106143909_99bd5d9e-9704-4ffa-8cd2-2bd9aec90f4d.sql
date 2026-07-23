-- Normalize all status values to lowercase for consistency
UPDATE athletes 
SET status = LOWER(status)
WHERE status IS NOT NULL;

-- Specifically handle 'Uncommitted' -> 'available'
UPDATE athletes
SET status = 'available'
WHERE LOWER(status) = 'uncommitted';