# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**USAP Scout** — a golf recruiting platform connecting French (and international) amateur golfers with U.S. college coaches. Coaches search/filter athlete profiles, favorite them, and request contact info; admins/agents manage athletes, coaches, tournaments, and tournament results. Originally scaffolded with Lovable, but the platform's tooling (`lovable-tagger`) and branding have since been removed; the app is hosted on Cloudflare and deploys on push to `main`.

## Commands

```sh
npm run dev        # Vite dev server on http://localhost:8080
npm run build      # production build
npm run build:dev  # development-mode build
npm run lint       # ESLint
npm run preview    # preview the production build
```

There is **no test runner** configured. `USER_JOURNEY_TESTS.md` and `TEST_ACCOUNTS.md` are manual QA docs, not automated tests. The package manager is bun (`bun.lockb` present) but npm works fine; `package-lock.json` is also committed.

Supabase Edge Functions live in `supabase/functions/` and are deployed via the Supabase platform, not from this build. Migrations are in `supabase/migrations/` (130+ files, timestamp-prefixed).

## Architecture

Single-page React app (Vite + React 18 + TypeScript), **all client-side** — there is no Node backend in this repo. The entire backend is **Supabase** (Postgres + Auth + Edge Functions + Storage), reached directly from the browser via `src/integrations/supabase/client.ts`. Security is enforced by **Postgres RLS policies**, not by app code — assume any data the client can request, it is allowed to see.

- **Routing & roles** — `src/App.tsx` defines every route. Three role groups gate the app via `src/components/ProtectedRoute.tsx`: `coach`, `admin`, `agent`. Public routes use `PublicLayout`; coach routes use `AuthenticatedLayout` (sidebar); admin/agent routes use `src/layouts/AdminLayout.tsx`. Coaches land on `/dashboard`, admins/agents on `/admin`.
- **Auth** — `src/context/AuthContext.tsx` is the single source of truth for the session. It wraps Supabase auth and, critically, **bootstraps users on first sign-in** (`ensureUserBootstrap`): inserts a row into `public.users` and a default `coach` role into `user_roles`. A user's effective role is the highest of possibly-multiple rows in `user_roles` (priority **admin > agent > coach**). Account `status` (`pending`/`active`/`suspended`/`rejected`) gates access independently of role. Magic-link sign-ins are auto-activated; password sign-ups start `pending` and await admin approval.
- **Data access layer** — `src/lib/api/*.ts` wraps all Supabase queries (athletes, tournaments, tournamentResults, adminUsers, etc.). Prefer adding/using functions here over calling `supabase` directly from components. Coaches read athletes through the **`athletes_safe`** view (contact info masked); `mapDbAthleteToAthlete(dbRow, maskContactInfo)` controls masking — coaches must use the contact-request flow to unlock email/phone.

> **⚠️ RGPD rule — never regress this.** Any **coach-facing read** of athletes MUST use `public.athletes_safe`, which NULLs `email`, `phone`, and the full `date_of_birth` at the database level for non-admins. **Writes** (`createAthlete`/`updateAthlete`/`deleteAthlete` in `athletes.ts`) and **admin/agent pages** (`src/pages/admin/*`, plus the admin CSV export `exportAthletes` in `csvExporter.ts`) keep reading the base **`athletes`** table because they legitimately need the full columns (`agent_id`, billing, `crm_status`, contact PII, …) that the view omits. Coaches must **never** be shown email / phone / full birth date — contact only flows through the contact-request mechanism, with USAP as sole intermediary. When adding a new athlete read, default to `athletes_safe` unless it is provably admin-only. The `maskContactInfo` flag in `mapDbAthleteToAthlete` is now belt-and-suspenders (the view already masks server-side).
- **State** — TanStack Query (`@tanstack/react-query`) for server state; React context for auth. No Redux/Zustand.
- **UI** — shadcn/ui components in `src/components/ui/` (Radix + Tailwind, configured in `components.json`). Import alias **`@/`** → `src/` (see `vite.config.ts` / `tsconfig`). Toasts come in two flavors: the shadcn `useToast`/`<Toaster>` and `sonner` — both are mounted.

## Domain model gotchas

The `Athlete` type (`src/types/athlete.ts`) and the DB schema have **intentional column-name mismatches** — read the inline comments before touching these:
- `currentSchool` ⟶ DB column `golf_club_team` (stores a country-club/golf-facility name, **not** an academic school).
- `hometown` ⟶ DB column `country`.
- `videoLink` (singular) ⟶ DB column `video_links` (plural, but holds one URL).

Golf scoring is the heart of the product and is **denormalized into many raw columns** on the athlete: `scoring_avg_vs_cr_last_{3,5,7,10}`, `..._current_year`, vs-par and all-time variants, plus a "best recent" period. The canonical performance metric is **scoring average vs. course rating (vs CR)**. Two layers compute it:
1. Cached values read straight off the `athletes`/`athletes_safe` row (fast path in `src/hooks/useAthleteMetrics.ts`).
2. On-demand recompute via the **`calculate-athlete-metrics`** edge function (period filters: `all`, `year`, `last_n`).

Free-text DB fields are messy and must be normalized through the dedicated `src/lib/*Normalizer.ts` helpers — `divisionNormalizer` (NCAA D1/D2/D3, NAIA, NJCAA 1/2 from legacy variants like `NCAA1`/`D1`), `genderNormalizer`, plus parsers in `src/lib/` for CSV imports, dates, rounds, and athlete/tournament name matching. Divisions, weather zones, majors, and graduation years are all **comma-separated strings** in single columns.

Star rating (0–7) is computed in code, not stored — see `calculateStarRating` in `src/lib/api/athletes.ts` (weights GPA, scoring average, WAGR/national ranking, SAT/TOEFL).

## Edge functions (`supabase/functions/`)

Server-side logic that can't run in the browser — metric calculation (`calculate-athlete-metrics`, `backfill-athlete-metrics`), all transactional email (`send-welcome-email`, `send-coach-approval-email`, `send-password-reset-email`, `send-athlete-info`, `retry-failed-emails`), admin user provisioning (`create-admin-user`, `set-user-password`), saved-search alerts (`run-saved-search-alerts`), and the status-expiry job (`expire-athlete-status`, which flips `new` athletes to `available`). `verify_jwt` per-function is set in `supabase/config.toml`.

## Conventions

- Supabase config lives in `.env` (`VITE_SUPABASE_*`); `src/integrations/supabase/client.ts` reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` via `import.meta.env`. The current project is the EU instance `bfxhruvkzidvznsyyryp` (also set as `project_id` in `supabase/config.toml`, and as the session-storage key ref in `src/lib/authStorage.ts`). The anon key is a publishable key, safe for the client; real protection is RLS. Note: `client.ts` carries a "do not edit — automatically generated" header — regenerating it from Supabase will overwrite the `import.meta.env` reads with hardcoded values.
- UI copy is **mixed English/French** (the user base is French) — match the surrounding language of the file you're editing rather than normalizing it.
- `src/integrations/supabase/types.ts` is generated from the DB schema — do not hand-edit; regenerate from Supabase after migrations.
- `src/data/mockAthletes.ts` powers the public `/demo` pages only; production data is always Supabase.
