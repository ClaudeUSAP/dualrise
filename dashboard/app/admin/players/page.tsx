import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RememberListingUrl } from './BackToPlayersLink'
import { FiltersBar } from './FiltersBar'
import { LinkSheetsButton } from './LinkSheetsButton'
import { SyncAllButton } from './SyncAllButton'

export const dynamic = 'force-dynamic'

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const STATUS_META: Record<string, { label: string; cls: string }> = {
  prospect: { label: '🔍 Prospect', cls: 'bg-blue-100 text-blue-800' },
  en_cours: { label: '⏳ En cours', cls: 'bg-yellow-100 text-yellow-800' },
  committed: { label: '✅ Committed', cls: 'bg-green-100 text-green-800' },
  signed: { label: '📝 Signed', cls: 'bg-purple-100 text-purple-800' },
}

type RawPlayer = {
  id: string
  first_name: string
  last_name: string
  graduation_year: number
  gender: string | null
  agent_id: string | null
  auth_user_id: string | null
  parent_emails: string[] | null
  agents:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null
  player_crm_data:
    | { status: string | null }
    | { status: string | null }[]
    | null
  internal_notes: Array<{ id: string; body: string; created_at: string }> | null
  player_tasks: Array<{
    id: string
    title: string
    due_date_text: string | null
    status: string | null
    created_at: string
  }> | null
}

type AccessInfo = {
  hasAccount: boolean
  invitationSent: boolean
  parentCount: number
  lastSignInAt: string | null
}

const RELATIVE_FMT = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diffMs = then - Date.now()
  const diffSec = Math.round(diffMs / 1000)
  const absSec = Math.abs(diffSec)
  if (absSec < 60) return RELATIVE_FMT.format(diffSec, 'second')
  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return RELATIVE_FMT.format(diffMin, 'minute')
  const diffHr = Math.round(diffMin / 60)
  if (Math.abs(diffHr) < 24) return RELATIVE_FMT.format(diffHr, 'hour')
  const diffDay = Math.round(diffHr / 24)
  if (Math.abs(diffDay) < 30) return RELATIVE_FMT.format(diffDay, 'day')
  const diffMonth = Math.round(diffDay / 30)
  if (Math.abs(diffMonth) < 12) return RELATIVE_FMT.format(diffMonth, 'month')
  const diffYear = Math.round(diffMonth / 12)
  return RELATIVE_FMT.format(diffYear, 'year')
}

function pickOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

