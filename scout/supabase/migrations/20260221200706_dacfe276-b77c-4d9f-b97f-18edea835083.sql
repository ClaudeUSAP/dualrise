
-- Fix corrupt notes-only tournament results (saved before notes-only fix was deployed)
UPDATE tournament_results
SET total_score = NULL, rounds = NULL
WHERE id = 'c2c67248-b255-4aa2-8e97-b14ea6ebbf6d';

UPDATE tournament_results
SET total_score = NULL, rounds = NULL
WHERE id = 'bf82b5ff-7d38-4c6a-8f5f-6125e24c03fb';

-- Refresh statistics cache for both athletes
SELECT update_athlete_statistics_cache('ce4d080f-19bf-4601-8f02-73c9e986ae34');
SELECT update_athlete_statistics_cache('dfe37490-5c2b-40ad-9ef8-f39b90473289');
