-- Safe cleanup: Remove Pauline's and Éline's data, then orphaned tournaments
BEGIN;

-- Delete athlete statistics cache for both athletes
DELETE FROM athlete_statistics 
WHERE athlete_id IN (
  'daacefad-f18a-44d7-bbc9-5207ed76f39d',  -- Pauline
  '6906affa-7fec-40b4-87e0-0aacd46b8a74'   -- Éline
);

-- Delete tournament results for both athletes
DELETE FROM tournament_results 
WHERE athlete_id IN (
  'daacefad-f18a-44d7-bbc9-5207ed76f39d',  -- Pauline
  '6906affa-7fec-40b4-87e0-0aacd46b8a74'   -- Éline
);

-- Delete tournaments that no longer have any results (orphaned only)
DELETE FROM tournaments t 
WHERE NOT EXISTS (
  SELECT 1 
  FROM tournament_results tr 
  WHERE tr.tournament_id = t.id
);

COMMIT;