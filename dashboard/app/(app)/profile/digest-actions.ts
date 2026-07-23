'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function setWeeklyDigestOptin(optin: boolean) {
  const supabase = await createClient()
  // RLS on `players` has no player UPDATE policy, so a direct .update() affects
  // 0 rows. This SECURITY DEFINER RPC scopes the write to the caller's player(s).
  const { error } = await supabase.rpc('set_player_weekly_digest_optin', {
    p_optin: optin,
  })
  if (error) throw error
  revalidatePath('/profile')
}
