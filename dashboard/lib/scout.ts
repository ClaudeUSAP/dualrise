import { createClient } from '@supabase/supabase-js'

export function getScoutClient() {
  const url = process.env.SCOUT_URL
  const key = process.env.SCOUT_ANON_KEY
  if (!url || !key) throw new Error('SCOUT env not set (SCOUT_URL / SCOUT_ANON_KEY)')
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
