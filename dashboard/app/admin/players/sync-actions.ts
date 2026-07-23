'use server'

import { APP_HOST } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'

export type SyncablePlayer = {
  id: string
  first_name: string
  last_name: string
}

export type SyncBatchResult = {
  playersProcessed: number
  assignmentsUpserted: number
  newAssignments: number
  unchanged: number
  errors: string[]
}

async function ensureFounder() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!agent || agent.role !== 'founder') {
    throw new Error('founder only')
  }
  return { supabase }
}

/**
 * Lists every player with a non-null sheet_id, regardless of recruiting
 * status. Used by the manual "Sync tout maintenant" button to seed the
 * client-side batching loop.
 */
export async function listSyncablePlayers(): Promise<SyncablePlayer[]> {
  const { supabase } = await ensureFounder()
  const { data, error } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .not('sheet_id', 'is', null)
    .order('last_name', { ascending: true })
  if (error) throw error
  return (data ?? []) as SyncablePlayer[]
}

/**
 * Runs the existing sync-player-sheets route for a specific batch of player
 * UUIDs. The route is reused verbatim — we just pass `?player_ids=` so the
 * cron auth + sync logic stays the single source of truth. CRON_SECRET stays
 * server-side, never exposed to the client.
 */
export async function syncPlayerSheetsBatch(
  playerIds: string[]
): Promise<SyncBatchResult> {
  await ensureFounder()
  if (playerIds.length === 0) {
    return {
      playersProcessed: 0,
      assignmentsUpserted: 0,
      newAssignments: 0,
      unchanged: 0,
      errors: [],
    }
  }
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error('CRON_SECRET not set')

  const url = new URL('/api/admin/sync-player-sheets', APP_HOST)
  url.searchParams.set('player_ids', playerIds.join(','))

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`sync-player-sheets ${res.status}: ${text.slice(0, 200)}`)
  }
  let json: Record<string, unknown>
  try {
    json = JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new Error(`sync-player-sheets returned non-JSON: ${text.slice(0, 200)}`)
  }
  return {
    playersProcessed: Number(json.playersProcessed) || 0,
    assignmentsUpserted: Number(json.assignmentsUpserted) || 0,
    newAssignments: Number(json.newAssignments) || 0,
    unchanged: Number(json.unchanged) || 0,
    errors: Array.isArray(json.errors) ? (json.errors as string[]) : [],
  }
}
