# Dual Rise — Player Dashboard Build Handoff

Companion to `HANDOFF.md` (which is Scout-centric). This file covers the **family / player / agent Dashboard** app (`dashboard/`). Read `HANDOFF.md` first for the shared context (branding, two-project architecture, Supabase env).

**Visual spec:** `docs/family-dashboard-mockup.html` (Checklist, My Schools, Profile, Calendar, Tasks, Notes, Resources — tennis-adapted, blue/red). Build the real screens to match it.

---

## What it is

- **Stack:** Next.js 16 (App Router) + next-intl (EN/FR) + Supabase SSR + Google Sheets (`googleapis`) + Resend / react-email. Deploys on **Vercel** (`vercel.json`, incl. cron entries).
- **Audience (role-based):**
  - **Player / family** — sees their own recruiting journey.
  - **Agent** — Dual Rise staff managing their players.
  - **Admin (CEO)** — oversight across all players (see admin section).
- **Relationship to Scout:** the Dashboard is the recruiting-CRM + family half; Scout is the coach + athletic-profile half. The player's **sporting profile is read live from the Scout project** via `players.scout_athlete_id` (see `lib/scout-server.ts`; needs the `dualrise-scout` keys). Do **not** duplicate athletic data here.

## App structure (`dashboard/app`)

- `(app)/` — the authenticated family/agent area. Sections: `schools` (My Schools), `calendar`, `checklist`, `tasks`, `notes`, `resources`, `profile`, plus `performances`, `compare`, `glossary`, `parcours`, `briefings` (interview prep), `WelcomeModal` (onboarding).
- `admin/` — staff/CEO area: `players`, `planning`, `briefings`, `pending-invitations`, `resources`.
- `(public)/`, `login`, `auth` — auth & public shells.
- `api/` — cron + server routes (weekly digest, parent digest, call briefings, invitations, unsubscribe).
- `messages/en.json` + `fr.json` — all UI copy (next-intl). **Nav labels:** My Schools · Calendar · Checklist · Tasks · Notes · Resources · Profile.

## Feature inventory — already built (cloned intact)

- **Onboarding:** `WelcomeModal`, `actions/onboarding.ts`, pending-invitation acceptance.
- **Checklist:** `checklist_templates` + `checklist_progress` + `checklist_player_overrides` — the recruiting to-do (translations, NCAA/NAIA, IEE, visa, embassy, documents…). Sport-agnostic; unchanged for tennis.
- **My Schools:** `schools` + `school_assignments` + `school_ratings` + `school_call_notes` — target schools per player, with ratings and call notes. (Tennis: relabel golf fields + the transcript pipeline — see `HANDOFF.md`.)
- **Calendar:** `calendar_events` + iCal feed (`ical_token`), Google Calendar sync card.
- **Tasks:** `player_tasks`; **Notes:** `player_notes` + `internal_notes`.
- **Profile:** identity + onboarding + the read-only "My Scout profile" section (from Scout).
- **Performances / Compare / Glossary / Parcours:** analytics, side-by-side school compare, term glossary, journey view.
- **Interview prep (`briefings`):** `player_interview_prep` + `call_briefings` + `agent_followup_checklist`.
- **Resources / Knowledge:** `resources` + `knowledge_articles`.
- **Digests & email:** weekly family digest, parent digest (+ opt-out), invitation emails — all via **Resend** + react-email (`components/emails/*`). Cron in `vercel.json`.
- **Admin (CEO):** `admin/players` (all players + their Scout profile), `admin/planning`, `admin/briefings`, `admin/pending-invitations`, `admin/resources`.

## Data model (dashboard project)

Key tables: `players`, `agents`, `player_members` (family access), `schools`, `school_assignments`, `school_ratings`, `school_call_notes`, `school_call_transcripts` *(added)*, `checklist_templates`, `checklist_progress`, `checklist_player_overrides`, `player_criteria`, `calendar_events`, `player_tasks`, `player_notes`, `internal_notes`, `player_crm_data`, `player_interview_prep`, `call_briefings`, `agent_followup_checklist`, `resources`, `knowledge_articles`, `notifications_sent`, `digest_log`, `pending_player_invitations`, `parent_digest_optouts`, `rating_sessions`(+items).