export default async function AdminPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; agent_id?: string; q?: string }>
}) {
  const { year: yearParam, agent_id: agentParam, q: qParam } = await searchParams
  const yearFilter = yearParam ?? 'all'
  const agentFilter = agentParam ?? 'all'
  const searchQuery = (qParam ?? '').trim()
  const searchLower = searchQuery.toLowerCase()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentAgent } = await supabase
    .from('agents')
    .select('id, first_name, last_name, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const [{ data: rawPlayers }, { data: agentsListRaw }] = await Promise.all([
    supabase
      .from('players')
      .select(
        `
        id, first_name, last_name, graduation_year, gender, agent_id,
        auth_user_id, parent_emails,
        agents:agent_id (first_name, last_name),
        player_crm_data (status),
        internal_notes (id, body, created_at),
        player_tasks (id, title, due_date_text, status, created_at)
      `
      )
      .order('graduation_year')
      .order('last_name'),
    supabase.from('agents').select('id, first_name, last_name').order('first_name'),
  ])

  const allPlayers = (rawPlayers ?? []) as unknown as RawPlayer[]
  const agentsList = (agentsListRaw ?? []) as Array<{
    id: string
    first_name: string | null
    last_name: string | null
  }>

  const isFounder = currentAgent?.role === 'founder'
  const greetingName = currentAgent?.first_name ?? 'agent'
  const rosterCount = isFounder
    ? allPlayers.length
    : currentAgent
      ? allPlayers.filter((p) => p.agent_id === currentAgent.id).length
      : 0

  const yearsSet = new Set<number>()
  for (const p of allPlayers) yearsSet.add(p.graduation_year)
  const years = Array.from(yearsSet).sort()

  const filtered = allPlayers.filter((p) => {
    if (yearFilter !== 'all' && String(p.graduation_year) !== yearFilter) {
      return false
    }
    if (agentFilter !== 'all' && p.agent_id !== agentFilter) return false
    if (searchLower) {
      const haystack = `${p.first_name} ${p.last_name}`.toLowerCase()
      if (!haystack.includes(searchLower)) return false
    }
    return true
  })

  const playerIds = filtered.map((p) => p.id)
  const [
    { data: completionRows },
    { data: invitationRows },
    { data: lastSignInRows },
  ] = playerIds.length
    ? await Promise.all([
        supabase
          .from('player_completion_summary')
          .select('player_id, checked_count, total_count, percent_complete')
          .in('player_id', playerIds),
        supabase
          .from('pending_player_invitations')
          .select('player_id')
          .eq('status', 'invited')
          .in('player_id', playerIds),
        supabase.rpc('get_players_last_sign_in', { p_player_ids: playerIds }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]
  const completionsByPlayer = new Map<
    string,
    { checked: number; total: number; percent: number }
  >()
  for (const row of (completionRows ?? []) as Array<{
    player_id: string
    checked_count: number
    total_count: number
    percent_complete: number
  }>) {
    completionsByPlayer.set(row.player_id, {
      checked: Number(row.checked_count) || 0,
      total: Number(row.total_count) || 0,
      percent: Number(row.percent_complete) || 0,
    })
  }
  const invitedPlayerIds = new Set<string>()
  for (const row of (invitationRows ?? []) as Array<{ player_id: string | null }>) {
    if (row.player_id) invitedPlayerIds.add(row.player_id)
  }
  const lastSignInByPlayer = new Map<string, string>()
  for (const row of (lastSignInRows ?? []) as Array<{
    player_id: string
    last_sign_in_at: string | null
  }>) {
    if (row.last_sign_in_at) lastSignInByPlayer.set(row.player_id, row.last_sign_in_at)
  }

  const accessByPlayer = new Map<string, AccessInfo>()
  for (const p of filtered) {
    const parents = Array.isArray(p.parent_emails) ? p.parent_emails : []
    accessByPlayer.set(p.id, {
      hasAccount: !!p.auth_user_id,
      invitationSent: invitedPlayerIds.has(p.id),
      parentCount: parents.filter((e) => typeof e === 'string' && e.trim()).length,
      lastSignInAt: lastSignInByPlayer.get(p.id) ?? null,
    })
  }

  const groups = new Map<number, RawPlayer[]>()
  for (const p of filtered) {
    const arr = groups.get(p.graduation_year) ?? []
    arr.push(p)
    groups.set(p.graduation_year, arr)
  }
  const groupedYears = Array.from(groups.keys()).sort()
  const isGrouping = yearFilter === 'all' && !searchLower

  return (
    <div>
      <RememberListingUrl />
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy">
            Bonjour {greetingName},
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tu as {rosterCount} joueur{rosterCount > 1 ? 's' : ''} actif
            {rosterCount > 1 ? 's' : ''}
            {isFounder && ' au total'}
          </p>
        </div>
        {isFounder && (
          <div className="flex flex-wrap items-center gap-2">
            <LinkSheetsButton />
            <SyncAllButton />
          </div>
        )}
      </header>

      <FiltersBar
        years={years}
        agents={agentsList}
        totalCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-white p-8 text-center text-muted">
          Aucun joueur ne correspond aux filtres.
        </div>
      ) : isGrouping ? (
        <div className="flex flex-col gap-8">
          {groupedYears.map((y) => {
            const list = groups.get(y) ?? []
            return (
              <section key={y}>
                <h2 className="display mb-3 flex items-center gap-3 text-xl text-navy">
                  Fall {y}
                  <span className="rounded-full bg-cream-2 px-2.5 py-0.5 text-xs font-bold text-muted">
                    {list.length}
                  </span>
                </h2>
                <CardGrid players={list} completions={completionsByPlayer} accessByPlayer={accessByPlayer} />
              </section>
            )
          })}
        </div>
      ) : (
        <CardGrid players={filtered} completions={completionsByPlayer} accessByPlayer={accessByPlayer} />
      )}
    </div>
  )
}

function CardGrid({
  players,
  completions,
  accessByPlayer,
}: {
  players: RawPlayer[]
  completions: Map<string, { checked: number; total: number; percent: number }>
  accessByPlayer: Map<string, AccessInfo>
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {players.map((p) => (
        <PlayerCard
          key={p.id}
          player={p}
          completion={completions.get(p.id)}
          access={accessByPlayer.get(p.id)}
        />
      ))}
    </div>
  )
}

