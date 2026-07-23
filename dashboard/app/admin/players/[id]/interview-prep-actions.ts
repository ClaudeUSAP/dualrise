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
  const fullName =
    `${(agent as { first_name?: string }).first_name ?? ''} ${(agent as { last_name?: string }).last_name ?? ''}`.trim() ||
    user.email ||
    'Agent'
  return { supabase, user, fullName }
}

export async function togglePlayerInterviewPrepVisibility(
  playerId: string,
  show: boolean
) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('players')
    .update({ show_interview_prep: show })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/resources')
  revalidatePath('/resources/communication-coachs')
  revalidatePath('/resources/interview-prep')
  revalidatePath('/schools')
}

export async function updateInterviewPrep(playerId: string, content: string) {
  const { supabase, user, fullName } = await ensureAgent()
  const { error } = await supabase
    .from('player_interview_prep')
    .upsert(
      {
        player_id: playerId,
        content_markdown: content,
        updated_by_id: user.id,
        updated_by_name: fullName,
      },
      { onConflict: 'player_id' }
    )
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/resources/communication-coachs')
  revalidatePath('/resources/interview-prep')
}
