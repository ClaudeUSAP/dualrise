import { notFound, redirect } from 'next/navigation'
import { CALL_BRIEFINGS_ENABLED } from '@/lib/feature-flags'
import { createClient } from '@/lib/supabase/server'
import { BriefingForm } from './BriefingForm'

export const dynamic = 'force-dynamic'

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
})

export default async function EditBriefingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!CALL_BRIEFINGS_ENABLED) notFound()
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) redirect('/login')

  const { data } = await supabase
    .from('call_briefings')
    .select(
      'id, content_markdown, status, player_id, school_id, event_id, players:player_id(first_name, last_name), schools:school_id(name), calendar_events:event_id(event_date, event_time)'
    )
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()

  const player = Array.isArray(data.players) ? data.players[0] : data.players
  const school = Array.isArray(data.schools) ? data.schools[0] : data.schools
  const ev = Array.isArray(data.calendar_events)
    ? data.calendar_events[0]
    : data.calendar_events
  const dateLabel = ev?.event_date
    ? DATE_FMT.format(new Date(`${ev.event_date}T00:00:00`)) +
      (ev.event_time
        ? ' à ' +
          TIME_FMT.format(new Date(`${ev.event_date}T${ev.event_time}`))
        : '')
    : '—'

  return (
    <BriefingForm
      id={data.id}
      initialContent={data.content_markdown ?? ''}
      status={(data.status ?? 'draft') as 'draft' | 'sent' | 'archived'}
      metadata={{
        playerName: player
          ? `${player.first_name} ${player.last_name}`
          : 'Joueur',
        schoolName: school?.name ?? null,
        dateLabel,
      }}
    />
  )
}