function PlayerCard({
  player,
  completion,
  access,
}: {
  player: RawPlayer
  completion: { checked: number; total: number; percent: number } | undefined
  access: AccessInfo | undefined
}) {
  const agent = pickOne(player.agents)
  const crm = pickOne(player.player_crm_data)
  const status = crm?.status ?? null
  const statusMeta = status ? STATUS_META[status] : null
  const agentName = agent
    ? `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || '—'
    : '—'

  const latestNote =
    (player.internal_notes ?? [])
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null

  const activeTask =
    (player.player_tasks ?? [])
      .filter((t) => (t.status ?? 'pending') === 'pending')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null

  const percent = completion?.percent ?? 0
  const checked = completion?.checked ?? 0
  const total = completion?.total ?? 0

  return (
    <Link
      href={`/admin/players/${player.id}`}
      className="flex flex-col rounded-md border border-line bg-white p-4 transition-colors hover:border-orange"
    >
      <div className="min-w-0">
        <h3 className="display text-lg text-navy">
          {player.first_name} {player.last_name}
        </h3>
        <p className="mt-0.5 text-xs text-muted">
          Fall {player.graduation_year} · Agent :{' '}
          <span className="text-navy">{agentName}</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {statusMeta ? (
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-bold ${statusMeta.cls}`}
          >
            {statusMeta.label}
          </span>
        ) : (
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-muted">
            Pas de statut
          </span>
        )}
        <span className="text-[11px] text-muted">
          Checklist :{' '}
          <strong className="text-navy">{percent}%</strong>
          {total > 0 && (
            <span className="ml-1 text-muted">
              ({checked}/{total})
            </span>
          )}
        </span>
      </div>

      {access && <AccessBadges access={access} />}

      {latestNote && (
        <div className="mt-3 rounded-md border border-line bg-cream-2/40 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
            📝 Dernière note ({DATE_FMT.format(new Date(latestNote.created_at))})
          </p>
          <p className="mt-1 line-clamp-2 text-xs italic text-navy">
            “{latestNote.body}”
          </p>
        </div>
      )}

      {activeTask && (
        <div className="mt-2 rounded-md border border-orange/30 bg-orange/5 p-2">
          <p className="text-xs text-navy">
            ⏰ <strong>Tâche en cours :</strong> {activeTask.title}
          </p>
          {activeTask.due_date_text && (
            <p className="mt-0.5 text-[11px] text-orange-600">
              deadline : {activeTask.due_date_text}
            </p>
          )}
        </div>
      )}
    </Link>
  )
}

function AccessBadges({ access }: { access: AccessInfo }) {
  let accountBadge: { label: string; cls: string }
  if (access.hasAccount) {
    accountBadge = { label: '✅ Compte créé', cls: 'bg-green-100 text-green-800' }
  } else if (access.invitationSent) {
    accountBadge = { label: '✉️ Invitation envoyée', cls: 'bg-orange-100 text-orange-700' }
  } else {
    accountBadge = { label: 'Pas encore', cls: 'bg-zinc-100 text-muted' }
  }

  const parentsBadge =
    access.parentCount > 0
      ? {
          label: `👨‍👩 ${access.parentCount}`,
          cls: 'bg-green-100 text-green-800',
        }
      : { label: '👨‍👩 —', cls: 'bg-zinc-100 text-muted' }

  const lastSignIn = access.lastSignInAt
  const lastSignInLabel = lastSignIn
    ? `🕒 ${formatRelative(lastSignIn)}`
    : '🕒 —'
  const lastSignInCls = lastSignIn
    ? 'bg-blue-50 text-blue-800'
    : 'bg-zinc-100 text-muted'

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span
        className={`rounded px-2 py-0.5 text-[10px] font-bold ${accountBadge.cls}`}
      >
        {accountBadge.label}
      </span>
      <span
        className={`rounded px-2 py-0.5 text-[10px] font-bold ${parentsBadge.cls}`}
      >
        {parentsBadge.label}
      </span>
      <span
        className={`rounded px-2 py-0.5 text-[10px] font-bold ${lastSignInCls}`}
      >
        {lastSignInLabel}
      </span>
    </div>
  )
}
