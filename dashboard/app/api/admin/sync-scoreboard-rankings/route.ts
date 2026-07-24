import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const BASE = 'https://scoreboard.clippd.com'
const UA =
  'Mozilla/5.0 (compatible; DualRise-Sync/1.0; +https://dualrise.vercel.app)'

type Gender = 'Men' | 'Women'
type GoverningBody = 'NCAA' | 'NAIA' | 'NJCAA'
type Division = 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO'

type DivisionConfig = {
  gender: Gender
  governing_body: GoverningBody
  division: Division
  urlDiv: string
}

const DIVISIONS: DivisionConfig[] = [
  { gender: 'Men', governing_body: 'NCAA', division: 'D1', urlDiv: 'NCAA Division I' },
  { gender: 'Men', governing_body: 'NCAA', division: 'D2', urlDiv: 'NCAA Division II' },
  { gender: 'Men', governing_body: 'NCAA', division: 'D3', urlDiv: 'NCAA Division III' },
  { gender: 'Men', governing_body: 'NAIA', division: 'NAIA', urlDiv: 'NAIA' },
  { gender: 'Men', governing_body: 'NJCAA', division: 'JUCO', urlDiv: 'NJCAA I' },
  { gender: 'Men', governing_body: 'NJCAA', division: 'JUCO', urlDiv: 'NJCAA II' },
  { gender: 'Women', governing_body: 'NCAA', division: 'D1', urlDiv: 'NCAA Division I' },
  { gender: 'Women', governing_body: 'NCAA', division: 'D2', urlDiv: 'NCAA Division II' },
  { gender: 'Women', governing_body: 'NAIA', division: 'NAIA', urlDiv: 'NAIA' },
  { gender: 'Women', governing_body: 'NJCAA', division: 'JUCO', urlDiv: 'NJCAA I' },
  { gender: 'Women', governing_body: 'NJCAA', division: 'JUCO', urlDiv: 'NJCAA II' },
]

function currentSeason(): number {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear()
}

function checkAuth(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type ClippdRow = {
  schoolId: string
  schoolName: string
  rank: number
}

type ClippdResponse = {
  result?: string
  size?: number
  results?: Array<{
    schoolId: string
    schoolName: string
    rank: number
    divisionalRank?: number
  }>
}

async function fetchDivision(
  d: DivisionConfig,
  season: number
): Promise<ClippdRow[]> {
  const params = new URLSearchParams({
    rankingType: 'Team',
    gender: d.gender,
    division: d.urlDiv,
    season: String(season),
    limit: '1000',
  })
  const url = `${BASE}/api/rankings/leaderboard?${params}`
  const ref = `${BASE}/rankings/leaderboard?${params}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Referer: ref,
      Accept: 'application/json, text/plain, */*',
    },
  })
  if (!res.ok) {
    throw new Error(`${d.gender}/${d.urlDiv}: HTTP ${res.status}`)
  }
  const json = (await res.json()) as ClippdResponse
  return (json.results ?? []).map((r) => ({
    schoolId: r.schoolId,
    schoolName: r.schoolName,
    rank: r.rank,
  }))
}

async function handler(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  const { searchParams } = new URL(request.url)
  const seasonParam = searchParams.get('season')
  const season = seasonParam ? parseInt(seasonParam, 10) : currentSeason()

  const supabase = getAdmin()

  const divisionsProcessed: Array<{ key: string; rows: number }> = []
  const fetchErrors: string[] = []
  const unmatched: Array<{
    division: string
    team_name: string
    clippd_id: string
  }> = []
  let updated = 0

  type Scraped = { d: DivisionConfig; rows: ClippdRow[] }
  const settled = await Promise.allSettled(
    DIVISIONS.map(
      async (d): Promise<Scraped> => ({ d, rows: await fetchDivision(d, season) })
    )
  )

  const fetched: Scraped[] = []
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i]
    if (r.status === 'fulfilled') {
      fetched.push(r.value)
      divisionsProcessed.push({
        key: `${r.value.d.gender}/${r.value.d.urlDiv}`,
        rows: r.value.rows.length,
      })
    } else {
      const d = DIVISIONS[i]
      fetchErrors.push(
        `${d.gender}/${d.urlDiv}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`
      )
    }
  }

  // Group by (gender, governing_body, division) — merges NJCAA I + II under JUCO
  const grouped = new Map<string, ClippdRow[]>()
  for (const f of fetched) {
    const key = `${f.d.gender}|${f.d.governing_body}|${f.d.division}`
    const arr = grouped.get(key) ?? []
    arr.push(...f.rows)
    grouped.set(key, arr)
  }

  for (const [key, scrapedRows] of grouped) {
    const [gender, governing_body, division] = key.split('|')
    const { data: dbSchools, error } = await supabase
      .from('schools')
      .select('id, name, scoreboard_team_id')
      .eq('gender', gender)
      .eq('governing_body', governing_body)
      .eq('division', division)
    if (error) {
      fetchErrors.push(`DB lookup ${key}: ${error.message}`)
      continue
    }

    const byScoreboardId = new Map<number, { id: string; name: string }>()
    const byNormName = new Map<string, Array<{ id: string; name: string }>>()
    for (const s of (dbSchools ?? []) as Array<{
      id: string
      name: string
      scoreboard_team_id: number | null
    }>) {
      if (typeof s.scoreboard_team_id === 'number') {
        byScoreboardId.set(s.scoreboard_team_id, s)
      }
      const n = normalize(s.name)
      const arr = byNormName.get(n) ?? []
      arr.push(s)
      byNormName.set(n, arr)
    }

    const updates: Array<{
      id: string
      ranking: number
      scoreboard_team_id: number
    }> = []
    for (const row of scrapedRows) {
      const clippdId = parseInt(row.schoolId, 10)
      if (!Number.isFinite(clippdId)) continue

      let match = byScoreboardId.get(clippdId) ?? null
      if (!match) {
        const candidates = byNormName.get(normalize(row.schoolName))
        if (candidates && candidates.length === 1) match = candidates[0]
      }

      if (match) {
        updates.push({
          id: match.id,
          ranking: row.rank,
          scoreboard_team_id: clippdId,
        })
      } else {
        unmatched.push({
          division: key,
          team_name: row.schoolName,
          clippd_id: row.schoolId,
        })
      }
    }

    const BATCH = 20
    for (let i = 0; i < updates.length; i += BATCH) {
      const slice = updates.slice(i, i + BATCH)
      const results = await Promise.all(
        slice.map((u) =>
          supabase
            .from('schools')
            .update({
              ranking: u.ranking,
              scoreboard_team_id: u.scoreboard_team_id,
            })
            .eq('id', u.id)
        )
      )
      for (const r of results) {
        if (!r.error) updated++
        else fetchErrors.push(`Update failed: ${r.error.message}`)
      }
    }
  }

  return NextResponse.json({
    season,
    divisions_processed: divisionsProcessed,
    schools_updated: updated,
    unmatched_count: unmatched.length,
    unmatched: unmatched.slice(0, 100),
    fetch_errors: fetchErrors,
    duration_ms: Date.now() - t0,
  })
}

export const GET = handler
export const POST = handler
export const maxDuration = 60
