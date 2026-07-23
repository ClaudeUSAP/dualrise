-- Favorite-result alerts: state table + daily cron.
-- The edge function `run-favorite-result-alerts` emails each coach the new
-- tournament results of their favorited AVAILABLE athletes, idempotently via a
-- last_run watermark.

create table if not exists public.alert_job_state (
  job_name text primary key,
  last_run timestamptz
);

-- Only the service-role edge function touches this table (service_role bypasses
-- RLS). RLS is also auto-enabled by the rls_auto_enable event trigger.
alter table public.alert_job_state enable row level security;

-- Seed the watermark to now() so the first run does not blast 24h of backlog.
insert into public.alert_job_state (job_name, last_run)
values ('favorite_result_alerts', now())
on conflict (job_name) do nothing;

-- Daily 08:00 → invoke the edge function (anon JWT, same pattern as the
-- existing search-alert cron jobs). cron.schedule replaces any same-named job.
select cron.schedule(
  'run-favorite-result-alerts-daily',
  '0 8 * * *',
  $$
  select net.http_post(
    url := 'https://jwyyldkgvpylseqnctnm.supabase.co/functions/v1/run-favorite-result-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXlsZGtndnB5bHNlcW5jdG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM1NDUsImV4cCI6MjEwMDMxOTU0NX0.SOmxolc7qPN6cBvr4f79p4isVR1Ea7H_ULQwU4ChCLk"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
