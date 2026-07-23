# Dual Rise — Build Handoff (Scout + Dashboard, tennis)

This repo is a **tennis adaptation of the USAP Scout + Family Dashboard**, rebranded for the agency **Dual Rise** (colors: **blue #0B1D58 + red #E11D2A**). Two apps:

- `scout/` — Vite + React + shadcn/ui + TypeScript (Lovable project). Coach-facing recruiting platform. Own Supabase project. Backend = `scout/supabase/` (15 edge functions + migrations).
- `dashboard/` — Next.js 16 (App Router) + next-intl + Supabase SSR + Google Sheets + Resend. Player/family/agent dashboard. Own Supabase project.

> **How to use this with Claude Code:** open this repo, read this file first, then work the "Remaining work" checklist. **This file is the entry point** — it covers the shared context + **Scout** in depth. For the **Player Dashboard** app, also read **`DASHBOARD_HANDOFF.md`**. Visual specs (open in a browser) live in `docs/`: `scout-coach-mockup.html`, `matiej-reiter-mockup.html` (men), `sofia-bianchi-women-mockup.html` (women), `family-dashboard-mockup.html`.

---

## What is already done

**Branding (both apps)** — palette flipped from USAP navy/orange to Dual Rise **navy/red**:
- `scout/src/index.css` (CSS vars), `scout/tailwind.config.ts` (orange scale remapped to red).
- `dashboard/app/globals.css` (`--orange` → red).
- ~45 hardcoded `#F6772A` occurrences swept to `#E11D2A` across email templates, PDF export, login, charts, maps.
- Placeholder logo set: `*/public/dualrise-logo-white.svg`, `dualrise-logo-red.svg`, `favicon.svg` (wired in the dashboard + `lib/site.ts`). **Replace with the real Dual Rise logo later.**
- Scout brand text → "SCOUT by Dual Rise" (Navbar, sidebar, index.html title/meta).
- Scout legal pages (`PrivacyEn`, `PolitiqueConfidentialite`, `MentionsLegales`, `PrivacyPolicy`, `TermsOfService`) replaced with **placeholders** — need Dual Rise's real legal entity/GDPR content.

**Tennis data model (Scout)** — additive migration, ready to apply:
- `scout/supabase/migrations/20260715000000_tennis_adaptation.sql`
- `scout/supabase/seed_matiej_reiter.sql` (first player, full data + match results)

**Design specs (visual source of truth):**
- `docs/matiej-reiter-mockup.html` — the athlete profile: tabs **Personal · Tennis · Academics & Preferences · Tournaments · Media**.
- `docs/scout-coach-mockup.html` — the full coach experience: Dashboard, Athletes browse+filters, Favorites, Resources, My Account (Profile / Coaching info / Notifications / Security), Notifications center.
- `docs/DualRise_Plan_Clone_Tennis.md` — the overall plan.

---

## Feature inventory — already built (cloned intact, sport-agnostic)

These flows exist and work; the tennis effort is relabeling fields + rebranding, **not** rebuilding them.

**Coach-facing (Scout):**
- Account creation with admin approval: `Register` → `RegistrationSuccess` → `AccountPending`; emails `send-coach-registration-confirmation`, `notify-admins-new-coach`, `send-coach-approval-email`; `AccountSuspended` for suspensions.
- Auth + onboarding: `Login`, `Auth`, `CompleteProfile`.
- Password: full reset flow (`PasswordResetRequest` → `…EmailSent` → `…NewPassword` → `…Success`) + change password in `Settings` (Security).
- Navigation: `Dashboard`, `Athletes` (browse / filter / compare), `Favorites`, `SavedSearches` (+ email alerts), `MyContactRequests`, tournament search, `Resources`.
- Notifications: `NotificationCenter` / `Notifications` (backed by the `notifications` table + alert/digest jobs).
- Account settings: `Settings` (profile, coaching info, preferences, security).

**Admin panel (Scout) — the CEO of Dual Rise gets the same admin view you have in USAP.**
Role-gated by `user_roles.admin`; bootstrap the first admin via the `create-admin-user` edge function. Pages (`src/pages/admin/`):
- `AdminDashboard` (overview / KPIs)
- Coaches: `CoachManagement`, `AddNewCoach`, `CoachDetails` (approve / suspend / edit / activity)
- Athletes: `AthleteManagement`, `AddNewAthlete`, `AdminAthleteDetail`, `AdminAthleteView`
- Tournaments: `TournamentManagement`, `AddNewTournament`, `EditTournament`, `TournamentResults` / `TournamentResultsEntry`, `TournamentLeaderboard`, `BulkTournamentImport`, `TournamentDeduplication`
- `UniversityManagement`, `ContactRequestsManagement`, `AnalyticsReports`, `AdminUserManagement`, `SystemSettings`, `DataImportExport`

---

## Access model & data isolation (inherited from the source RLS — verify after migration)

Every table has RLS enabled; the policies ship with the migrations, so isolation is enforced in the database, not just the UI.

**Scout (coaches)** — roles admin / agent / coach:
- Coaches read athletes **only via the `athletes_safe` view**; raw `athletes` is admin/agent-only. The view **masks PII** (email, phone, full DOB hidden unless admin) — coaches see sporting + academic data, never contact details.
- A coach sees **only their own** favorites, saved searches, contact requests, notes, notifications (`coach_id / user_id = auth.uid()`). No coach sees another coach's data. Agents/admin manage athletes; admin sees all.

**Dashboard (players / families / agents)** — access via `current_player_ids()` + the `agents` table + `founder` (CEO) role:
- A player/family sees **only their own player's** checklist, `school_assignments`, `school_ratings`, `school_call_notes`, `player_criteria`, tasks, notes. **Player A cannot see Player B's anything** (`player_id IN current_player_ids()`).
- Agents see only their **assigned** players; the **CEO (`founder`) sees all**.
- **`internal_notes` are staff-only** — never visible to families.

**Cross-app:** Scout (coach-facing) can't reach the dashboard's private intel (ratings, call notes, internal notes) — separate project. The dashboard reads Scout **server-side only, gated to the viewer's own `scout_athlete_id`**.

**⚠️ Verify on the new Dual Rise projects (isolation only holds if RLS is applied):**
1. After migrations, confirm **RLS is ON for every table** and no table is exposed without a policy.
2. Run **Supabase Advisors → Security** and clear warnings. (The `athletes_safe` SECURITY DEFINER warning is *intentional* — it's what enables PII masking for coaches; keep it.)
3. Keep the **service-role key server-only**, never in the browser.
4. Optional: run the `seo-data-security` audit skill against both projects (it checks exactly "can one player see another's data?").

## Supabase connection & environment variables

You'll have **two projects** under the Dual Rise org: `dualrise-scout` and `dualrise-dashboard`. Get values from each project's dashboard — **Settings → API** (Project URL, `anon`/publishable key, `service_role` key), **Settings → General** (project ref) — and your account **Access Tokens** page (for the CLI).

**Scout app** — `scout/.env`:
```
VITE_SUPABASE_URL="https://<scout-ref>.supabase.co"
VITE_SUPABASE_PROJECT_ID="<scout-ref>"
VITE_SUPABASE_PUBLISHABLE_KEY="<scout anon / publishable key>"
```
Scout edge-function secrets (`supabase secrets set …`): `RESEND_API_KEY`, `CRON_SECRET`.
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are injected into functions automatically.)
Scout CLI: `supabase login` (personal access token) → `supabase link --project-ref <scout-ref>` → `supabase db push` → `supabase functions deploy`.

**Dashboard app** — env (Vercel or `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   # dualrise-dashboard project
NEXT_PUBLIC_SITE_URL          # the dashboard's public URL
CRON_SECRET, DIGEST_UNSUB_SECRET
RESEND_API_KEY                # + a verified Dual Rise sending domain in Resend
GOOGLE_SA_JSON_B              # base64 Google service-account JSON (per-player Sheets)
# The dashboard ALSO reads the SCOUT project (players link via scout_athlete_id):
SCOUT_URL, SCOUT_SUPABASE_URL, SCOUT_SUPABASE_SERVICE_KEY, SCOUT_ANON_KEY
```
**Cross-project note:** the dashboard talks to *both* Supabase projects — its own and Scout's — so put the Scout project's URL/keys in the dashboard env too. The apps are otherwise independent.

---

## Tennis field model (golf → tennis)

The migration **adds** these to `public.athletes` (golf columns are kept dormant, not dropped, so existing views/functions don't break):

`utr, wtn, national_ranking, national_ranking_country, itf_junior_ranking, utr_profile_link, wtn_profile_link, dominant_hand, backhand_type, preferred_surface, play_style, height_cm, weight_kg, city, club_team, phys_flexibility/strength/endurance, tech_serve/forehand/backhand/volley/smash/baseline/net, tac_decision_making/adaptability/mental_resilience/anticipation, weaknesses, objectives, best_results, recent_results, tennis_iq_comments, questionnaire_notes, high_school, eligibility_years`

Reused as-is: `strengths, areas_of_improvement, star_rating, academic_gpa, sat, duolingo, toefl, intended_majors, preferences_*, video_links, profile_photo, slug, status, agent_id, crm_status`.

Also: `tournaments` gains `surface, draw_size, grade`; `tournament_results` gains `round_reached, opponent_name, opponent_utr, match_score, match_result` (the "Latest results" table). All tennis fields are exposed to coaches via the `athletes_safe` view (recreated in the migration, still SECURITY DEFINER).

---

## Remaining work — SCOUT front-end (tennis wiring)

Files that reference golf fields and need tennis wiring (build + test each in `npm run dev`):

1. **Types** — `src/types/athlete.ts`; regenerate `src/integrations/supabase/types.ts` (`supabase gen types typescript`) after the migration is applied.
2. **Data layer** — `src/lib/api/athletes.ts`: select the new tennis columns from `athletes_safe`, map to the app model.
3. **Profile page** — `src/pages/AthleteDetail.tsx`: change tabs to **Personal / Tennis / Academics & Preferences / Tournaments / Media**; render tennis fields + the physical/technical/tactical bars; Tournaments tab = best results + match-results table; Media tab = full-match video. Use `docs/matiej-reiter-mockup.html` as the pixel spec.
4. **Browse** — `src/pages/Athletes.tsx`: filters → UTR range, WTN range, surface, play style, grad year, GPA, division, status; cards show UTR/WTN/style/★. Spec: `docs/scout-coach-mockup.html` (Athletes screen).
5. **Cards/modals** — `AthleteProfileModal.tsx`, `SearchResultsModal.tsx`, and the athlete summaries in `Dashboard.tsx`, `Favorites.tsx`, `Index.tsx`, `SavedSearches.tsx`.
6. **PDF one-pager** — `src/lib/athleteOnePagerPdf.ts`: rebuild for tennis (UTR/WTN/rankings, physical/technical/tactical, strengths/weaknesses, best/recent results). Currently 100% golf.
7. **Golf metrics → tennis** — `useAthleteMetrics.ts`, `AthleteMetricsTable.tsx`, `TournamentPerformanceTab.tsx`: replace golf scoring analytics with UTR history / match results.
8. **Admin forms** — `src/pages/admin/AddNewAthlete.tsx`, `AdminAthleteView.tsx`, `AdminAthleteDetail.tsx`, `DataImportExport.tsx`, `csvExporter.ts`, `csvParser.ts`: tennis fields in create/edit/import.
9. **Emails** — `supabase/functions/send-athlete-info/_templates/athlete-info.tsx` and other templates: golf → tennis copy + Dual Rise sender identity.
10. **Saved-search alerts** — `supabase/functions/run-saved-search-alerts`: search criteria keys reference golf; map to tennis filters.

## Remaining work — DASHBOARD (family)

- USAP → Dual Rise text sweep (app strings + `components/emails/*` + `app/api/**` digests).
- The sport-profile section pulls from Scout via `scout_athlete_id` — point it at the tennis fields; add the **Notes** tab (paste questionnaire).
- Real domain (placeholder `dualrise.app` in `lib/site.ts`).

---

## Phase 0 — Backend setup (exact runbook)

**Cost:** the org is free; both projects run on **Free ($0)** to build (500 MB DB each, auto-pause after ~7 days idle, no daily backups). Upgrade the org to **Pro at launch** — $25/mo (first project incl.) + $10/mo (second) = **~$35/mo for the two**.

**Status:** the Dual Rise org + both projects (`dualrise-scout`, `dualrise-dashboard`) are already created on Free.

**Prerequisites:** Supabase CLI (`npm i -g supabase`), `psql`, a Supabase access token (`supabase login`). For EACH project copy from **Settings → API**: Project URL, project ref, `anon`/publishable key, `service_role` key; from **Settings → Database**: the connection string (URI).

### A. Scout (`dualrise-scout`)
```bash
# 1. env — scout/.env
#   VITE_SUPABASE_URL="https://<scout-ref>.supabase.co"
#   VITE_SUPABASE_PROJECT_ID="<scout-ref>"
#   VITE_SUPABASE_PUBLISHABLE_KEY="<scout anon key>"

# 2. point the CLI config at the new project: edit scout/supabase/config.toml → project_id = "<scout-ref>"

# 3. link + push ALL migrations (136 base + the tennis migration, in order)
cd scout
supabase login
supabase link --project-ref <scout-ref>
supabase db push

# 4. seed the first player (db push does NOT run seeds)
psql "<scout-db-connection-uri>" -f supabase/seed_matiej_reiter.sql

# 5. edge functions + secrets
supabase functions deploy
supabase secrets set RESEND_API_KEY=<key> CRON_SECRET=<random-string>

# 6. regenerate TS types from the new DB (needed for Phase 1)
supabase gen types typescript --project-id <scout-ref> > src/integrations/supabase/types.ts
```
- **Bootstrap the first admin (CEO):** create the auth user (Supabase → Authentication → Add user), then grant admin — call the `create-admin-user` edge function, or `insert into public.user_roles (user_id, role) values ('<auth-uid>','admin');`.
- **Verify:** `select tablename, rowsecurity from pg_tables where schemaname='public';` → RLS true everywhere. Then **Advisors → Security** clean (the `athletes_safe` SECURITY DEFINER warning is expected — keep it).

### B. Dashboard (`dualrise-dashboard`)
The dashboard base schema is **not in the repo** — clone it schema-only from the source project, then run the enrichment migration.
```bash
# 1. dump SOURCE dashboard schema (schema only, NO data) and load into the new project
pg_dump --schema-only --schema=public "<SOURCE-dashboard-connection-uri>" > dashboard_base.sql
psql "<dualrise-dashboard-connection-uri>" -f dashboard_base.sql
psql "<dualrise-dashboard-connection-uri>" -f dashboard/supabase/migrations/20260715010000_tennis_schools_and_call_transcripts.sql
```
- Review the dump: helper functions (`current_player_ids()`), triggers and RLS policies live in `public`, so `--schema=public` captures them; if any **extension** is missing, `create extension` it first.
- **env** (`dashboard/.env.local` or Vercel):
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   # dualrise-dashboard
NEXT_PUBLIC_SITE_URL, CRON_SECRET, DIGEST_UNSUB_SECRET, RESEND_API_KEY, GOOGLE_SA_JSON_B
SCOUT_URL, SCOUT_ANON_KEY, SCOUT_SUPABASE_URL, SCOUT_SUPABASE_SERVICE_KEY            # dualrise-scout keys
```
- **Bootstrap:** insert Dual Rise staff into `public.agents` (`role='founder'` for the CEO/admin) linked to their `auth_user_id`.
- **Verify:** RLS on + Advisors clean; open `/profile` for a test player to confirm the Scout tennis profile loads.

### Deploy (Phase 4)
- Scout (Vite) → Cloudflare Pages or Vercel (`npm run build`, output `dist/`); set the `VITE_*` env vars.
- Dashboard (Next.js) → Vercel; set all env vars + the cron jobs in `vercel.json`; verify the Dual Rise sending domain in Resend.

## Open items needing your input
- Real Dual Rise **logo**, **domain(s)**, and **legal/company info**.
- Supabase org + both projects: **created (Free plan)** ✓ — supply their API keys per Phase 0.
- **Tennis college-program data import** (see below) — a separate data-sourcing workstream.

---

## Schools / college programs data

- **Scout `universities`** (926) — light table (name, division, state) for coach affiliation + `athletes.committed_university_id`. Currently **golf** schools.
- **Dashboard `schools`** (1,604) — the detailed recruiting DB: location (`city`, `nearby_city`, `lat`/`lng`), `weather_rating`, facilities (`indoor_facilities`, `dorms_quality`, `practice_courses`), coach contacts (`coach_name/email/bio/mentality`, `agent_opinion_coach`), tuition/budget, `ranking`, plus `school_call_notes`, `school_ratings` (flexible per-criterion) and per-player `player_criteria`. Currently **golf**-oriented.
- **Data gap:** the loaded programs are GOLF. Tennis is a different, larger set (~1,700+ NCAA men's + women's tennis programs across D1/D2/D3, plus NAIA + JUCO). The **structure carries over; the tennis-program list must be imported** as its own workstream (compile from NCAA/NAIA directories; set `governing_body`, `division`, `gender`, roster, courts).
- **golf→tennis relabels on schools:** `distance_to_golf_minutes` → new `distance_to_courts_minutes`; `practice_courses` → new `court_surfaces` / `indoor_courts` / `outdoor_courts`; ignore golf `scoreboard_*`.

### Canonical schools list — make Scout & Dashboard the SAME schools

The two projects can't literally share one table (separate Supabase projects; each app has FKs into its own copy). Instead:
- Import **one canonical tennis-program list** and seed **both** projects from it.
- Reconcile with a shared key: `schools.master_school_id` (already exists) ↔ `universities.master_school_id` (added by the Scout tennis migration). Same program → same id in both.
- Keep the **columns split on purpose (privacy):** Scout `universities` stays **light + public** (name, division, state, gender) because it's **coach-facing**; the **private recruiting intel** (`school_ratings`, `coach_mentality`, `agent_opinion_coach`, call notes, weather/fit) lives **only** in the Dashboard `schools` table so college coaches never see it.
- Keep them in sync via the shared import script / a periodic sync keyed on `master_school_id`.

## Coach-call transcript intelligence (new capability)

Migration: `dashboard/supabase/migrations/20260715010000_tennis_schools_and_call_transcripts.sql`.
Adds lifestyle/location "sections" on `schools` (`major_city`, `distance_to_major_city_minutes`, `campus_setting`, `social_life_rating`, `academics_rating`, `safety_rating`, `cost_of_living_rating`, `team_competitiveness`, `scholarship_notes`, `coach_call_summary`) — on top of the existing `weather_rating`/`nearby_city` — plus a `school_call_transcripts` table.
**Pipeline to build:** a server action / edge function that (1) stores the raw transcript, (2) sends it to an LLM to extract structured fields into `extracted jsonb`, (3) upserts those fields onto the school, and (4) appends a `school_call_notes` summary + refreshes `coach_call_summary`. Input = pasted transcript or an uploaded recording (transcribe first). This is how weather / proximity / competitiveness / scholarship intel gets filled from calls with college coaches.

## ⚠️ Dashboard base schema is NOT in the repo

Unlike Scout (which ships `supabase/migrations`), the **dashboard's DB schema lives only in the Supabase project**. To stand up `dualrise-dashboard`: dump the schema from the source project and apply it, THEN run the enrichment migration. Copy **schema only, not USAP data**:
```
pg_dump --schema-only --schema=public "<source-dashboard-conn>" > dashboard_base.sql
psql "<dualrise-dashboard-conn>" -f dashboard_base.sql
psql "<dualrise-dashboard-conn>" -f dashboard/supabase/migrations/20260715010000_tennis_schools_and_call_transcripts.sql
```

## Why two Supabase projects (dashboard needs Scout's keys)

Scout owns the athlete's *sporting* profile; the Dashboard *displays* it rather than duplicating it. Each dashboard player links via `players.scout_athlete_id` and reads live from the Scout project (server-only service-role, gated to the viewer's own id — `dashboard/lib/scout-server.ts`; feature-flagged, degrades to "profile in preparation" if unset). Two halves of one system → the dashboard env needs the **dualrise-scout** URL + keys (this is Dual Rise's own Scout, never USAP's).

## Runbook (ordered)

- **Phase 0 — backend:** create the Dual Rise Supabase org + 2 projects. Scout: `supabase link` → `db push` (all migrations; the tennis one runs last) → seed Matiej → deploy the 15 edge functions → set secrets (`RESEND_API_KEY`, `CRON_SECRET`) → verify a Resend domain → schedule crons. Dashboard: dump+load base schema → run the enrichment migration → set env (incl. the Scout keys). Bootstrap the first admin via `create-admin-user`.
- **Phase 1 — Scout front-end tennis wiring:** types → data layer → `AthleteDetail` tabs → `Athletes` filters/cards → modals/dashboard/favorites.
- **Phase 2 — Scout PDF one-pager + email templates:** golf → tennis, Dual Rise sender.
- **Phase 3 — Dashboard:** USAP→Dual Rise text, tennis sport-profile (from Scout) + Notes tab, transcript pipeline, real domain.
- **Phase 4 — deploy** (Scout → Cloudflare Pages/Lovable; Dashboard → Vercel) + verify.
- **Parallel data workstream:** import tennis college programs into `schools` / `universities`.

## Golf → tennis field mapping (athletes)

| Golf (kept dormant / ignore) | Tennis (new) |
|---|---|
| scoring_average*, scoring_avg_vs_par/cr* | utr, wtn |
| wagr_ranking, french_*_ranking | national_ranking (+ country), itf_junior_ranking |
| drive_distance_carry, seven_iron_distance_carry, max_club_head_speed | phys_/tech_/tac_ 0–10 ratings |
| trackman_report_link, golf_data_link | utr_profile_link, wtn_profile_link |
| golf_club_team | club_team |
| swing_coach, scoreboard_* (Clippd) | — (removed) |
| kept as-is: academic_gpa, duolingo, toefl, intended_majors, preferences_*, star_rating, video_links, profile_photo | reused |

Narrative: `strengths`/`areas_of_improvement` reused; add `weaknesses`, `objectives`, `best_results`, `recent_results`, `tennis_iq_comments`, `questionnaire_notes`, `high_school`, `eligibility_years`. Play profile: `dominant_hand`, `backhand_type`, `preferred_surface`, `play_style`, `height_cm`, `weight_kg`, `city`.

## Definition of done (verify each)

- Coach can register → confirmation email → admin approves → login works.
- Change-password + full reset flow work.
- Athlete profile shows the 5 tennis tabs with real data; filters (UTR/WTN/surface/style) work; browse cards show UTR/WTN/★.
- PDF one-pager renders tennis (no golf labels).
- Admin can create/edit a tennis athlete; import works.
- Emails send from a verified Dual Rise domain; notifications + saved-search alerts fire.
- Dashboard: player sees tennis profile pulled from Scout + Notes; schools show weather/proximity; a pasted coach-call transcript fills the school's structured fields.

## Paste-in first prompt for Claude Code

> Read `HANDOFF.md` in full first. This repo is a tennis rebrand of a golf recruiting platform (Scout + Dashboard) for the agency "Dual Rise" (blue/red). Branding, the tennis DB migration, and the mockups in `docs/` are already done. Start with **Phase 0** of the runbook: help me create the Dual Rise Supabase projects and apply the migrations. Then move to **Phase 1** (Scout front-end tennis wiring) using `docs/matiej-reiter-mockup.html` and `docs/scout-coach-mockup.html` as the visual spec. Ask me for the Supabase keys/secrets when you need them. Do one phase at a time and verify with `npm run dev` before moving on.
