import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CALL_BRIEFINGS_ENABLED } from '@/lib/feature-flags'
import { createClient } from '@/lib/supabase/server'
import { ArticleMarkdown } from '../../resources/ArticleMarkdown'

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

export default async function PlayerBriefingPage({
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

  const { data } = await supabase
    .from('call_briefings')
    .select(
      'id, content_markdown, status, schools:school_id(name), calendar_events:event_id(event_date, event_time)'
    )
    .eq('id', id)
    .eq('status', 'sent')
    .maybeSingle()

  if (!data) notFound()

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
    : null

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/schools"
        className="inline-block text-xs font-bold uppercase tracking-wide text-muted hover:text-orange"
      >
        ← Dashboard
      </Link>

      <header className="mt-3 mb-6 rounded-md border-l-4 border-orange bg-orange/10 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-orange">
          📞 Préparation call coach
        </p>
        {school?.name && (
          <p className="mt-1 text-lg font-bold text-navy">{school.name}</p>
        )}
        {dateLabel && (
          <p className="text-sm text-muted">{dateLabel}</p>
        )}
      </header>

      <article>
        <ArticleMarkdown source={data.content_markdown ?? ''} />
      </article>
    </div>
  )
}
