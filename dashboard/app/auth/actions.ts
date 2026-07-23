'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

/**
 * Match the current authenticated user against the `agents` table by email.
 * If found and not yet linked, claim the row by setting `auth_user_id`.
 * Returns true when the user is (now) an agent.
 */
export async function linkAgentByEmail(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const linkedByAuth = await supabase
    .from('agents')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (linkedByAuth.data) return true

  const userEmail = user.email?.trim().toLowerCase()
  if (!userEmail) return false

  const admin = getAdminSupabase()
  const { data: agentRow } = await admin
    .from('agents')
    .select('id, auth_user_id')
    .ilike('email', userEmail)
    .maybeSingle()

  if (!agentRow) return false

  if (!agentRow.auth_user_id) {
    await admin
      .from('agents')
      .update({ auth_user_id: user.id })
      .eq('id', agentRow.id)
      .is('auth_user_id', null)
  }

  return true
}
