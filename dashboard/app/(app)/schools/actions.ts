'use server'

import { revalidatePath } from 'next/cache'
import {
  notifyCoachInterestUp,
  notifyNewCoachNote,
} from '@/lib/email-triggers'
import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'

type Stage = 'interested' | 'talks' | 'offer'

const STAGES: Stage[] = ['interested', 'talks', 'offer']

async function getCurrentPlayerId() {
  const supabase = await createClient()
  const member = await getViewerMember(supabase)
  if (!member) throw new Error('player not found')
  return { supabase, playerId: member.player_id, viewerRole: member.role }
}

export async function updateAssignmentStage(assignmentId: string, newStage: string) {
  if (!STAGES.includes(newStage as Stage)) {
    throw new Error(`invalid stage: ${newStage}`)
  }
  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from('school_assignments')
    .update({ stage: newStage })
    .eq('id', assignmentId)
    .select('player_id')
    .single()
  if (error) throw error
  revalidatePath('/schools')
  if (updated?.player_id) {
    revalidatePath(`/admin/players/${updated.player_id}`)
  }
}

export async function updateCoachInterest(assignmentId: string, newLevel: number) {
  if (![1, 2, 3].includes(newLevel)) {
    throw new Error('coach_interest must be 1, 2 or 3')
  }
  const supabase = await createClient()

  const { data: current, error: readError } = await supabase
    .from('school_assignments')
    .select('coach_interest, player_id, schools(name)')
    .eq('id', assignmentId)
    .single<{
      coach_interest: number | null
      player_id: string
      schools: { name: string } | null
    }>()
  if (readError || !current) throw readError ?? new Error('assignment not found')

  const oldLevel = current.coach_interest

  const { error: updError } = await supabase
    .from('school_assignments')
    .update({ coach_interest: newLevel })
    .eq('id', assignmentId)
  if (updError) throw updError

  revalidatePath('/schools')

  if (oldLevel != null && newLevel > oldLevel && current.schools?.name) {
    try {
      await notifyCoachInterestUp({
        playerId: current.player_id,
        schoolName: current.schools.name,
        oldLevel,
        newLevel,
      })
    } catch (err) {
      console.error('coach_interest email failed:', err)
    }
  }
  revalidatePath('/admin/players')
  revalidatePath(`/admin/players/${current.player_id}`)
}

export async function addAssignment(schoolId: string) {
  const { supabase, playerId } = await getCurrentPlayerId()
  const { error } = await supabase.from('school_assignments').insert({
    player_id: playerId,
    school_id: schoolId,
    stage: 'interested',
  })
  if (error) throw error
  revalidatePath('/schools')
}

export async function removeAssignment(assignmentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('school_assignments')
    .delete()
    .eq('id', assignmentId)
  if (error) throw error
  revalidatePath('/schools')
  revalidatePath('/admin/players', 'layout')
}

export async function rateSchool(
  assignmentId: string,
  criterionKey: string,
  criterionLabel: string,
  isCustom: boolean,
  rating: number
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('rating must be an integer between 1 and 5')
  }
  const supabase = await createClient()
  const { error } = await supabase.from('school_ratings').upsert(
    {
      assignment_id: assignmentId,
      criterion_key: criterionKey,
      criterion_label: criterionLabel,
      is_custom: isCustom,
      rating,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'assignment_id,criterion_key' }
  )
  if (error) throw error
  revalidatePath('/schools')
}

export async function addCustomCriterion(criterionLabel: string) {
  const trimmed = criterionLabel.trim()
  if (!trimmed) throw new Error('criterion label required')

  const { supabase, playerId } = await getCurrentPlayerId()

  const { data: existing } = await supabase
    .from('player_criteria')
    .select('position')
    .eq('player_id', playerId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPos = (existing?.[0]?.position ?? 0) + 1

  const slug = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30)
  const key = `custom_${slug || 'criterion'}_${Date.now().toString(36)}`

  const { error } = await supabase.from('player_criteria').insert({
    player_id: playerId,
    criterion_key: key,
    label: trimmed,
    is_default: false,
    position: nextPos,
  })
  if (error) throw error
  revalidatePath('/schools')
}

export async function removeCustomCriterion(criterionKey: string) {
  const { supabase, playerId } = await getCurrentPlayerId()

  const { error: delCriterionError } = await supabase
    .from('player_criteria')
    .delete()
    .eq('player_id', playerId)
    .eq('criterion_key', criterionKey)
    .eq('is_default', false)
  if (delCriterionError) throw delCriterionError

  const { data: assignments } = await supabase
    .from('school_assignments')
    .select('id')
    .eq('player_id', playerId)

  const assignmentIds = (assignments ?? []).map((a) => a.id)
  if (assignmentIds.length > 0) {
    await supabase
      .from('school_ratings')
      .delete()
      .in('assignment_id', assignmentIds)
      .eq('criterion_key', criterionKey)

    const { data: sessions } = await supabase
      .from('rating_sessions')
      .select('id')
      .in('assignment_id', assignmentIds)
    const sessionIds = (sessions ?? []).map((s) => s.id)
    if (sessionIds.length > 0) {
      await supabase
        .from('rating_session_items')
        .delete()
        .in('session_id', sessionIds)
        .eq('criterion_key', criterionKey)
    }
  }

  revalidatePath('/schools')
}

