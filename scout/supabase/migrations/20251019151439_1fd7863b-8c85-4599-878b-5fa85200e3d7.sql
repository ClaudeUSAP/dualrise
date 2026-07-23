-- Step 1: Merge Grand Prix de Campagne duplicates (keep English version with more results)
UPDATE tournament_results 
SET tournament_id = (
  SELECT id FROM tournaments 
  WHERE name = '40th Grand Prix Campaign Tito Lassalle Trophy' 
  AND year = '2025' LIMIT 1
)
WHERE tournament_id = (
  SELECT id FROM tournaments 
  WHERE name = 'GRAND PRIX DE CAMPAGNE TROPHEE TITO LASSALLE' 
  AND year = '2025' LIMIT 1
);

-- Step 2: Merge WAGR duplicates (keep cleaner English version)
UPDATE tournament_results 
SET tournament_id = (
  SELECT id FROM tournaments 
  WHERE series_name = 'WAGR U18 Championship' 
  AND year = '2025' LIMIT 1
)
WHERE tournament_id = (
  SELECT id FROM tournaments 
  WHERE series_name = 'Championnat WAGR U18' 
  AND year = '2025' LIMIT 1
);

-- Step 3: Delete merged duplicate tournaments
DELETE FROM tournaments 
WHERE id IN (
  SELECT id FROM tournaments 
  WHERE name = 'GRAND PRIX DE CAMPAGNE TROPHEE TITO LASSALLE' AND year = '2025'
  UNION
  SELECT id FROM tournaments 
  WHERE series_name = 'Championnat WAGR U18' AND year = '2025'
);

-- Step 4: Delete all test tournament results for Éline and Pauline
DELETE FROM tournament_results 
WHERE athlete_id IN ('6906affa-7fec-40b4-87e0-0aacd46b8a74', 'daacefad-f18a-44d7-bbc9-5207ed76f39d');

-- Step 5: Delete all orphaned tournaments (no results)
DELETE FROM tournaments 
WHERE id NOT IN (SELECT DISTINCT tournament_id FROM tournament_results WHERE tournament_id IS NOT NULL);