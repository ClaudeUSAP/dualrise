-- Create public.users (approval queue) + coach role at SIGNUP time (auth.users
-- INSERT), instead of only on first login. Previously coaches never appeared in
-- Coach Management and no admin email fired until they logged in.
--
-- The function is SECURITY DEFINER and fully wrapped in exception handling so a
-- failure can NEVER block an auth signup. Role creation + admin notification are
-- gated to coach signups only (admins/agents are created via create-admin-user
-- which sets raw_user_meta_data.role and manages public.users itself).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := coalesce(nullif(v_meta->>'role', ''), 'coach');
  v_is_coach boolean := (v_role = 'coach');
  v_university_id uuid;
  v_school_name text;
  v_first text := nullif(v_meta->>'first_name', '');
  v_last text := nullif(v_meta->>'last_name', '');
  v_full text := nullif(v_meta->>'full_name', '');
  v_phone text := nullif(v_meta->>'phone', '');
  v_position text := nullif(v_meta->>'position', '');
  v_recruiting text := nullif(v_meta->>'recruiting_needs', '');
  v_email_name text := split_part(coalesce(new.email, ''), '@', 1);
begin
  -- Parse university_id (absent for "new university" signups / invalid values).
  begin
    v_university_id := nullif(v_meta->>'university_id', '')::uuid;
  exception when others then
    v_university_id := null;
  end;

  -- Resolve school name: universities.name from the id, else the free-text
  -- new-university name from the signup metadata.
  if v_university_id is not null then
    select name into v_school_name from public.universities where id = v_university_id;
  end if;
  if v_school_name is null then
    v_school_name := nullif(v_meta->>'new_university_name', '');
  end if;

  -- Create the approval-queue row (idempotent).
  insert into public.users (
    id, email, first_name, last_name, full_name, phone, position,
    university_id, school_name, recruiting_needs, status
  )
  values (
    new.id,
    new.email,
    coalesce(v_first, v_email_name),
    coalesce(v_last, ''),
    coalesce(v_full, v_email_name),
    v_phone,
    v_position,
    v_university_id,
    v_school_name,
    v_recruiting,
    'pending'
  )
  on conflict (id) do nothing;

  -- Coach signups only: default role + admin notification.
  if v_is_coach then
    insert into public.user_roles (user_id, role)
    select new.id, 'coach'
    where not exists (
      select 1 from public.user_roles where user_id = new.id and role = 'coach'
    );

    -- Notify admins asynchronously (pg_net; never blocks the signup transaction).
    -- The edge function resolves all active admins and is idempotent per coachId.
    begin
      perform net.http_post(
        url := 'https://jwyyldkgvpylseqnctnm.supabase.co/functions/v1/notify-admins-new-coach',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXlsZGtndnB5bHNlcW5jdG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDM1NDUsImV4cCI6MjEwMDMxOTU0NX0.SOmxolc7qPN6cBvr4f79p4isVR1Ea7H_ULQwU4ChCLk"}'::jsonb,
        body := jsonb_build_object(
          'coachId', new.id,
          'firstName', coalesce(v_first, v_email_name),
          'lastName', coalesce(v_last, ''),
          'university', coalesce(v_school_name, ''),
          'email', new.email
        )
      );
    exception when others then
      raise warning 'handle_new_user: admin notify failed for %: %', new.id, sqlerrm;
    end;
  end if;

  return new;
exception when others then
  -- Never block auth signup, whatever happens.
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
