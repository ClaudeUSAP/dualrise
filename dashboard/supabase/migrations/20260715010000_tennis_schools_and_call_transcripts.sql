-- =====================================================================
-- Dual Rise — DASHBOARD DB: tennis schools + coach-call transcript intel
-- =====================================================================
-- IMPORTANT: the dashboard's base schema is NOT in the repo — it lives in the
-- Supabase project. To stand up dualrise-dashboard, first clone the base schema
-- from the source project (schema-only dump) THEN run this migration:
--   pg_dump --schema-only --schema=public <source-dashboard> > base.sql
--   psql <dualrise-dashboard> -f base.sql
--   psql <dualrise-dashboard> -f 20260715010000_tennis_schools_and_call_transcripts.sql
--
-- What this adds:
--   1. Tennis facility fields on schools (golf columns kept dormant).
--   2. Lifestyle/location "sections" to feed from coach calls
--      (weather_rating & nearby_city already exist — we add the rest).
--   3. A school_call_transcripts table + an AI-extraction target (extracted jsonb).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1 + 2. schools — tennis facilities + lifestyle sections
-- ---------------------------------------------------------------------
ALTER TABLE public.schools
  -- tennis facilities (golf: distance_to_golf_minutes / practice_courses kept, unused)
  ADD COLUMN IF NOT EXISTS distance_to_courts_minutes integer,
  ADD COLUMN IF NOT EXISTS indoor_courts              integer,
  ADD COLUMN IF NOT EXISTS outdoor_courts             integer,
  ADD COLUMN IF NOT EXISTS court_surfaces             text,     -- e.g. 'Hard, Clay'
  -- location / lifestyle sections (weather_rating + nearby_city already exist)
  ADD COLUMN IF NOT EXISTS major_city                     text,
  ADD COLUMN IF NOT EXISTS distance_to_major_city_minutes integer,
  ADD COLUMN IF NOT EXISTS campus_setting                 text,     -- urban / suburban / rural
  ADD COLUMN IF NOT EXISTS social_life_rating             smallint, -- 0-10
  ADD COLUMN IF NOT EXISTS academics_rating               smallint, -- 0-10
  ADD COLUMN IF NOT EXISTS safety_rating                  smallint, -- 0-10
  ADD COLUMN IF NOT EXISTS cost_of_living_rating          smallint, -- 0-10
  ADD COLUMN IF NOT EXISTS team_competitiveness           text,     -- from coach calls
  ADD COLUMN IF NOT EXISTS scholarship_notes              text,
  -- rolling AI summary of everything learned on coach calls
  ADD COLUMN IF NOT EXISTS coach_call_summary             text,
  ADD COLUMN IF NOT EXISTS coach_call_summary_updated_at  timestamptz;

DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY['social_life_rating','academics_rating','safety_rating','cost_of_living_rating'] LOOP
    EXECUTE format(
      'ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS chk_%1$s;
       ALTER TABLE public.schools ADD CONSTRAINT chk_%1$s CHECK (%1$s IS NULL OR (%1$s BETWEEN 0 AND 10));', c);
  END LOOP;
END $$;

ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS chk_campus_setting;
ALTER TABLE public.schools ADD CONSTRAINT chk_campus_setting
  CHECK (campus_setting IS NULL OR campus_setting IN ('urban','suburban','rural'));

-- ---------------------------------------------------------------------
-- 3. school_call_transcripts — raw transcripts + AI-extracted fields
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_call_transcripts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.school_assignments(id) ON DELETE SET NULL,
  player_id     uuid,                       -- optional context (which player the call was about)
  coach_name    text,
  call_date     date,
  source        text,                        -- 'zoom' | 'phone' | 'meet' | 'manual'
  language      text,
  transcript    text NOT NULL,               -- raw transcript text
  audio_url     text,                         -- optional recording
  created_by    uuid,
  created_at    timestamptz DEFAULT now(),
  -- AI pipeline
  processed     boolean DEFAULT false,
  processed_at  timestamptz,
  extracted     jsonb,                        -- structured fields the model pulled out
  model_notes   text
);

CREATE INDEX IF NOT EXISTS idx_school_call_transcripts_school ON public.school_call_transcripts(school_id);
CREATE INDEX IF NOT EXISTS idx_school_call_transcripts_unprocessed ON public.school_call_transcripts(processed) WHERE processed = false;

-- RLS: deny-by-default. TODO: mirror the policies on public.school_call_notes
-- (staff/agents read-write, gated appropriately). Left restrictive on purpose.
ALTER TABLE public.school_call_transcripts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.school_call_transcripts IS
  'Raw coach-call transcripts. A server action / edge function extracts structured intel (weather, proximity, campus, competitiveness, scholarships, coach mentality) into extracted jsonb, then upserts the relevant schools columns and appends a school_call_notes summary.';

COMMIT;
