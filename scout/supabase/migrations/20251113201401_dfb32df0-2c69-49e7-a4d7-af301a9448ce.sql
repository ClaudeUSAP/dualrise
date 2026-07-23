-- Modify search_run_history to store athlete signatures instead of simple IDs
ALTER TABLE search_run_history 
  ALTER COLUMN athlete_ids TYPE jsonb USING athlete_ids::jsonb;

-- Add columns to track different types of matches
ALTER TABLE search_run_history 
  ADD COLUMN IF NOT EXISTS new_athletes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS improved_athletes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS removed_athletes_count integer DEFAULT 0;

-- Rename athlete_ids to athlete_signatures for clarity
ALTER TABLE search_run_history 
  RENAME COLUMN athlete_ids TO athlete_signatures;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_search_run_history_saved_search_id_run_at 
  ON search_run_history(saved_search_id, run_at DESC);