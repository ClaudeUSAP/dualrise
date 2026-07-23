'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function ensureAgentForPlayer(playerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) throw new Error('not an agent')
  const role = (agent as { role?: string }).role
  if (role !== 'founder') {
    const { data: player } = await supabase
      .from('players')
      .select('agent_id')
      .eq('id', playerId)
      .single()
    if (!player || player.agent_id !== (agent as { id: string }).id) {
      throw new Error('not allowed')
    }
  }
  return { supabase, agent }
}

export async function toggleFollowupItem(
  playerId: string,
  itemId: string,
  checked: boolean
) {
  const { supabase } = await ensureAgentForPlayer(playerId)
  const { error } = await supabase
    .from('agent_followup_checklist')
    .update({
      checked,
      checked_at: checked ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('player_id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function updateFollowupItemUrl(
  playerId: string,
  itemId: string,
  url: string | null
) {
  const cleaned = url?.trim() || null
  const { supabase } = await ensureAgentForPlayer(playerId)
  const { error } = await supabase
    .from('agent_followup_checklist')
    .update({ url_link: cleaned, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('player_id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function addCustomFollowupItem(
  playerId: string,
  label: string
) {
  const trimmed = label.trim()
  if (!trimmed) throw new Error('label required')
  const { supabase } = await ensureAgentForPlayer(playerId)

  const { data: maxRow } = await supabase
    .from('agent_followup_checklist')
    .select('position')
    .eq('player_id', playerId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPosition = ((maxRow?.position as number | null) ?? 0) + 1

  const { error } = await supabase.from('agent_followup_checklist').insert({
    player_id: playerId,
    item_key: randomUUID(),
    item_label: trimmed,
    is_default: false,
    position: nextPosition,
  })
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function updateCustomFollowupLabel(
  playerId: string,
  itemId: string,
  label: string
) {
  const trimmed = label.trim()
  if (!trimmed) throw new Error('label required')
  const { supabase } = await ensureAgentForPlayer(playerId)
  const { error } = await supabase
    .from('agent_followup_checklist')
    .update({ item_label: trimmed, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .eq('player_id', playerId)
    .eq('is_default', false)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function deleteCustomFollowupItem(
  playerId: string,
  itemId: string
) {
  const { supabase } = await ensureAgentForPlayer(playerId)
  const { error } = await supabase
    .from('agent_followup_checklist')
    .delete()
    .eq('id', itemId)
    .eq('player_id', playerId)
    .eq('is_default', false)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}
