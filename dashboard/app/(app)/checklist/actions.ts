'use server'

import { revalidatePath } from 'next/cache'
import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'

export async function toggleChecklistItem(itemKey: string, checked: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')

  const member = await getViewerMember(supabase)
  if (!member) throw new Error('player not found')

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .eq('id', member.player_id)
    .single()
  if (playerError || !player) throw playerError ?? new Error('player not found')

  const fullName = `${player.first_name} ${player.last_name}`.trim()
  const authorRole = member.role

  const { error } = await supabase.from('checklist_progress').upsert(
    {
      player_id: player.id,
      item_key: itemKey,
      checked,
      checked_at: checked ? new Date().toISOString() : null,
      checked_by_user_id: checked ? user.id : null,
      checked_by_name: checked ? fullName : null,
      checked_by_role: checked ? authorRole : null,
    },
    { onConflict: 'player_id,item_key' }
  )
  if (error) throw error
  // Pas de revalidatePath — l'UI est optimistic côté client.
}
