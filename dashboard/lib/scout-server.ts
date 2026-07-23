import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client for the SEPARATE SCOUT project
 * (bfxhruvkzidvznsyyryp, eu-central-1).
 *
 * Uses the SCOUT **service-role** key, which bypasses RLS — so this MUST never
 * reach the browser. The `server-only` import makes any client-side import a
 * build error. Every SCOUT read goes through a server component / server action
 * and is gated to the viewer's own `scout_athlete_id` (see lib/scout-profile.ts).
 *
 * Returns null when the env vars are absent (e.g. not yet set on Vercel), so the
 * UI can degrade gracefully to "profil en préparation" instead of crashing.
 */
export function getScoutServerClient(): SupabaseClient | null {
  const url = process.env.SCOUT_SUPABASE_URL
  const key = process.env.SCOUT_SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
