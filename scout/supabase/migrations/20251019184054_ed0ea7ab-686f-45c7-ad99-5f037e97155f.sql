-- Clear all tournament data for clean slate testing
-- This allows testing the new canonical name generation from scratch

-- Step 1: Delete all tournament results (child records first)
DELETE FROM tournament_results;

-- Step 2: Delete all tournaments (parent records)
DELETE FROM tournaments;