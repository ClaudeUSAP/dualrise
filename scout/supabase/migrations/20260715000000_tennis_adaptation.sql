-- =====================================================================
-- Dual Rise — TENNIS ADAPTATION (Scout)
-- =====================================================================
-- Purpose: turn the golf athlete schema into a tennis schema.
-- Strategy: ADDITIVE ONLY. We add tennis columns and expose them through
-- the coach-facing athletes_safe view. We do NOT drop the golf columns here
-- because ~20 migrations, the athletes_safe view and the metric edge
-- functions still reference them; dropping now would break them. A separate,
-- clearly-marked cleanup migration removes the golf columns later, once the
-- tennis edge functions / views are in place (see bottom of this file).
--
-- Apply order for a fresh Dual Rise project:
--   1. Run all existing migrations (they build the full schema, RLS, funcs).
--   2. Run this migration.
--   3. (optional) seed_matiej_reiter.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. ATHLETES — tennis fields
-- ---------------------------------------------------------------------
ALTER TABLE public.athletes
  -- ratings & rankings
  ADD COLUMN IF NOT EXISTS utr                      numeric,
  ADD COLUMN IF NOT EXISTS wtn                      numeric,
  ADD COLUMN IF NOT EXISTS national_ranking         text,
  ADD COLUMN IF NOT EXISTS national_ranking_country text,
  ADD COLUMN IF NOT EXISTS itf_junior_ranking       text,
  ADD COLUMN IF NOT EXISTS utr_profile_link         text,
  ADD COLUMN IF NOT EXISTS wtn_profile_link         text,
  -- play profile
  ADD COLUMN IF NOT EXISTS dominant_hand            text,
  ADD COLUMN IF NOT EXISTS backhand_type            text,
  ADD COLUMN IF NOT EXISTS preferred_surface        text,
  ADD COLUMN IF NOT EXISTS play_style               text,
  ADD COLUMN IF NOT EXISTS height_cm                integer,
  ADD COLUMN IF NOT EXISTS weight_kg                integer,
  ADD COLUMN IF NOT EXISTS city                     text,
  ADD COLUMN IF NOT EXISTS club_team                text,   -- tennis club (parallels golf_club_team)
  -- physical attributes (0-10)
  ADD COLUMN IF NOT EXISTS phys_flexibility         smallint,
  ADD COLUMN IF NOT EXISTS phys_strength            smallint,
  ADD COLUMN IF NOT EXISTS phys_endurance           smallint,
  -- technical skills (0-10)
  ADD COLUMN IF NOT EXISTS tech_serve               smallint,
  ADD COLUMN IF NOT EXISTS tech_forehand            smallint,
  ADD COLUMN IF NOT EXISTS tech_backhand            smallint,
  ADD COLUMN IF NOT EXISTS tech_volley              smallint,
  ADD COLUMN IF NOT EXISTS tech_smash               smallint,
  ADD COLUMN IF NOT EXISTS tech_baseline            smallint,
  ADD COLUMN IF NOT EXISTS tech_net                 smallint,
  -- tactical skills (0-10)
  ADD COLUMN IF NOT EXISTS tac_decision_making      smallint,
  ADD COLUMN IF NOT EXISTS tac_adaptability         smallint,
  ADD COLUMN IF NOT EXISTS tac_mental_resilience    smallint,
  ADD COLUMN IF NOT EXISTS tac_anticipation         smallint,
  -- narrative (strengths & areas_of_improvement already exist and are reused)
  ADD COLUMN IF NOT EXISTS weaknesses               text,
  ADD COLUMN IF NOT EXISTS objectives               text,
  ADD COLUMN IF NOT EXISTS best_results             text,
  ADD COLUMN IF NOT EXISTS recent_results           text,
  ADD COLUMN IF NOT EXISTS tennis_iq_comments       text,
  ADD COLUMN IF NOT EXISTS questionnaire_notes      text,   -- paste of the tennis questionnaire
  -- academics
  ADD COLUMN IF NOT EXISTS high_school              text,
  ADD COLUMN IF NOT EXISTS eligibility_years        integer;

