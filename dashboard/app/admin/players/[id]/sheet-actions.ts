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
  return { supabase }
}

function extractSheetId(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  const m = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  // Also handle the bare ID
  return trimmed
}

export async function updateSheetId(playerId: string, sheetIdOrUrl: string) {
  const { supabase } = await ensureAgent()
  const sheetId = extractSheetId(sheetIdOrUrl)
  if (!sheetId) throw new Error('Sheet ID requis')
  const { error } = await supabase
    .from('players')
    .update({ sheet_id: sheetId })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/schools')
}

export async function clearSheetId(playerId: string) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('players')
    .update({ sheet_id: null })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/schools')
}

export async function updateIntroVideoUrl(playerId: string, url: string) {
  const { supabase } = await ensureAgent()
  const trimmed = url.trim()
  if (!trimmed) throw new Error('Lien vidéo requis')
  if (!/^https?:\/\/\S+$/i.test(trimmed)) {
    throw new Error('Lien invalide — doit commencer par http(s)://')
  }
  const { error } = await supabase
    .from('players')
    .update({ intro_video_url: trimmed })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/schools')
}

export async function clearIntroVideoUrl(playerId: string) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('players')
    .update({ intro_video_url: null })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/schools')
}
