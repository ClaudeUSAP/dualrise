'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_TZ = new Set([
  'Europe/Paris',
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Mexico_City',
])

async function ensureAgent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role, first_name, last_name, email')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) throw new Error('not an agent')
  return { supabase, agent }
}

export async function createCallEvent(input: {
  player_id: string
  school_id: string | null
  event_date: string
  event_time: string
  timezone: string
  description?: string | null
  title_override?: string | null
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.event_date)) throw new Error('invalid date')
  if (!/^\d{2}:\d{2}$/.test(input.event_time)) throw new Error('invalid time')
  if (!ALLOWED_TZ.has(input.timezone)) throw new Error('invalid timezone')

  const { supabase, agent } = await ensureAgent()

  // Build title: "Call coach – {school name}" if school provided
  let title = input.title_override?.trim() || ''
  if (!title) {
    if (input.school_id) {
      const { data: s } = await supabase
        .from('schools')
        .select('name')
        .eq('id', input.school_id)
        .single()
      title = s?.name ? `Call coach – ${s.name}` : 'Call coach'
    } else {
      title = 'Call coach'
    }
  }

  const { error } = await supabase.from('calendar_events').insert({
    player_id: input.player_id,
    title,
    event_type: 'call',
    event_date: input.event_date,
    event_time: input.event_time,
    timezone: input.timezone,
    related_school: input.school_id,
    description: input.description?.trim() || null,
    created_by:
      `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || 'agent',
  })
  if (error) throw error

  revalidatePath('/admin/planning')
  revalidatePath('/calendar')
  revalidatePath(`/admin/players/${input.player_id}`)
}
