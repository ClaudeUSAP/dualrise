import { NextResponse } from 'next/server'
import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'

type LastVisits = {
  schools?: string
  checklist?: string
  calendar?: string
  tasks?: string
  notes?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as { lastVisits?: LastVisits }
  const lv = body.lastVisits ?? {}

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select('id')
        .eq('id', member.player_id)
        .maybeSingle()
    : { data: null }

  if (!player) {
    return NextResponse.json({ schools: 0, checklist: 0, calendar: 0, tasks: 0, notes: 0 })
  }

  const counts = { schools: 0, checklist: 0, calendar: 0, tasks: 0, notes: 0 }

  if (lv.schools) {
    const { count } = await supabase
      .from('school_call_notes')
      .select('id, school_assignments!inner(player_id)', { count: 'exact', head: true })
      .eq('school_assignments.player_id', player.id)
      .eq('author_type', 'agent')
      .eq('visibility', 'shared')
      .gte('created_at', lv.schools)
    counts.schools = count ?? 0
  }

  if (lv.checklist) {
    const { count } = await supabase
      .from('checklist_player_overrides')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)
      .is('template_id', null)
      .gte('created_at', lv.checklist)
    counts.checklist = count ?? 0
  }

  if (lv.calendar) {
    const { count } = await supabase
      .from('calendar_events')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)
      .gte('created_at', lv.calendar)
    counts.calendar = count ?? 0
  }

  {
    const { count } = await supabase
      .from('player_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)
      .eq('status', 'pending')
    counts.tasks = count ?? 0
  }

  if (lv.notes) {
    const { count } = await supabase
      .from('player_notes')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)
      .gte('created_at', lv.notes)
    counts.notes = count ?? 0
  }

  return NextResponse.json(counts)
}
