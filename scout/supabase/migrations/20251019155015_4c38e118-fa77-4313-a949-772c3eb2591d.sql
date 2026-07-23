-- Create temp table to store Éline's tournament IDs before deleting results
CREATE TEMP TABLE eline_tournaments AS
SELECT DISTINCT tournament_id 
FROM tournament_results 
WHERE athlete_id = '6906affa-7fec-40b4-87e0-0aacd46b8a74';

-- Delete athlete statistics cache
DELETE FROM athlete_statistics 
WHERE athlete_id = 'daacefad-f18a-44d7-bbc9-5207ed76f39d';

DELETE FROM athlete_statistics 
WHERE athlete_id = '6906affa-7fec-40b4-87e0-0aacd46b8a74';

-- Delete tournament results
DELETE FROM tournament_results 
WHERE athlete_id = 'daacefad-f18a-44d7-bbc9-5207ed76f39d';

DELETE FROM tournament_results 
WHERE athlete_id = '6906affa-7fec-40b4-87e0-0aacd46b8a74';

-- Delete tournaments
DELETE FROM tournaments 
WHERE id IN (
  'da91fb42-204d-48ac-b974-817e52d5868b',
  '84fcdbdd-a067-46de-9a01-95b02aa401ae',
  '24a7b02d-497a-4d75-9a0c-85e4c9fdad42',
  '91177440-734f-4d70-bc8d-506c714e8b6d',
  'a02333d6-9609-4480-a872-a57bdcfcaea6',
  '0d11cb0a-0b95-4303-8c9c-6d5161a57faf',
  'bafb446c-7d9b-4545-99ff-8845b6a11f30',
  '257c39c6-7728-490a-9177-0183e226bd3e',
  '4cf7178b-967f-4d02-a67c-5ba33eb4134d'
);

DELETE FROM tournaments 
WHERE id IN (SELECT tournament_id FROM eline_tournaments);

-- Clean up temp table
DROP TABLE eline_tournaments;