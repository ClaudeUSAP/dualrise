-- Add missing external link columns to athletes table
ALTER TABLE athletes
ADD COLUMN IF NOT EXISTS tournament_results_link TEXT,
ADD COLUMN IF NOT EXISTS trackman_report_link TEXT,
ADD COLUMN IF NOT EXISTS golf_data_link TEXT;