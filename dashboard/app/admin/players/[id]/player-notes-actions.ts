'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function ensureAgent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role, first_name, last_name')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) throw new Error('not an agent')
  return { supabase, agent, user }
}

export async function addPlayerNote(playerId: string, body: string) {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('body required')
  const { supabase, agent, user } = await ensureAgent()
  const a = agent as { role?: string; first_name?: string; last_name?: string }
  const role = a.role === 'founder' ? 'founder' : 'agent'
  const authorName = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()

  const { error } = await supabase.from('player_notes').insert({
    player_id: playerId,
    body: trimmed,
    author_user_id: user.id,
    author_name: authorName,
    author_role: role,
  })
  if (error) throw error

  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/notes')
}

export async function deletePlayerNote(noteId: string, playerId: string) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('player_notes')
    .delete()
    .eq('id', noteId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/notes')
}
