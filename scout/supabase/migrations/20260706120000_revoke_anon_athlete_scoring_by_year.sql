-- Security sweep 2026-07-06 (Nico's decision, brief §3bis): make
-- athlete_scoring_by_year login-only.
--
-- This SECURITY DEFINER function is only ever called by AUTHENTICATED users:
--   * the coach one-pager PDF flow on /athletes/:id renders AthleteDetail ONLY
--     when authenticated (AthleteProfileWrapper shows the OTP gate otherwise);
--   * PDFExportModal (bulk export) is admin/coach-only.
-- No public/anon page calls it, so revoking anon is safe.
--
-- EXECUTE was granted to PUBLIC (=X) AND to anon explicitly, so both are revoked.
-- The explicit authenticated + service_role grants are preserved.
--
-- NB: list_featured_athletes (brief §3bis) is intentionally NOT revoked here — it
-- IS called by the public home page (Index.tsx, under PublicLayout, anon), so
-- revoking anon would blank the featured section. Pending Nico's decision.
REVOKE EXECUTE ON FUNCTION public.athlete_scoring_by_year(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.athlete_scoring_by_year(uuid) FROM anon;
