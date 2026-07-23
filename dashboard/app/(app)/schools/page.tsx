import Link from 'next/link'
import { redirect } from 'next/navigation'
import { OnboardingTour } from '@/components/OnboardingTour'
import { IntroVideoCard } from './IntroVideoCard'
import { CALL_BRIEFINGS_ENABLED } from '@/lib/feature-flags'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import {
  Pipeline,
  type Assignment,
  type PlayerCriterion,
  type School,
} from './Pipeline'

// Per-user data — never serve a Router Cache hit from another session.
export const dynamic = 'force-dynamic'

export default async function SchoolsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await getViewerMember(supabase)
  const { data: player, error: playerError } = member
    ? await supabase
        .from('players')
        .select('id, first_name, onboarding_completed, sheet_id, intro_video_url')
        .eq('id', member.player_id)
        .single()
    : { data: null, error: new Error('no membership') }
  if (playerError || !player) {
    return (
      <div className="rounded-md border border-line bg-white p-6 text-muted">
        Profil joueur introuvable pour {user.email}.
      </div>
    )
  }

  const briefingsHorizon = new Date(
    Date.now() + 48 * 3600 * 1000
  ).toISOString()
  const nowISO = new Date().toISOString()
  const locale = await getViewerLocale(supabase)

  const briefingsQuery = CALL_BRIEFINGS_ENABLED
    ? supabase
        .from('call_briefings')
        .select(
          'id, schools:school_id(name), calendar_events:event_id(event_date, event_time)'
        )
        .eq('player_id', player.id)
        .eq('status', 'sent')
    : Promise.resolve({ data: [] as unknown[] })

  const [
    { data: assignmentsData },
    { data: schoolsData },
    { data: criteriaData },
    { data: upcomingBriefingsRaw },
    { data: crmRow },
  ] = await Promise.all([
    supabase
      .from('school_assignments')
      .select(
        `id, stage, coach_interest,
         schools(id, name, city, state_code, division, gender, governing_body, ranking, coach_name, niche_url, website_url, scoreboard_url, instagram_url, roster_size, graduates_count, tuition_min_usd, tuition_max_usd, coach_email, coach_initials, coach_bio, lat, lng),
         rating_sessions(id, author_type, evaluated_at, created_at, rating_session_items(criterion_key, criterion_label, is_custom, rating)),
         school_call_notes(id, note_date, author_type, author_name, author_user_id, visibility, body, created_at, updated_at)`
      )
      .eq('player_id', player.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('schools')
      .select(
        'id, name, city, state_code, division, gender, governing_body, ranking, coach_name, niche_url, website_url, scoreboard_url, roster_size, graduates_count, tuition_min_usd, tuition_max_usd, coach_email, coach_initials, coach_bio, lat, lng'
      ),
    supabase
      .from('player_criteria')
      .select('id, criterion_key, label, is_default, position')
      .eq('player_id', player.id)
      .order('position', { ascending: true }),
    briefingsQuery,
    // Recruiting status — used to hide the Liste Facs link once the player
    // is committed/signed (recruitment is closed, the sheet stops being
    // relevant). sheet_id stays in DB.
    supabase
      .from('player_crm_data')
      .select('status')
      .eq('player_id', player.id)
      .maybeSingle(),
  ])

  const recruitingClosed = ['committed', 'signed'].includes(
    (crmRow as { status?: string | null } | null)?.status ?? ''
  )

  const assignments = (assignmentsData ?? []) as unknown as Assignment[]
  const allSchools = (schoolsData ?? []) as School[]
  const upcomingBriefings = !CALL_BRIEFINGS_ENABLED
    ? []
    : (
        (upcomingBriefingsRaw ?? []) as Array<{
          id: string
          schools: { name: string } | { name: string }[] | null
          calendar_events:
            | { event_date: string; event_time: string | null }
            | { event_date: string; event_time: string | null }[]
            | null
        }>
      )
        .map((b) => {
          const ev = Array.isArray(b.calendar_events)
            ? b.calendar_events[0]
            : b.calendar_events
          const sch = Array.isArray(b.schools) ? b.schools[0] : b.schools
          if (!ev) return null
          const eventISO = new Date(
            `${ev.event_date}T${ev.event_time ?? '12:00'}:00`
          ).toISOString()
          if (eventISO < nowISO || eventISO > briefingsHorizon) return null
          return {
            id: b.id,
            schoolName: sch?.name ?? null,
            eventDate: ev.event_date,
            eventTime: ev.event_time,
          }
        })
        .filter(
          (b): b is {
            id: string
            schoolName: string | null
            eventDate: string
            eventTime: string | null
          } => !!b
        )
  const playerCriteria = (criteriaData ?? []) as PlayerCriterion[]

  const assignedIds = new Set(
    assignments.map((a) => a.schools?.id).filter(Boolean) as string[]
  )
  const availableSchools = allSchools.filter((s) => !assignedIds.has(s.id))

  return (
    <>
      {!player.onboarding_completed && (
        <OnboardingTour initialOpen firstName={player.first_name} />
      )}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy">
            {serverT(locale, 'schools.welcome', { name: player.first_name })}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {serverT(locale, 'schools.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {assignments.length >= 2 && (
            <Link
              href="/compare/select"
              className="inline-flex items-center gap-1 rounded-md border border-orange/40 bg-orange/10 px-3 py-1.5 text-sm font-bold text-orange transition-colors hover:bg-orange/20"
            >
              ⚖️ {serverT(locale, 'schools.compareCta')}
            </Link>
          )}
          {player.sheet_id && !recruitingClosed && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${player.sheet_id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
            >
              📊 {serverT(locale, 'schools.sheetCta')} ↗
            </a>
          )}
        </div>
      </header>
      {upcomingBriefings.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {upcomingBriefings.map((b) => {
            const d = new Date(`${b.eventDate}T00:00:00`)
            const dateLabel = new Intl.DateTimeFormat(
              locale === 'en' ? 'en-US' : 'fr-FR',
              { weekday: 'long', day: 'numeric', month: 'long' }
            ).format(d)
            const time = b.eventTime
              ? `${locale === 'en' ? ' at ' : ' à '}${b.eventTime.slice(0, 5)}`
              : ''
            return (
              <Link
                key={b.id}
                href={`/briefings/${b.id}`}
                className="flex items-center gap-3 rounded-md border-l-4 border-orange bg-orange/10 px-4 py-3 transition-colors hover:bg-orange/15"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  📞
                </span>
                <div className="flex-1 text-sm">
                  <p className="font-bold text-navy">
                    {serverT(locale, 'schools.briefingBanner.title')}{' '}
                    {b.schoolName ? `— ${b.schoolName}` : ''}
                  </p>
                  <p className="text-xs text-muted">
                    {dateLabel}
                    {time} ·{' '}
                    {serverT(locale, 'schools.briefingBanner.subtitle')}
                  </p>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-orange">
                  {serverT(locale, 'schools.briefingBanner.open')}
                </span>
              </Link>
            )
          })}
        </div>
      )}
      <IntroVideoCard
        url={
          (player as { intro_video_url?: string | null }).intro_video_url ?? null
        }
      />
      <Pipeline
        assignments={assignments}
        availableSchools={availableSchools}
        playerCriteria={playerCriteria}
        viewerRole={member?.role ?? 'player'}
      />
    </>
  )
}