-- rating bounds (0-10)
DO $$
DECLARE c text;
BEGIN
  FOREACH c IN ARRAY ARRAY[
    'phys_flexibility','phys_strength','phys_endurance',
    'tech_serve','tech_forehand','tech_backhand','tech_volley','tech_smash','tech_baseline','tech_net',
    'tac_decision_making','tac_adaptability','tac_mental_resilience','tac_anticipation'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS chk_%1$s;
       ALTER TABLE public.athletes ADD CONSTRAINT chk_%1$s CHECK (%1$s IS NULL OR (%1$s >= 0 AND %1$s <= 10));', c);
  END LOOP;
END $$;

-- enum-style guards
ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS chk_dominant_hand;
ALTER TABLE public.athletes ADD CONSTRAINT chk_dominant_hand
  CHECK (dominant_hand IS NULL OR dominant_hand IN ('Left','Right'));
ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS chk_backhand_type;
ALTER TABLE public.athletes ADD CONSTRAINT chk_backhand_type
  CHECK (backhand_type IS NULL OR backhand_type IN ('One-handed','Two-handed'));
ALTER TABLE public.athletes DROP CONSTRAINT IF EXISTS chk_preferred_surface;
ALTER TABLE public.athletes ADD CONSTRAINT chk_preferred_surface
  CHECK (preferred_surface IS NULL OR preferred_surface IN ('Hard','Clay','Grass','Carpet'));

COMMENT ON COLUMN public.athletes.utr IS 'Universal Tennis Rating (e.g. 11.60)';
COMMENT ON COLUMN public.athletes.wtn IS 'World Tennis Number (e.g. 20.50)';
COMMENT ON COLUMN public.athletes.questionnaire_notes IS 'Paste of the player tennis questionnaire answers';

-- ---------------------------------------------------------------------
-- 2. TOURNAMENTS — tennis fields (golf course columns kept, unused)
-- ---------------------------------------------------------------------
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS surface   text,     -- Hard / Clay / Grass
  ADD COLUMN IF NOT EXISTS draw_size integer,
  ADD COLUMN IF NOT EXISTS grade     text;     -- ITF grade: J30/J60/J100, M15/M25, etc.

-- ---------------------------------------------------------------------
-- 3. TOURNAMENT_RESULTS — per-match detail (Tournament / Round / Opponent / score)
-- ---------------------------------------------------------------------
ALTER TABLE public.tournament_results
  ADD COLUMN IF NOT EXISTS round_reached text,     -- e.g. 'Final', 'Semifinal', 'Qualifying - final round'
  ADD COLUMN IF NOT EXISTS opponent_name text,
  ADD COLUMN IF NOT EXISTS opponent_utr  numeric,
  ADD COLUMN IF NOT EXISTS match_score   text,     -- e.g. '4-6, 6-3, 6-7(5)'
  ADD COLUMN IF NOT EXISTS match_result  text;      -- 'W' / 'L'
ALTER TABLE public.tournament_results DROP CONSTRAINT IF EXISTS chk_match_result;
ALTER TABLE public.tournament_results ADD CONSTRAINT chk_match_result
  CHECK (match_result IS NULL OR match_result IN ('W','L'));

-- Tennis has MULTIPLE match rows per (athlete, tournament) — one per round —
-- so the golf-era UNIQUE(athlete_id, tournament_id) must go.
ALTER TABLE public.tournament_results
  DROP CONSTRAINT IF EXISTS tournament_results_athlete_id_tournament_id_key;

-- ---------------------------------------------------------------------
-- 3b. UNIVERSITIES — reconcile with the dashboard `schools` list (shared key)
-- Scout keeps a LIGHT, coach-facing reference (name/division/state/gender).
-- The rich, PRIVATE recruiting intel (ratings, coach mentality, agent opinion,
-- call notes, weather/fit) lives ONLY in the dashboard `schools` table so it is
-- never exposed to college coaches. master_school_id maps the same tennis
-- program 1:1 across both Supabase projects (seed both from one canonical list).
-- ---------------------------------------------------------------------
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS master_school_id text,
  ADD COLUMN IF NOT EXISTS gender           text;   -- 'Men' / 'Women' / 'Both'
CREATE INDEX IF NOT EXISTS idx_universities_master_school ON public.universities(master_school_id);

-- ---------------------------------------------------------------------
-- 4. athletes_safe — expose tennis fields to coaches (non-PII only)
--    Existing column list preserved in order; tennis columns appended.
--    MUST stay SECURITY DEFINER (security_invoker = off).
-- ---------------------------------------------------------------------
-- DROP + CREATE (not CREATE OR REPLACE): the golf athletes_safe has trailing
-- columns (scoreboard_current_score, committed_university_id, committed_division)
-- that this tennis view omits, so an in-place replace is rejected by Postgres.
DROP VIEW IF EXISTS public.athletes_safe;
CREATE VIEW public.athletes_safe AS
 SELECT id, first_name, last_name, country, graduation_year, sex, golf_club_team,
    committed, committed_to, slug, status, status_expires_at, star_rating,
    scoring_average, scoring_average_vs_par, scoring_average_vs_course_rating,
    french_adult_ranking, french_ranking_in_their_class, wagr_ranking,
    drive_distance_carry, seven_iron_distance_carry, max_club_head_speed,
    strengths, areas_of_improvement, preferences_budget, preferences_division,
    preferences_region, importance_large_city, video_links, profile_photo,
    cover_photo, source_sync_id, other_interests, why_good_recruit,
    something_else_coaches_know, created_at, updated_at, student_type,
    high_school_year, featured, preferred_states, instagram_handle, swing_coach,
    tournament_results_link, trackman_report_link, golf_data_link,
    transfer_individual_ranking, transfer_from_school, transfer_from_division,
    intended_majors, scoring_average_override, scoring_avg_vs_cr_override,
    default_scoring_period_type, default_scoring_period_value,
    best_recent_scoring_avg, best_recent_period, best_recent_scoring_avg_raw,
    best_recent_period_raw, scoring_avg_last_3_raw, scoring_avg_last_5_raw,
    scoring_avg_last_7_raw, scoring_avg_last_10_raw, scoring_avg_current_year_raw,
    scoring_avg_all_time_raw, scoring_avg_vs_cr_last_3, scoring_avg_vs_cr_last_5,
    scoring_avg_vs_cr_last_7, scoring_avg_vs_cr_last_10,
    scoring_avg_vs_cr_current_year, scoring_avg_vs_cr_last_update,
    scoring_avg_last_7, scoring_avg_vs_par_last_3, scoring_avg_vs_par_last_5,
    scoring_avg_vs_par_last_7, scoring_avg_vs_par_last_10,
    scoring_avg_vs_par_current_year, scoring_avg_vs_par_all_time,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN email ELSE NULL::text END AS email,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN phone ELSE NULL::text END AS phone,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN date_of_birth
         ELSE "substring"(date_of_birth, '\d{4}'::text) END AS date_of_birth,
    academic_gpa, sat, duolingo, toefl, commit_date,
    french_adult_ranking_at_commit, french_ranking_1yr_before_college,
    scoreboard_current_rank, star_rating_at_commit,
    -- ===== Dual Rise tennis columns (appended) =====
    utr, wtn, national_ranking, national_ranking_country, itf_junior_ranking,
    utr_profile_link, wtn_profile_link,
    dominant_hand, backhand_type, preferred_surface, play_style,
    height_cm, weight_kg, city, club_team,
    phys_flexibility, phys_strength, phys_endurance,
    tech_serve, tech_forehand, tech_backhand, tech_volley, tech_smash, tech_baseline, tech_net,
    tac_decision_making, tac_adaptability, tac_mental_resilience, tac_anticipation,
    weaknesses, objectives, best_results, recent_results, tennis_iq_comments,
    high_school, eligibility_years
   FROM athletes;

ALTER VIEW public.athletes_safe SET (security_invoker = false);

-- Restore coach/service read grants (DROP+CREATE loses the grants that
-- CREATE OR REPLACE would have preserved).
GRANT SELECT ON public.athletes_safe TO authenticated, service_role;

COMMIT;

-- =====================================================================
-- OPTIONAL — run LATER, only after the tennis edge functions/metric jobs
-- are removed/replaced and nothing references the golf columns anymore.
-- Kept commented so it is never applied by accident.
-- =====================================================================
-- ALTER TABLE public.athletes
--   DROP COLUMN IF EXISTS scoring_average, DROP COLUMN IF EXISTS scoring_average_vs_par,
--   DROP COLUMN IF EXISTS scoring_average_vs_course_rating, DROP COLUMN IF EXISTS wagr_ranking,
--   DROP COLUMN IF EXISTS drive_distance_carry, DROP COLUMN IF EXISTS seven_iron_distance_carry,
--   DROP COLUMN IF EXISTS max_club_head_speed, DROP COLUMN IF EXISTS trackman_report_link,
--   DROP COLUMN IF EXISTS golf_data_link, DROP COLUMN IF EXISTS swing_coach
--   /* ...and the remaining scoring_avg_* / scoreboard_* / french_*_golf columns... */;
-- (athletes_safe would need to be recreated without those columns first.)
