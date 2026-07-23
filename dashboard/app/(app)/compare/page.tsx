import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewerMember } from '@/lib/get-viewer-player'
import {
  getInstagramUrl,
  getNicheUrl,
  getScoreboardUrl,
  getWebsiteUrl,
} from '@/lib/school-urls'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const EUR_FMT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

type SchoolRow = {
  id: string
  name: string
  gender: string | null
  division: string | null
  governing_body: string | null
  ranking: number | null
  state_code: string | null
  state_full: string | null
  city: string | null
  coach_name: string | null
  coach_email: string | null
  website_url: string | null
  scoreboard_url: string | null
  niche_url: string | null
  instagram_url: string | null
  distance_to_golf_minutes: number | null
  indoor_facilities: boolean | null
  weather_rating: number | null
  dorms_quality: number | null
  min_budget_after_aid_usd: number | null
  tuition_min_usd: number | null
  tuition_max_usd: number | null
  religious: string | null
}

function toUrlInput(s: SchoolRow) {
  return {
    name: s.name,
    gender: s.gender,
    niche_url: s.niche_url,
    website_url: s.website_url,
    instagram_url: s.instagram_url,
    scoreboard_url: s.scoreboard_url,
  }
}

function SmartLink({
  url,
  isDirect,
  label,
}: {
  url: string
  isDirect: boolean
  label: string
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={isDirect ? label : `Rechercher ${label} sur Google`}
      className={
        isDirect
          ? 'font-bold text-orange underline decoration-orange/40 underline-offset-2 hover:text-[#C11722]'
          : 'text-muted underline decoration-dotted decoration-muted/60 underline-offset-2 hover:text-orange'
      }
    >
      {isDirect ? label : `🔍 ${label}`} ↗
    </a>
  )
}

function fmtStars(value: number | null) {
  if (value == null) return <span className="text-muted">—</span>
  const n = Math.max(0, Math.min(5, Math.round(value)))
  return <span>{'⭐'.repeat(n)}</span>
}

function fmtBool(v: boolean | null) {
  if (v == null) return <span className="text-muted">—</span>
  return v ? '✅' : '❌'
}

