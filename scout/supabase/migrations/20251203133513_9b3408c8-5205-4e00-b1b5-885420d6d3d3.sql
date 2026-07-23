-- Delete all tournament results first (foreign key dependency)
DELETE FROM tournament_results;

-- Delete all tournaments
DELETE FROM tournaments;