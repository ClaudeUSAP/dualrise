'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { findPlayerSheet } from '@/lib/google'
import { createClient } from '@/lib/supabase/server'

export type UnlinkedPlayer = {
  id: string
  first_name: string
  last_name: string
}

export type LinkUnresolved = {
  player: string
  reason: 'none' | 'multiple' | 'error'
  /** Candidate file names when reason === 'multiple'. */
  candidates?: string[]
  error?: string
}

export type LinkBatchResult = {
  linked: number
  unresolved: LinkUnresolved[]
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
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
}

/**
 * Players that have no Drive sheet linked yet. Seeds the client-side batching
 * loop for the manual "Lier les sheets" button.
 */
export async function listUnlinkedPlayers(): Promise<UnlinkedPlayer[]> {
  await ensureFounder()
  const admin = getAdminSupabase()
  const { data, error } = await admin
    .from('players')
    .select('id, first_name, last_name')
    .is('sheet_id', null)
    .order('last_name', { ascending: true })
  if (error) throw error
  return (data ?? []) as UnlinkedPlayer[]
}

/**
 * For each player in the batch (expected to be sheet_id-less), search Drive for
 * a "{First} {Last} Liste Facs" spreadsheet and link it when there is exactly
 * ONE match. 0 matches → left NULL (reason 'none'); 2+ → not linked, candidates
 * returned (reason 'multiple'). Existing sheet_id is never overwritten (guarded
 * both by the listing query and an `.is('sheet_id', null)` write filter). Reuses
 * the same Drive query as invitation approval (findPlayerSheet).
 */
export async function linkPlayerSheetsBatch(
  playerIds: string[]
): Promise<LinkBatchResult> {
  await ensureFounder()
  const result: LinkBatchResult = { linked: 0, unresolved: [] }
  if (playerIds.length === 0) return result

  const admin = getAdminSupabase()
  const { data: players, error } = await admin
    .from('players')
    .select('id, first_name, last_name, sheet_id')
    .in('id', playerIds)
  if (error) throw error

  for (const p of (players ?? []) as Array<{
    id: string
    first_name: string
    last_name: string
    sheet_id: string | null
  }>) {
    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()
    if (p.sheet_id) continue // never overwrite an existing link
    try {
      const res = await findPlayerSheet(p.first_name, p.last_name)
      if (res.found && res.fileId) {
        const { error: upErr } = await admin
          .from('players')
          .update({ sheet_id: res.fileId })
          .eq('id', p.id)
          .is('sheet_id', null) // guard against a concurrent link
        if (upErr) {
          result.unresolved.push({ player: name, reason: 'error', error: upErr.message })
        } else {
          result.linked += 1
        }
      } else if (res.candidates.length === 0) {
        result.unresolved.push({ player: name, reason: 'none' })
      } else {
        result.unresolved.push({
          player: name,
          reason: 'multiple',
          candidates: res.candidates.map((c) => c.name),
        })
      }
    } catch (err) {
      result.unresolved.push({
        player: name,
        reason: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return result
}
