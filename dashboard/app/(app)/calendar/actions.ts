'use server'

import { revalidatePath } from 'next/cache'
import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'

const TYPES = ['call', 'tournament', 'deadline', 'admin'] as const
type EventType = (typeof TYPES)[number]

type EventInput = {
  title: string
  event_type: string
  event_date: string
  event_time?: string
  timezone?: string | null
  description?: string
}

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

async function getCurrentPlayerId() {
  const supabase = await createClient()
  const member = await getViewerMember(supabase)
  if (!member) throw new Error('player not found')
  return { supabase, playerId: member.player_id }
}

function validate(input: EventInput) {
  if (!input.title.trim()) throw new Error('title required')
  if (!TYPES.includes(input.event_type as EventType)) {
    throw new Error('invalid event_type')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.event_date)) {
    throw new Error('invalid event_date')
  }
  if (input.event_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(input.event_time)) {
    throw new Error('invalid event_time')
  }
  if (input.timezone && !ALLOWED_TZ.has(input.timezone)) {
    throw new Error('invalid timezone')
  }
}

export async function createEvent(input: EventInput) {
  validate(input)
  const { supabase, playerId } = await getCurrentPlayerId()
  const { error } = await supabase.from('calendar_events').insert({
    player_id: playerId,
    title: input.title.trim(),
    event_type: input.event_type,
    event_date: input.event_date,
    event_time: input.event_time || null,
    timezone: input.event_time ? input.timezone || 'Europe/Paris' : null,
    description: input.description?.trim() || null,
  })
  if (error) throw error
  revalidatePath('/calendar')
}

export async function updateEvent(input: EventInput & { id: string }) {
  validate(input)
  const supabase = await createClient()
  const { error } = await supabase
    .from('calendar_events')
    .update({
      title: input.title.trim(),
      event_type: input.event_type,
      event_date: input.event_date,
      event_time: input.event_time || null,
      timezone: input.event_time ? input.timezone || 'Europe/Paris' : null,
      description: input.description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
  if (error) throw error
  revalidatePath('/calendar')
}

export async function deleteEvent(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/calendar')
}
