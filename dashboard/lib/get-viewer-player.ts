import type { SupabaseClient } from '@supabase/supabase-js'

export type ViewerRole = 'player' | 'parent'

export type ViewerPlayerMember = {
  player_id: string
  role: ViewerRole
}

/**
 * Returns the membership row linking the current auth user to a player.
 * Works for both the player themselves and parents (via player_members table).
 * Returns null if the user is not a member of any player (e.g. agent or unknown).
 *
 * Assumes one membership per user for v1.
 */
export async function getViewerMember(
  supabase: SupabaseClient
): Promise<ViewerPlayerMember | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('player_members')
    .select('player_id, role')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return { player_id: data.player_id, role: data.role as ViewerRole }
}