> **⚠️ The base schema is NOT in the repo** — it lives only in the Supabase project. To stand up `dualrise-dashboard`, dump the schema from the source project (schema-only, no data) and apply it, THEN run `dashboard/supabase/migrations/20260715010000_tennis_schools_and_call_transcripts.sql`. Commands are in `HANDOFF.md`.

## What's already done

- Branding flipped to Dual Rise blue/red (`app/globals.css` `--orange`→red; ~all hardcoded `#F6772A` swept in email templates, admin routes, login, US map, chart strokes).
- Logo wired: `public/dualrise-logo-white.svg` (4 usages) + `lib/site.ts` email logo → `dualrise-logo-red.svg`.
- `lib/site.ts` `APP_HOST` set to placeholder `dualrise.app`.
- Tennis schools + transcript migration added under `dashboard/supabase/migrations/`.

## Remaining work — Dashboard

1. **USAP → Dual Rise text sweep** across UI strings, `messages/en.json` + `fr.json`, `components/emails/*`, and `app/api/**` digest routes (subjects, sender identity, footer, `nicolas@usathleticperformance.com` → Dual Rise contact).
2. **Tennis sport-profile** on `/profile` + `/performances` + `admin/players/[id]`: the "My Scout profile" section currently renders golf scoring (`ScoutScoringCard`, `ScoutResultsList`). Point it at the tennis fields (UTR/WTN/rankings + match results) from the tennis `athletes_safe`. Flip `SCOUT_PROFILE_ENABLED` once the Scout keys are set.
3. **Notes tab = questionnaire:** allow paste of the tennis questionnaire (ties to `athletes.questionnaire_notes` / a player note).
4. **Schools tennis relabel:** golf course fields → tennis courts; surface; the new lifestyle fields (weather/proximity/etc.) in the schools UI + ratings.
5. **Coach-call transcript pipeline:** build the ingest (server action or `api/` route) → LLM extract → upsert school fields + `school_call_notes` summary (schema is ready).
6. **Domain:** set real `NEXT_PUBLIC_SITE_URL` (replace `dualrise.app`), verify Resend sending domain.
7. **Google Sheets:** provide `GOOGLE_SA_JSON_B` (base64 service account) if keeping per-player Sheets.

## Environment (Vercel / `.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   # dualrise-dashboard
NEXT_PUBLIC_SITE_URL, CRON_SECRET, DIGEST_UNSUB_SECRET
RESEND_API_KEY                       # + verified Dual Rise sending domain
GOOGLE_SA_JSON_B                     # base64 Google service-account JSON (per-player Sheets)
SCOUT_URL, SCOUT_ANON_KEY, SCOUT_SUPABASE_URL, SCOUT_SUPABASE_SERVICE_KEY   # dualrise-scout (read athletic profile)
```

## Runbook (dashboard)

1. Create `dualrise-dashboard` project → dump+load base schema from source (schema only) → run the tennis enrichment migration.
2. Set env (incl. the `dualrise-scout` keys). Bootstrap an agent/admin.
3. USAP→Dual Rise text sweep (UI + i18n + emails).
4. Wire the tennis Scout-profile section; enable `SCOUT_PROFILE_ENABLED`.
5. Build the transcript ingest pipeline.
6. `npm run dev`, verify, then deploy to Vercel (set the cron jobs).

## Definition of done

- Player logs in, sees their checklist, My Schools, calendar, tasks, notes, resources.
- The Profile page shows the player's **tennis** profile pulled from Scout (UTR/WTN/results), not golf.
- Notes tab holds the questionnaire.
- A school page shows weather/proximity/facilities; pasting a coach-call transcript fills those structured fields + logs a note.
- Weekly/parent digests send from a verified Dual Rise domain (EN + FR).
- Admin (CEO) can see all players and their profiles.
