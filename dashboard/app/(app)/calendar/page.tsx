import { redirect } from 'next/navigation'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'
import { APP_HOST } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'
import { CalendarView, type CalendarEvent } from './CalendarView'

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const today = new Date()
  let year = today.getFullYear()
  let month = today.getMonth()
  if (params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [y, m] = params.month.split('-').map(Number)
    year = y
    month = m - 1
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select('id, first_name, last_name, ical_token')
        .eq('id', member.player_id)
        .single()
    : { data: null }

  const locale = await getViewerLocale(supabase)

  if (!player) {
    return (
      <div className="rounded-md border border-line bg-white p-6 text-muted">
        {serverT(locale, 'common.playerNotFoundFor', {
          email: user.email ?? '',
        })}
      </div>
    )
  }

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)

  const eventCols =
    'id, title, event_date, event_time, event_type, description, timezone'
  const [{ data: monthEvents }, { data: upcoming }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select(eventCols)
      .eq('player_id', player.id)
      .gte('event_date', fmtDate(monthStart))
      .lte('event_date', fmtDate(monthEnd))
      .order('event_date')
      .order('event_time'),
    supabase
      .from('calendar_events')
      .select(eventCols)
      .eq('player_id', player.id)
      .gte('event_date', fmtDate(today))
      .order('event_date')
      .order('event_time')
      .limit(5),
  ])

  const icalUrl = `${APP_HOST}/api/ical/${player.id}?token=${player.ical_token}`

  return (
    <CalendarView
      year={year}
      month={month}
      events={(monthEvents ?? []) as CalendarEvent[]}
      upcoming={(upcoming ?? []) as CalendarEvent[]}
      icalUrl={icalUrl}
      locale={locale}
    />
  )
}
