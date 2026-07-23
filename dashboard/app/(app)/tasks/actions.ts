'use server'

import { revalidatePath } from 'next/cache'
import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'

export async function markTaskDoneAsPlayer(taskId: string, done: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')

  const member = await getViewerMember(supabase)
  if (!member) throw new Error('player not found')

  const { data: player, error: playerErr } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .eq('id', member.player_id)
    .single()
  if (playerErr || !player) throw playerErr ?? new Error('player not found')

  const name = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim()

  const { error } = await supabase
    .from('player_tasks')
    .update({
      status: done ? 'done' : 'pending',
      done_at: done ? new Date().toISOString() : null,
      done_by_user_id: done ? user.id : null,
      done_by_name: done ? name : null,
      done_by_role: done ? member.role : null,
    })
    .eq('id', taskId)
    .eq('player_id', player.id)
  if (error) throw error

  revalidatePath('/tasks')
}
