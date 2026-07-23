-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add athlete_ids column to search_run_history to store comparison data
ALTER TABLE search_run_history 
ADD COLUMN IF NOT EXISTS athlete_ids TEXT;

-- Schedule immediate alerts (every 15 minutes)
SELECT cron.schedule(
  'run-immediate-search-alerts',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jwyyldkgvpylseqnctnm.supabase.co/functions/v1/run-saved-search-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXlsZGtndnB5bHNlcW5jdG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM1NDUsImV4cCI6MjEwMDMxOTU0NX0.SOmxolc7qPN6cBvr4f79p4isVR1Ea7H_ULQwU4ChCLk"}'::jsonb,
    body := '{"frequency": "immediate"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule daily alerts (8 AM UTC every day)
SELECT cron.schedule(
  'run-daily-search-alerts',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jwyyldkgvpylseqnctnm.supabase.co/functions/v1/run-saved-search-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXlsZGtndnB5bHNlcW5jdG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM1NDUsImV4cCI6MjEwMDMxOTU0NX0.SOmxolc7qPN6cBvr4f79p4isVR1Ea7H_ULQwU4ChCLk"}'::jsonb,
    body := '{"frequency": "daily"}'::jsonb
  ) as request_id;
  $$
);

-- Schedule weekly alerts (8 AM UTC every Monday)
SELECT cron.schedule(
  'run-weekly-search-alerts',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://jwyyldkgvpylseqnctnm.supabase.co/functions/v1/run-saved-search-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXlsZGtndnB5bHNlcW5jdG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM1NDUsImV4cCI6MjEwMDMxOTU0NX0.SOmxolc7qPN6cBvr4f79p4isVR1Ea7H_ULQwU4ChCLk"}'::jsonb,
    body := '{"frequency": "weekly"}'::jsonb
  ) as request_id;
  $$
);