// Single source of truth for feature toggles. Set to false to disable a
// feature without ripping out the code — flipping back to true is enough to
// re-enable (plus restoring the matching cron entry in vercel.json when
// applicable).
export const CALL_BRIEFINGS_ENABLED = false

// Controls the read-only "Mon profil SCOUT" section on /profile. The section
// reads real data from the SEPARATE SCOUT Supabase project (server-only,
// service-role) gated to the viewer's own players.scout_athlete_id — see
// lib/scout-profile.ts. Flip to true ONLY once SCOUT_SUPABASE_URL and
// SCOUT_SUPABASE_SERVICE_KEY are set on Vercel; otherwise getScoutProfile()
// returns null and players just see "profil en préparation".
export const SCOUT_PROFILE_ENABLED = true
