# Scout by USAP

A golf recruiting platform connecting French (and international) amateur golfers with U.S. college coaches. Coaches search and filter athlete profiles, favorite them, and request contact info; admins and agents manage athletes, coaches, tournaments, and tournament results.

Production: https://scout.usathleticperformance.com

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript, single-page app (all client-side)
- **UI:** shadcn/ui (Radix + Tailwind CSS)
- **Server state:** TanStack Query
- **Backend:** Supabase (Postgres + Auth + Edge Functions + Storage), with security enforced by Postgres RLS
- **Hosting:** Cloudflare (auto-deploys on push to `main`)

## Local development

Requires Node.js (the package manager is bun, but npm works fine).

```sh
npm install        # install dependencies
npm run dev        # Vite dev server on http://localhost:8080
npm run build      # production build
npm run build:dev  # development-mode build
npm run lint       # ESLint
npm run preview    # preview the production build
```

Supabase configuration lives in `.env` (`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`).

## Project layout

- `src/App.tsx` — routes and role-gated layouts (`coach`, `admin`, `agent`)
- `src/lib/api/*.ts` — Supabase data-access layer
- `src/integrations/supabase/` — Supabase client and generated types
- `supabase/functions/` — Edge Functions (metrics, transactional email, admin provisioning)
- `supabase/migrations/` — database migrations

See `CLAUDE.md` for architecture details and domain-model gotchas.
