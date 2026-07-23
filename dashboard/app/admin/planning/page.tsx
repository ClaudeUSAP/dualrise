import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewCallButton } from './NewCallButton'

export const dynamic = 'force-dynamic'

type Search = { scope?: string }

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
})

const TYPE_EMOJI: Record<string, string> = {
  call: '📞',
  tournament: '🏆',
  deadline: '⏰',
  admin: '📋',
}
const TYPE_LABEL: Record<string, string> = {
  call: 'Call',
  tournament: 'Tournoi',
  deadline: 'Deadline',
  admin: 'Admin',
}

function formatEventDateTime(date: string, time: string | null) {
  const d = DATE_FMT.format(new Date(`${date}T00:00:00`))
  if (!time) return d
  const t = TIME_FMT.format(new Date(`${date}T${time}`))
  return `${d} · ${t}`
}

export default async function AdminPlanningPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const { scope } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, role, first_name, last_name, ical_token')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) redirect('/login')
  const isFounder = (agent as { role?: string }).role === 'founder'
  // Founders default to their own roster (same view a normal agent gets).
  // Pass ?scope=all to see every player. Non-founders never broaden.
  const showAll = isFounder && scope === 'all'

  // 1. Fetch the agent's roster (or all players when the founder opts in)
  let playersQuery = supabase
    .from('players')
    .select('id, first_name, last_name, agent_id')
    .order('last_name')
  if (!showAll) playersQuery = playersQuery.eq('agent_id', agent.id)
  const { data: rosterRaw } = await playersQuery
  const roster = (rosterRaw ?? []) as Array<{
    id: string
    first_name: string
    last_name: string
    agent_id: string | null
  }>
  const playerIds = roster.map((p) => p.id)
  const playerById = new Map(roster.map((p) => [p.id, p]))

  if (playerIds.length === 0) {
    return (
      <div>
        <h1 className="display mb-2 text-2xl text-navy sm:text-3xl">
          Planning
        </h1>
        <p className="rounded-md border border-dashed border-line bg-white py-10 text-center text-sm text-muted">
          Aucun joueur dans ton roster.
        </p>
      </div>
    )
  }

  // 2. Calls + events 30 days ahead
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const horizon = new Date(today.getTime() + 30 * 24 * 3600 * 1000)
  const horizonStr = horizon.toISOString().slice(0, 10)

  // 3. Pull each player's pipeline (for the "school select" dropdown in the modal)
  const { data: assignmentsRaw } = await supabase
    .from('school_assignments')
    .select('player_id, school_id, schools(name)')
    .in('player_id', playerIds)

  const schoolsByPlayer = new Map<
    string,
    Array<{ school_id: string; school_name: string }>
  >()
  for (const a of (assignmentsRaw ?? []) as Array<{
    player_id: string
    school_id: string
    schools: { name: string } | { name: string }[] | null
  }>) {
    const school = Array.isArray(a.schools) ? a.schools[0] : a.schools
    if (!school) continue
    const arr = schoolsByPlayer.get(a.player_id) ?? []
    arr.push({ school_id: a.school_id, school_name: school.name })
    schoolsByPlayer.set(a.player_id, arr)
  }
  const playerOptions = roster.map((p) => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    schools: (schoolsByPlayer.get(p.id) ?? []).sort((a, b) =>
      a.school_name.localeCompare(b.school_name)
    ),
  }))

  const [{ data: eventsRaw }, { data: tasksRaw }] = await Promise.all([
    supabase
      .from('calendar_events')
      .select(
        'id, player_id, title, event_date, event_time, event_type, related_school, description, created_by, schools:related_school(name)'
      )
      .in('player_id', playerIds)
      .gte('event_date', todayStr)
      .lte('event_date', horizonStr)
      .order('event_date')
      .order('event_time'),
    supabase
      .from('player_tasks')
      .select(
        'id, player_id, title, description, due_date_text, school_id, status, created_at, schools:school_id(name)'
      )
      .in('player_id', playerIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const events = (eventsRaw ?? []) as Array<{
    id: string
    player_id: string
    title: string
    event_date: string
    event_time: string | null
    event_type: string
    related_school: string | null
    description: string | null
    created_by: string | null
    schools: { name: string } | { name: string }[] | null
  }>
  const tasks = (tasksRaw ?? []) as Array<{
    id: string
    player_id: string
    title: string
    description: string | null
    due_date_text: string | null
    school_id: string | null
    status: string | null
    created_at: string | null
    schools: { name: string } | { name: string }[] | null
  }>

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl text-navy sm:text-3xl">
            Planning — {showAll ? 'équipe entière' : 'mon roster'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Calls et tâches des 30 prochains jours.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFounder && (
            <Link
              href={showAll ? '/admin/planning' : '/admin/planning?scope=all'}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-bold transition-colors ${
                showAll
                  ? 'border-orange bg-orange/10 text-orange'
                  : 'border-line bg-white text-muted hover:border-orange hover:text-orange'
              }`}
            >
              <span
                aria-hidden
                className={`inline-block h-3.5 w-7 rounded-full transition-colors ${
                  showAll ? 'bg-orange' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    showAll ? 'translate-x-3.5' : ''
                  }`}
                />
              </span>
              Vue équipe entière
            </Link>
          )}
          <NewCallButton players={playerOptions} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Column 1 — Calls / events */}
        <section className="rounded-md border border-line bg-white p-4">
          <h2 className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-navy">
            <span>📅 Calls &amp; events (30j)</span>
            <span className="rounded-full bg-cream-2 px-2 py-0.5 text-xs text-muted">
              {events.length}
            </span>
          </h2>
          {events.length === 0 ? (
            <p className="rounded border border-dashed border-line py-6 text-center text-xs text-muted">
              Aucun event prévu.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {events.map((e) => {
                const player = playerById.get(e.player_id)
                const playerName = player
                  ? `${player.first_name} ${player.last_name}`
                  : '—'
                const school = Array.isArray(e.schools) ? e.schools[0] : e.schools
                return (
                  <li
                    key={e.id}
                    className="rounded border border-line/60 bg-cream-2/30 p-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-navy">
                        {formatEventDateTime(e.event_date, e.event_time)}
                      </span>
                      <span className="text-[10px] uppercase text-muted">
                        {TYPE_EMOJI[e.event_type] ?? '·'}{' '}
                        {TYPE_LABEL[e.event_type] ?? e.event_type}
                      </span>
                    </div>
                    <Link
                      href={`/admin/players/${e.player_id}`}
                      className="mt-1 block font-bold text-navy hover:text-orange"
                    >
                      {playerName}
                    </Link>
                    <div className="mt-0.5 text-navy">{e.title}</div>
                    {school?.name && (
                      <div className="text-[11px] text-muted">
                        🎓 {school.name}
                      </div>
                    )}
                    {e.event_type === 'call' && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-bold text-orange">
                        🔄 Synced avec le joueur
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Column 2 — Open tasks */}
        <section className="rounded-md border border-line bg-white p-4">
          <h2 className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-navy">
            <span>✅ Tâches ouvertes</span>
            <span className="rounded-full bg-cream-2 px-2 py-0.5 text-xs text-muted">
              {tasks.length}
            </span>
          </h2>
          {tasks.length === 0 ? (
            <p className="rounded border border-dashed border-line py-6 text-center text-xs text-muted">
              Aucune tâche en cours.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tasks.map((t) => {
                const player = playerById.get(t.player_id)
                const playerName = player
                  ? `${player.first_name} ${player.last_name}`
                  : '—'
                const school = Array.isArray(t.schools) ? t.schools[0] : t.schools
                return (
                  <li
                    key={t.id}
                    className="rounded border border-line/60 bg-cream-2/30 p-2 text-xs"
                  >
                    <Link
                      href={`/admin/players/${t.player_id}`}
                      className="block font-bold text-navy hover:text-orange"
                    >
                      {playerName}
                    </Link>
                    <div className="mt-0.5 text-navy">{t.title}</div>
                    {school?.name && (
                      <div className="text-[11px] text-muted">
                        🎓 {school.name}
                      </div>
                    )}
                    {t.due_date_text && (
                      <div className="text-[11px] text-orange-600">
                        ⏰ {t.due_date_text}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

      </div>

      {(agent as { ical_token?: string | null }).ical_token && (
        <section className="mt-8 rounded-md border border-line bg-cream-2/40 p-4 text-xs text-muted">
          <p className="font-bold uppercase tracking-wide text-navy">
            📆 Abonne ton Google Calendar
          </p>
          <p className="mt-1">
            Copie cette URL et ajoute-la dans Google Calendar → « Ajouter par
            URL ». Le calendrier reste read-only et se met à jour automatiquement.
          </p>
          <code className="mt-2 block overflow-x-auto whitespace-nowrap rounded border border-line bg-white px-2 py-1 font-mono text-[11px] text-navy">
            https://agent.usathleticperformance.com/api/ical/agent/
            {(agent as { ical_token?: string | null }).ical_token}
          </code>
        </section>
      )}
    </div>
  )
}
