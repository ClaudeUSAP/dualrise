-- Enable pg_cron and pg_net extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on cron schema to postgres
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the retry job to run every 5 minutes
SELECT cron.schedule(
  'retry-failed-emails-every-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://jwyyldkgvpylseqnctnm.supabase.co/functions/v1/retry-failed-emails',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXlsZGtndnB5bHNlcW5jdG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM1NDUsImV4cCI6MjEwMDMxOTU0NX0.SOmxolc7qPN6cBvr4f79p4isVR1Ea7H_ULQwU4ChCLk"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);