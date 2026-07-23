'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'

// The players RLS UPDATE policy only allows founders + the owning agent —
// a player/parent cannot update their own row, so a normal client write of
// onboarding_completed silently affects 0 rows. The viewer is verified via
// getViewerMember (player_members), then the write goes through the service
// role, which is safe because we only ever target the resolved player_id.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

async function getCurrentPlayerId() {
  const supabase = await createClient()
  const member = await getViewerMember(supabase)
  if (!member) throw new Error('player not found')
  return { playerId: member.player_id }
}

export async function completeOnboarding() {
  const { playerId } = await getCurrentPlayerId()
  const { error } = await getServiceClient()
    .from('players')
    .update({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath('/schools')
}

export async function resetOnboarding() {
  const { playerId } = await getCurrentPlayerId()
  const { error } = await getServiceClient()
    .from('players')
    .update({
      onboarding_completed: false,
      onboarding_completed_at: null,
    })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath('/schools')
  revalidatePath('/profile')
}
