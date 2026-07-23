import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { TasksView } from './TasksView'

type RawTask = {
  id: string
  title: string
  description: string | null
  due_date_text: string | null
  school_id: string | null
  status: string | null
  done_at: string | null
  done_by_name: string | null
  done_by_role: string | null
  assigned_by_name: string | null
  created_at: string | null
  schools: { id: string; name: string } | { id: string; name: string }[] | null
}

export default async function PlayerTasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select('id')
        .eq('id', member.player_id)
        .single()
    : { data: null }

  const locale = await getViewerLocale(supabase)
  const DATE_FMT = new Intl.DateTimeFormat(
    locale === 'en' ? 'en-US' : 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )

  if (!player) {
    return (
      <div className="rounded-md border border-line bg-white p-6 text-muted">
        {serverT(locale, 'common.playerNotFound')}{' '}
        <Link href="/schools" className="font-bold text-orange">
          {serverT(locale, 'common.returnHome')}
        </Link>
      </div>
    )
  }

  const { data } = await supabase
    .from('player_tasks')
    .select(`
      id, title, description, due_date_text, school_id, status,
      done_at, done_by_name, done_by_role,
      assigned_by_name, created_at,
      schools(id, name)
    `)
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })

  const raw = (data ?? []) as unknown as RawTask[]
  const tasks = raw.map((t) => {
    const schoolEntry = Array.isArray(t.schools) ? t.schools[0] : t.schools
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      due_date_text: t.due_date_text,
      school_id: t.school_id,
      school_name: schoolEntry?.name ?? null,
      status: t.status,
      done_at: t.done_at,
      done_by_name: t.done_by_name,
      done_by_role: t.done_by_role,
      assigned_by_name: t.assigned_by_name,
      created_at: t.created_at,
      created_at_display: t.created_at ? DATE_FMT.format(new Date(t.created_at)) : null,
      done_at_display: t.done_at ? DATE_FMT.format(new Date(t.done_at)) : null,
    }
  })

  return (
    <div>
      <h1 className="display mb-3 text-2xl text-navy sm:text-3xl">
        {serverT(locale, 'tasks.title')}
      </h1>
      <p className="mb-6 rounded-md border border-orange/20 bg-orange/5 p-3 text-xs text-navy">
        {serverT(locale, 'tasks.helper')}
      </p>
      <TasksView tasks={tasks} />
    </div>
  )
}
