-- First delete tournament_results (child records due to foreign key)
DELETE FROM tournament_results;

-- Then delete tournaments (parent records)
DELETE FROM tournaments;