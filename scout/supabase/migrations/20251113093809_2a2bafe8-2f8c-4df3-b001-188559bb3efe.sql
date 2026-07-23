-- Add import_order column to tournament_results
ALTER TABLE tournament_results 
ADD COLUMN import_order INTEGER;

-- Backfill import_order based on created_at timestamp for each athlete
-- This preserves the original CSV import chronological order
WITH ranked_results AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY athlete_id 
      ORDER BY created_at ASC
    ) as order_num
  FROM tournament_results
)
UPDATE tournament_results tr
SET import_order = rr.order_num
FROM ranked_results rr
WHERE tr.id = rr.id;

-- Create index for better sorting performance
CREATE INDEX idx_tournament_results_import_order ON tournament_results(athlete_id, import_order DESC);