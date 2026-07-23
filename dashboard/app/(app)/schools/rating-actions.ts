'use server'

import { revalidatePath } from 'next/cache'
import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'

export type RatingItemInput = {
  criterion_key: string
  criterion_label: string
  is_custom: boolean
  rating: number
}

export async function saveRatingSession(
  assignmentId: string,
  evaluatedAt: string,
  items: RatingItemInput[]
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(evaluatedAt)) {
    throw new Error('invalid evaluatedAt (YYYY-MM-DD)')
  }
  if (items.length === 0) throw new Error('no items')
  for (const it of items) {
    if (!Number.isInteger(it.rating) || it.rating < 1 || it.rating > 5) {
      throw new Error('rating must be integer 1..5')
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')

  const member = await getViewerMember(supabase)
  if (!member) throw new Error('not a player member')
  const authorType = member.role

  const { data: session, error: sessErr } = await supabase
    .from('rating_sessions')
    .upsert(
      {
        assignment_id: assignmentId,
        author_type: authorType,
        evaluated_at: evaluatedAt,
        created_by_user_id: user.id,
      },
      { onConflict: 'assignment_id,author_type,evaluated_at' }
    )
    .select('id')
    .single()
  if (sessErr || !session) throw sessErr ?? new Error('session upsert failed')

  const rows = items.map((it) => ({
    session_id: session.id,
    criterion_key: it.criterion_key,
    criterion_label: it.criterion_label,
    is_custom: it.is_custom,
    rating: it.rating,
  }))
  const { error: itemsErr } = await supabase
    .from('rating_session_items')
    .upsert(rows, { onConflict: 'session_id,criterion_key' })
  if (itemsErr) throw itemsErr

  revalidatePath('/schools')
  return session.id
}

export async function deleteRatingSession(sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('rating_sessions')
    .delete()
    .eq('id', sessionId)
  if (error) throw error
  revalidatePath('/schools')
}
