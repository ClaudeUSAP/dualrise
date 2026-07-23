'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updatePlayerLanguage(lang: 'fr' | 'en') {
  if (lang !== 'fr' && lang !== 'en') throw new Error('invalid lang')
  const supabase = await createClient()
  // RLS on `players` has no UPDATE policy for the player themselves, so a
  // direct .update() silently affects 0 rows. The RPC is SECURITY DEFINER
  // and scopes the write to `preferred_language` for the caller's player(s).
  const { error } = await supabase.rpc('set_player_preferred_language', {
    p_lang: lang,
  })
  if (error) throw error
  revalidatePath('/', 'layout')
}
