'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function reassignAgent(playerId: string, newAgentId: string) {
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

  const { error } = await supabase
    .from('players')
    .update({ agent_id: newAgentId })
    .eq('id', playerId)
  if (error) throw error

  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/admin/players')
}
