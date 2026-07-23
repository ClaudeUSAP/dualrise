-- Clear all tournament data for fresh import

-- Delete all tournament results first (due to foreign key constraints)
DELETE FROM tournament_results;

-- Delete all tournaments
DELETE FROM tournaments;