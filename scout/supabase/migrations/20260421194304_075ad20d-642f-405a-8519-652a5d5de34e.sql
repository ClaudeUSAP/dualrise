-- Stage 2a: Server-side RPCs for TournamentManagement page
-- Five SECURITY DEFINER functions. All gated by admin/agent role check.

-- =============================================================================
-- 1. admin_tournament_stats
-- Returns ALL dashboard counts in a single jsonb payload. One roundtrip vs 6+
-- separate count(*) queries. Atomic snapshot so cards stay internally consistent.
-- Status semantics: trusts DB tournaments.status (no date-math fallback).
-- total_athletes: distinct athletes across all tournament_results (unique people),
-- NOT sum-of-per-tournament-distinct (which would count participations).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_tournament_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total int;
  v_planned int;
  v_in_progress int;
  v_completed int;
  v_archived int;
  v_cancelled int;
  v_needs_results int;
  v_distinct_countries int;
  v_avg_field_size numeric;
  v_total_athletes int;
  v_top_venues jsonb;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Access denied. Admin or agent role required.' USING ERRCODE = '42501';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'planned'),
    COUNT(*) FILTER (WHERE status = 'in_progress'),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'archived'),
    COUNT(*) FILTER (WHERE status = 'cancelled'),
    COUNT(DISTINCT country) FILTER (WHERE country IS NOT NULL AND country <> '')
  INTO v_total, v_planned, v_in_progress, v_completed, v_archived, v_cancelled, v_distinct_countries
  FROM public.tournaments;

  -- needs_results: tournaments with zero result rows
  SELECT COUNT(*)
  INTO v_needs_results
  FROM public.tournaments t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tournament_results r WHERE r.tournament_id = t.id
  );

  -- avg field size (per-tournament distinct athletes, then averaged)
  WITH per_t AS (
    SELECT tournament_id, COUNT(DISTINCT athlete_id) AS c
    FROM public.tournament_results
    WHERE tournament_id IS NOT NULL AND athlete_id IS NOT NULL
    GROUP BY tournament_id
  )
  SELECT ROUND(AVG(c), 1)
  INTO v_avg_field_size
  FROM per_t;

  -- total distinct athletes across all tournaments (unique athletes ever)
  SELECT COUNT(DISTINCT athlete_id)::int
  INTO v_total_athletes
  FROM public.tournament_results
  WHERE athlete_id IS NOT NULL;

  -- top 3 venues by tournament count
  SELECT COALESCE(jsonb_agg(jsonb_build_object('venue', location, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_venues
  FROM (
    SELECT location, COUNT(*) AS cnt
    FROM public.tournaments
    WHERE location IS NOT NULL AND location <> ''
    GROUP BY location
    ORDER BY cnt DESC
    LIMIT 3
  ) tv;

  RETURN jsonb_build_object(
    'total', v_total,
    'planned', v_planned,
    'in_progress', v_in_progress,
    'completed', v_completed,
    'archived', v_archived,
    'cancelled', v_cancelled,
    'needs_results', v_needs_results,
    'distinct_countries', v_distinct_countries,
    'avg_field_size', COALESCE(v_avg_field_size, 0),
    'total_athletes', v_total_athletes,
    'completion_rate', CASE WHEN v_total > 0 THEN ROUND((v_completed::numeric / v_total) * 100, 1) ELSE 0 END,
    'top_venues', v_top_venues
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_tournament_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_tournament_stats() TO authenticated;

-- =============================================================================
-- 2. admin_tournament_distinct_countries
-- Powers the country filter dropdown. Cached client-side ~5min (~38 values).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_tournament_distinct_countries()
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_countries text[];
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Access denied. Admin or agent role required.' USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT country
    FROM public.tournaments
    WHERE country IS NOT NULL AND country <> ''
    ORDER BY country
  ) INTO v_countries;

  RETURN v_countries;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_tournament_distinct_countries() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_tournament_distinct_countries() TO authenticated;

-- =============================================================================
-- 3. admin_tournament_page_result_counts
-- Returns athlete + result counts for the visible page (max ~100 ids).
-- Avoids fetching the full tournament_results table per page render.
-- Perf note: uses unnest(p_ids) — efficient for arrays of <1000 elements.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_tournament_page_result_counts(p_ids uuid[])
RETURNS TABLE(tournament_id uuid, athlete_count int, result_count int)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Access denied. Admin or agent role required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id AS tournament_id,
    COUNT(DISTINCT r.athlete_id)::int AS athlete_count,
    COUNT(r.id)::int AS result_count
  FROM unnest(p_ids) AS t(id)
  LEFT JOIN public.tournament_results r ON r.tournament_id = t.id
  GROUP BY t.id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_tournament_page_result_counts(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_tournament_page_result_counts(uuid[]) TO authenticated;

-- =============================================================================
-- 4. admin_fetch_all_tournaments_for_dedup
-- Returns the FULL tournaments dataset (uncapped) so the existing JS
-- duplicate-detection algorithm in tournamentDeduplication.ts can run over
-- everything, not just the first 1000 rows PostgREST returns by default.
--
-- COLUMN PARITY (must match findDuplicateTournaments .select(...) exactly):
--   id, name, series_name, series_type, year, sex, country,
--   tournament_type, category, course_rating, course_slope,
--   course_par, yardage, location, start_date, end_date, created_at
--
-- Perf: ~1,090 rows × ~17 cols ≈ 200 KB payload. Acceptable for an admin page.
-- Algorithm semantics deliberately unchanged — only the dataset size differs.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_fetch_all_tournaments_for_dedup()
RETURNS TABLE(
  id uuid,
  name text,
  series_name text,
  series_type text,
  year text,
  sex text,
  country text,
  tournament_type text,
  category text,
  course_rating text,
  course_slope text,
  course_par text,
  yardage text,
  location text,
  start_date date,
  end_date date,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Access denied. Admin or agent role required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    t.id, t.name, t.series_name, t.series_type, t.year, t.sex, t.country,
    t.tournament_type, t.category, t.course_rating, t.course_slope,
    t.course_par, t.yardage, t.location, t.start_date, t.end_date, t.created_at
  FROM public.tournaments t;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_fetch_all_tournaments_for_dedup() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_fetch_all_tournaments_for_dedup() TO authenticated;

-- =============================================================================
-- 5. admin_fetch_all_result_tournament_ids
-- Returns every tournament_id from tournament_results (uncapped). Used by the
-- JS dedup algorithm to build its per-tournament result count map over the
-- full dataset. Tiny payload (~2,288 UUIDs ≈ 80 KB).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_fetch_all_result_tournament_ids()
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'agent'::app_role)) THEN
    RAISE EXCEPTION 'Access denied. Admin or agent role required.' USING ERRCODE = '42501';
  END IF;

  SELECT ARRAY(
    SELECT tournament_id
    FROM public.tournament_results
    WHERE tournament_id IS NOT NULL
  ) INTO v_ids;

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_fetch_all_result_tournament_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_fetch_all_result_tournament_ids() TO authenticated;