export async function updateCriterionLabel(criterionKey: string, newLabel: string) {
  const trimmed = newLabel.trim()
  if (!trimmed) throw new Error('label required')

  const { supabase, playerId } = await getCurrentPlayerId()
  const { error } = await supabase
    .from('player_criteria')
    .update({ label: trimmed })
    .eq('player_id', playerId)
    .eq('criterion_key', criterionKey)
  if (error) throw error
  revalidatePath('/schools')
}

export async function addNote(
  assignmentId: string,
  noteDate: string,
  body: string,
  authorRole: 'player' | 'parent' | 'other' = 'player',
  visibility: 'shared' | 'private' = 'shared'
) {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('note body required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) throw new Error('invalid note_date')
  if (!['player', 'parent', 'other'].includes(authorRole)) {
    throw new Error('invalid author_role')
  }
  if (!['shared', 'private'].includes(visibility)) {
    throw new Error('invalid visibility')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')

  // Resolve the viewer via player_members so parents (whose auth_user_id is
  // NOT on the players row) can add notes too — looking players up by
  // auth_user_id only ever matched the player themselves.
  const member = await getViewerMember(supabase)
  if (!member) throw new Error('player not found')

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('first_name, last_name')
    .eq('id', member.player_id)
    .single()
  if (playerError || !player) throw playerError ?? new Error('player not found')

  const { error } = await supabase.from('school_call_notes').insert({
    assignment_id: assignmentId,
    note_date: noteDate,
    author_type: authorRole,
    author_name: `${player.first_name} ${player.last_name}`,
    author_user_id: user.id,
    visibility,
    body: trimmed,
  })
  if (error) throw error
  revalidatePath('/schools')
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('school_call_notes').delete().eq('id', noteId)
  if (error) throw error
  revalidatePath('/schools')
}

export async function updateNote(noteId: string, body: string) {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('note body required')
  const supabase = await createClient()
  const { error } = await supabase
    .from('school_call_notes')
    .update({ body: trimmed })
    .eq('id', noteId)
  if (error) throw error
  // updated_at is stamped by the trg_school_call_notes_updated_at trigger
  revalidatePath('/schools')
  revalidatePath('/admin/players', 'layout')
}

export async function addNoteAsAgent(
  assignmentId: string,
  noteDate: string,
  body: string,
  visibility: 'shared' | 'private' = 'shared'
) {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('note body required')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) throw new Error('invalid note_date')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')

  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .select('id, first_name, last_name')
    .eq('auth_user_id', user.id)
    .single()
  if (agentErr || !agent) throw new Error('not an agent')
  const authorName = `${agent.first_name} ${agent.last_name}`

  if (!['shared', 'private'].includes(visibility)) {
    throw new Error('invalid visibility')
  }
  const { error: insertErr } = await supabase.from('school_call_notes').insert({
    assignment_id: assignmentId,
    note_date: noteDate,
    author_type: 'agent',
    author_name: authorName,
    author_user_id: user.id,
    visibility,
    body: trimmed,
  })
  if (insertErr) throw insertErr

  let playerIdForRevalidate: string | null = null
  try {
    const { data: assignment } = await supabase
      .from('school_assignments')
      .select('player_id, schools(name, coach_name)')
      .eq('id', assignmentId)
      .single<{
        player_id: string
        schools: { name: string; coach_name: string | null } | null
      }>()
    if (assignment) {
      playerIdForRevalidate = assignment.player_id
      await notifyNewCoachNote({
        playerId: assignment.player_id,
        schoolName: assignment.schools?.name ?? 'cette école',
        coachName: assignment.schools?.coach_name ?? null,
        agentName: authorName,
        noteBody: trimmed,
      })
    }
  } catch (err) {
    console.error('agent note email failed:', err)
  }

  revalidatePath('/schools')
  revalidatePath('/admin/players')
  if (playerIdForRevalidate) {
    revalidatePath(`/admin/players/${playerIdForRevalidate}`)
  }
}


export async function updateSchoolInfo(
  schoolId: string,
  data: {
    coach_name: string | null
    coach_email: string | null
    coach_bio: string | null
    niche_url: string | null
    website_url: string | null
    instagram_url: string | null
    scoreboard_url: string | null
  }
) {
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

  const cleaned = {
    coach_name: data.coach_name?.trim() || null,
    coach_email: data.coach_email?.trim() || null,
    coach_bio: data.coach_bio?.trim() || null,
    niche_url: data.niche_url?.trim() || null,
    website_url: data.website_url?.trim() || null,
    instagram_url: data.instagram_url?.trim() || null,
    scoreboard_url: data.scoreboard_url?.trim() || null,
  }

  const { error } = await supabase
    .from('schools')
    .update(cleaned)
    .eq('id', schoolId)
  if (error) throw error
  revalidatePath('/schools')
  revalidatePath('/admin/players')
}
