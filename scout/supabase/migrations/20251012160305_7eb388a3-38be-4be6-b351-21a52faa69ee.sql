-- Add default scoring period configuration columns to athletes table
ALTER TABLE athletes
ADD COLUMN default_scoring_period_type TEXT DEFAULT 'last_n',
ADD COLUMN default_scoring_period_value TEXT DEFAULT '5',
ADD COLUMN scoring_average_override BOOLEAN DEFAULT FALSE,
ADD COLUMN scoring_avg_vs_cr_override BOOLEAN DEFAULT FALSE;

-- Add comment to explain the columns
COMMENT ON COLUMN athletes.default_scoring_period_type IS 'Type of scoring period: last_n or year';
COMMENT ON COLUMN athletes.default_scoring_period_value IS 'Value for the period: 3, 5, 7, 10 for last_n; year number for year type';
COMMENT ON COLUMN athletes.scoring_average_override IS 'TRUE if admin has manually overridden the scoring_average field';
COMMENT ON COLUMN athletes.scoring_avg_vs_cr_override IS 'TRUE if admin has manually overridden the scoring_average_vs_course_rating field';