function fmtBudget(min: number | null, max: number | null) {
  if (min == null && max == null) return <span className="text-muted">—</span>
  if (min != null && max != null && min !== max) {
    return `${EUR_FMT.format(min)}–${EUR_FMT.format(max)} $`
  }
  return `${EUR_FMT.format(min ?? max ?? 0)} $`
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const { ids: idsParam } = await searchParams
  const ids = (idsParam ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  if (ids.length < 2) {
    redirect('/compare/select')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await getViewerMember(supabase)
  if (!member) redirect('/schools')

  // Fetch schools — RLS lets any authenticated user read. Also fetch player's
  // own assignments to display the pipeline stage.
  const [{ data: rows }, { data: pipeline }] = await Promise.all([
    supabase
      .from('schools')
      .select(
        'id, name, gender, division, governing_body, ranking, state_code, state_full, city, coach_name, coach_email, website_url, scoreboard_url, niche_url, instagram_url, distance_to_golf_minutes, indoor_facilities, weather_rating, dorms_quality, min_budget_after_aid_usd, tuition_min_usd, tuition_max_usd, religious'
      )
      .in('id', ids),
    supabase
      .from('school_assignments')
      .select('school_id, stage')
      .eq('player_id', member.player_id)
      .in('school_id', ids),
  ])

  const stageById = new Map(
    ((pipeline ?? []) as Array<{ school_id: string; stage: string }>).map(
      (p) => [p.school_id, p.stage]
    )
  )

  // Order schools according to ids param order
  const schools: SchoolRow[] = []
  for (const id of ids) {
    const s = (rows ?? []).find((r) => r.id === id) as SchoolRow | undefined
    if (s) schools.push(s)
  }

  if (schools.length < 2) {
    redirect('/compare/select')
  }

  // Build agent mailto for the CTA
  const { data: player } = await supabase
    .from('players')
    .select('first_name, last_name, agent_id')
    .eq('id', member.player_id)
    .single()
  let agentEmail: string | null = null
  if (player?.agent_id) {
    const { data: agent } = await supabase
      .from('agents')
      .select('email')
      .eq('id', player.agent_id)
      .maybeSingle()
    agentEmail = agent?.email ?? null
  }

  const namesJoined = schools.map((s) => s.name).join(' / ')
  const mailto = agentEmail
    ? `mailto:${agentEmail}?subject=${encodeURIComponent(`Comparaison ${namesJoined} — peut-on en discuter ?`)}`
    : null

  type RowDef = {
    label: string
    render: (s: SchoolRow) => React.ReactNode
  }

  const ROWS: RowDef[] = [
    { label: 'Division', render: (s) => `${s.governing_body ?? ''} ${s.division ?? ''}`.trim() || '—' },
    {
      label: 'Ranking',
      render: (s) =>
        s.ranking != null && s.ranking < 1000 ? `#${s.ranking}` : '—',
    },
    {
      label: 'État',
      render: (s) => s.state_full ?? s.state_code ?? '—',
    },
    { label: 'Ville', render: (s) => s.city ?? '—' },
    { label: 'Coach', render: (s) => s.coach_name ?? '—' },
    {
      label: 'Site officiel',
      render: (s) => {
        const r = getWebsiteUrl(toUrlInput(s))
        return <SmartLink url={r.url} isDirect={r.isDirect} label="Site" />
      },
    },
    {
      label: 'Scoreboard',
      render: (s) => {
        const r = getScoreboardUrl(toUrlInput(s))
        return <SmartLink url={r.url} isDirect={r.isDirect} label="Scoreboard" />
      },
    },
    {
      label: 'Niche',
      render: (s) => {
        const r = getNicheUrl(toUrlInput(s))
        return <SmartLink url={r.url} isDirect={r.isDirect} label="Niche" />
      },
    },
    {
      label: 'Instagram',
      render: (s) => {
        const r = getInstagramUrl(toUrlInput(s))
        return <SmartLink url={r.url} isDirect={r.isDirect} label="Insta" />
      },
    },
    {
      label: 'Budget min après aide',
      render: (s) =>
        s.min_budget_after_aid_usd != null
          ? `${EUR_FMT.format(s.min_budget_after_aid_usd)} $`
          : '—',
    },
    {
      label: 'Tuition',
      render: (s) => fmtBudget(s.tuition_min_usd, s.tuition_max_usd),
    },
    {
      label: 'Distance to golf',
      render: (s) =>
        s.distance_to_golf_minutes != null
          ? `${s.distance_to_golf_minutes} min`
          : '—',
    },
    {
      label: 'Indoor facilities',
      render: (s) => fmtBool(s.indoor_facilities),
    },
    { label: 'Climat / Météo', render: (s) => fmtStars(s.weather_rating) },
    { label: 'Qualité des dorms', render: (s) => fmtStars(s.dorms_quality) },
    { label: 'Religieuse', render: (s) => s.religious ?? '—' },
    {
      label: 'Stage pipeline',
      render: (s) => stageById.get(s.id) ?? '—',
    },
  ]

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/compare/select"
          className="text-xs font-bold uppercase tracking-wide text-muted hover:text-orange"
        >
          ← Changer ma sélection
        </Link>
        {mailto && (
          <a
            href={mailto}
            className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-[#C11722]"
          >
            ✉️ Discuter avec mon agent
          </a>
        )}
      </div>

      <header className="mb-6">
        <h1 className="display text-2xl text-navy sm:text-3xl">
          Comparer mes facs
        </h1>
        <p className="mt-1 text-sm text-muted">
          {schools.length} facs côte à côte.
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream-2 text-left">
              <th className="border-b border-line px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                Critère
              </th>
              {schools.map((s) => (
                <th
                  key={s.id}
                  className="border-b border-line px-3 py-2 align-top text-left"
                >
                  <div className="text-sm font-bold text-navy">{s.name}</div>
                  <div className="text-[11px] text-muted">
                    {s.governing_body ?? ''} {s.division ?? ''}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <td className="px-3 py-2 align-top text-[11px] font-bold uppercase tracking-wide text-muted">
                  {row.label}
                </td>
                {schools.map((s) => (
                  <td key={s.id} className="px-3 py-2 align-top text-navy">
                    {row.render(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
