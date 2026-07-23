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
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) throw new Error('not an agent')
  return { supabase, agent }
}

export async function addSchoolToPipeline(playerId: string, schoolId: string) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase.from('school_assignments').insert({
    player_id: playerId,
    school_id: schoolId,
    stage: 'interested',
    sync_source: 'manual',
  })
  if (error && error.code !== '23505') throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function removeSchoolFromPipeline(
  playerId: string,
  schoolId: string
) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('school_assignments')
    .delete()
    .eq('player_id', playerId)
    .eq('school_id', schoolId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export type SchoolSearchResult = {
  id: string
  name: string
  city: string | null
  state_code: string | null
  division: string | null
  gender: string | null
}

export async function searchSchoolsForPipeline(
  playerId: string,
  query: string
): Promise<SchoolSearchResult[]> {
  const { supabase } = await ensureAgent()

  const { data: existingAssignments } = await supabase
    .from('school_assignments')
    .select('school_id')
    .eq('player_id', playerId)
  const excluded = new Set(
    (existingAssignments ?? [])
      .map((a) => a.school_id)
      .filter((id): id is string => typeof id === 'string')
  )

  const trimmed = query.trim()
  let req = supabase
    .from('schools')
    .select('id, name, city, state_code, division, gender')

  if (trimmed) {
    req = req.ilike('name', `%${trimmed}%`)
  }

  const { data, error } = await req.order('name').limit(50)
  if (error) throw error

  return (data ?? []).filter((s) => !excluded.has(s.id))
}
