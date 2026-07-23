import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { sheets_v4 } from 'googleapis'
import { NextResponse } from 'next/server'
import { getSheets } from '@/lib/google'
import {
  findColumn,
  normalizeHeader,
  normalizeSchoolName,
} from '@/lib/sheet-parser'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

function checkAuth(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

type RgbColor = {
  red?: number | null
  green?: number | null
  blue?: number | null
}

function isGreen(color: RgbColor | undefined | null): boolean {
  if (!color) return false
  const r = color.red ?? 1
  const g = color.green ?? 1
  const b = color.blue ?? 1
  if (r > 0.95 && g > 0.95 && b > 0.95) return false
  return g > r && g > b && g > 0.4
}

type Gender = 'Men' | 'Women'

type Player = {
  id: string
  first_name: string
  last_name: string
  sheet_id: string
  gender: Gender | null
}

type SchoolLookup = {
  id: string
  master_school_id: string | null
  name: string
  gender: Gender | null
}

function pickByGender(
  candidates: SchoolLookup[],
  playerGender: Gender | null
): SchoolLookup | undefined {
  if (candidates.length === 0) return undefined
  if (!playerGender) return candidates[0]
  return candidates.find((s) => s.gender === playerGender)
}

type UnmatchedDebug = {
  raw: string
  normalized: string
  gender: Gender | null
  candidates_count: number
  candidates_same_gender: string[]
}

type PlayerResult = {
  player_id: string
  player_name: string
  green_count: number
  mapped_count: number
  inserted: number
  updated: number
  unmatched_universities?: string[]
  unmatched_debug?: UnmatchedDebug[]
  error?: string
}

async function syncPlayer(
  supabase: ReturnType<typeof getAdminClient>,
  sheets: sheets_v4.Sheets,
  schoolsByMasterId: Map<string, SchoolLookup[]>,
  schoolsByNormName: Map<string, SchoolLookup[]>,
  sameGenderCandidatesCount: { Men: number; Women: number },
  player: Player
): Promise<PlayerResult> {
  if (!player.gender) {
    return {
      player_id: player.id,
      player_name: `${player.first_name} ${player.last_name}`,
      green_count: 0,
      mapped_count: 0,
      inserted: 0,
      updated: 0,
      error: 'player.gender is null — skip',
    }
  }
  const baseResult: PlayerResult = {
    player_id: player.id,
    player_name: `${player.first_name} ${player.last_name}`,
    green_count: 0,
    mapped_count: 0,
    inserted: 0,
    updated: 0,
  }

  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: player.sheet_id,
      includeGridData: false,
    })
    const allSheets = meta.data.sheets ?? []
    const visibleTabs = allSheets
      .map((s) => s.properties)
      .filter((p): p is sheets_v4.Schema$SheetProperties => !!p)
      .filter((p) => !p.hidden)
      .filter((p) => (p.title ?? '').toLowerCase() !== 'master_mirror')
      .map((p) => p.title!)
      .filter(Boolean)

    if (visibleTabs.length === 0) {
      return { ...baseResult, error: 'no visible tabs' }
    }

    const ranges = visibleTabs.map((t) => `'${t.replace(/'/g, "''")}'!A1:Z500`)
    const dataRes = await sheets.spreadsheets.get({
      spreadsheetId: player.sheet_id,
      ranges,
      includeGridData: true,
      fields:
        'sheets(properties(title),data(rowData(values(formattedValue,effectiveFormat(backgroundColor,backgroundColorStyle/rgbColor)))))',
    })

    const matchedSchools = new Map<string, SchoolLookup>()
    const unmatchedUniversities: string[] = []
    const unmatchedDebug: UnmatchedDebug[] = []
    let greenSeen = 0

    for (const tab of dataRes.data.sheets ?? []) {
      const rowData = tab.data?.[0]?.rowData
      if (!rowData) continue

      let headerRowIdx = -1
      let schoolIdCol = -1
      let universityCol = -1
      const lookahead = Math.min(5, rowData.length)
      for (let i = 0; i < lookahead; i++) {
        const row = rowData[i]
        if (!row.values) continue
        let localSchoolId = -1
        let localUniv = -1
        for (let j = 0; j < row.values.length; j++) {
          const text = row.values[j].formattedValue ?? ''
          const col = findColumn(normalizeHeader(text))
          if (col === 'master_school_id' && localSchoolId < 0) localSchoolId = j
          if (col === 'name' && localUniv < 0) localUniv = j
        }
        if (localSchoolId >= 0 || localUniv >= 0) {
          headerRowIdx = i
          schoolIdCol = localSchoolId
          universityCol = localUniv
          break
        }
      }
      if (schoolIdCol < 0 && universityCol < 0) continue

      for (let i = headerRowIdx + 1; i < rowData.length; i++) {
        const row = rowData[i]
        if (!row.values) continue
        const idCell = schoolIdCol >= 0 ? row.values[schoolIdCol] : undefined
        const uniCell =
          universityCol >= 0 ? row.values[universityCol] : undefined
        const sid = (idCell?.formattedValue ?? '').trim()
        const uniName = (uniCell?.formattedValue ?? '').trim()
        if (!sid && !uniName) continue

        const colorCell = uniCell ?? idCell
        if (!colorCell) continue
        const bg =
          colorCell.effectiveFormat?.backgroundColor ??
          colorCell.effectiveFormat?.backgroundColorStyle?.rgbColor ??
          null
        if (!isGreen(bg)) continue

        greenSeen++
        let school: SchoolLookup | undefined
        if (sid) {
          school = pickByGender(schoolsByMasterId.get(sid) ?? [], player.gender)
        }
        if (!school && uniName) {
          const norm = normalizeSchoolName(uniName)
          if (norm) {
            school = pickByGender(
              schoolsByNormName.get(norm) ?? [],
              player.gender
            )
          }
        }
        if (school) {
          matchedSchools.set(school.id, school)
        } else if (uniName) {
          unmatchedUniversities.push(uniName)
          const norm = normalizeSchoolName(uniName)
          const allForKey = schoolsByNormName.get(norm) ?? []
          const sameGenderCandidates = allForKey
            .filter((s) => s.gender === player.gender)
            .map((s) => s.name)
          // Also surface near-matches (first token in common) when the exact-norm lookup is empty
          const firstToken = norm.split(' ')[0]
          let nearMatches: string[] = []
          if (allForKey.length === 0 && firstToken && firstToken.length >= 4) {
            for (const [k, arr] of schoolsByNormName.entries()) {
              if (k.startsWith(firstToken)) {
                for (const s of arr) {
                  if (s.gender === player.gender) nearMatches.push(s.name)
                }
              }
              if (nearMatches.length >= 5) break
            }
            nearMatches = nearMatches.slice(0, 5)
          }
          const candidatesCount = player.gender
            ? sameGenderCandidatesCount[player.gender]
            : 0
          unmatchedDebug.push({
            raw: uniName,
            normalized: norm,
            gender: player.gender,
            candidates_count: candidatesCount,
            candidates_same_gender:
              sameGenderCandidates.length > 0 ? sameGenderCandidates : nearMatches,
          })
        }
      }
    }

    const matched = Array.from(matchedSchools.values())

    baseResult.green_count = greenSeen
    baseResult.mapped_count = matched.length
    if (unmatchedUniversities.length > 0) {
      baseResult.unmatched_universities = unmatchedUniversities
      baseResult.unmatched_debug = unmatchedDebug
    }

    if (matched.length === 0) return baseResult

    const { data: existing, error: existingErr } = await supabase
      .from('school_assignments')
      .select('school_id')
      .eq('player_id', player.id)
    if (existingErr) return { ...baseResult, error: existingErr.message }

    const existingSet = new Set((existing ?? []).map((e) => e.school_id))

    const newRows = matched
      .filter((s) => !existingSet.has(s.id))
      .map((s) => ({
        player_id: player.id,
        school_id: s.id,
        stage: 'interested',
        sync_source: 'sheet_auto',
        last_synced_at: new Date().toISOString(),
      }))

    const updateIds = matched
      .filter((s) => existingSet.has(s.id))
      .map((s) => s.id)

    if (newRows.length > 0) {
      const { error: insertErr, data: inserted } = await supabase
        .from('school_assignments')
        .insert(newRows)
        .select('id')
      if (insertErr) return { ...baseResult, error: insertErr.message }
      baseResult.inserted = inserted?.length ?? 0
    }

    if (updateIds.length > 0) {
      const { error: updateErr } = await supabase
        .from('school_assignments')
        .update({
          sync_source: 'sheet_auto',
          last_synced_at: new Date().toISOString(),
        })
        .eq('player_id', player.id)
        .in('school_id', updateIds)
      if (updateErr) return { ...baseResult, error: updateErr.message }
      baseResult.updated = updateIds.length
    }

    return baseResult
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ...baseResult, error: msg }
  }
}

async function debugDumpSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    includeGridData: false,
  })
  const tabTitles = (meta.data.sheets ?? [])
    .map((s) => ({
      title: s.properties?.title,
      hidden: s.properties?.hidden ?? false,
    }))

  const visibleTabs = tabTitles
    .filter((t) => !t.hidden)
    .filter((t) => (t.title ?? '').toLowerCase() !== 'master_mirror')
    .map((t) => t.title!)
    .filter(Boolean)

  if (visibleTabs.length === 0) return { tabTitles, dumps: [] }

  const ranges = visibleTabs.map((t) => `'${t.replace(/'/g, "''")}'!A1:Z30`)
  const dataRes = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges,
    includeGridData: true,
    fields:
      'sheets(properties(title),data(rowData(values(formattedValue,effectiveFormat(backgroundColor,backgroundColorStyle)))))',
  })

  const dumps = (dataRes.data.sheets ?? []).map((tab) => {
    const rows = (tab.data?.[0]?.rowData ?? []).map((r, idx) => ({
      rowIdx: idx,
      cells: (r.values ?? []).slice(0, 6).map((c) => ({
        value: c.formattedValue ?? null,
        bg: c.effectiveFormat?.backgroundColor ?? null,
        bgStyle: c.effectiveFormat?.backgroundColorStyle ?? null,
      })),
    }))
    return { tab: tab.properties?.title ?? null, rows }
  })

  return { tabTitles, dumps }
}

async function handler(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const debugSheetId = searchParams.get('debug_sheet')
  // Optional CSV filter of player UUIDs. When provided, sync only those
  // players (still subject to having a sheet_id). When omitted (e.g. the
  // daily cron), sync every active sheet — original behavior.
  const playerIdsFilter = (searchParams.get('player_ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  try {
    const sheets = getSheets()
    const supabase = getAdminClient()

    if (debugSheetId) {
      const dump = await debugDumpSheet(sheets, debugSheetId)
      return NextResponse.json({ spreadsheetId: debugSheetId, ...dump })
    }


    // Supabase / PostgREST default max-rows is 1000 — schools has ~1.4k entries,
    // so a plain .select() silently drops anything sorted past row 1000 (typically
    // the NJCAA/NAIA tail). Paginate to fetch them all.
    const allSchools: Array<{
      id: string
      master_school_id: string | null
      name: string
      gender: string | null
    }> = []
    const PAGE = 1000
    for (let from = 0; from < 50_000; from += PAGE) {
      const { data, error } = await supabase
        .from('schools')
        .select('id, master_school_id, name, gender')
        .range(from, from + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      allSchools.push(...data)
      if (data.length < PAGE) break
    }
    const schools = allSchools
    const totalSchoolsLoaded = allSchools.length

    const schoolsByMasterId = new Map<string, SchoolLookup[]>()
    const schoolsByNormName = new Map<string, SchoolLookup[]>()
    const sameGenderCandidatesCount = { Men: 0, Women: 0 }
    for (const s of schools ?? []) {
      const lookup: SchoolLookup = {
        id: s.id,
        master_school_id: s.master_school_id ?? null,
        name: s.name,
        gender: (s.gender ?? null) as Gender | null,
      }
      if (lookup.gender === 'Men') sameGenderCandidatesCount.Men++
      if (lookup.gender === 'Women') sameGenderCandidatesCount.Women++
      if (s.master_school_id) {
        const arr = schoolsByMasterId.get(s.master_school_id) ?? []
        arr.push(lookup)
        schoolsByMasterId.set(s.master_school_id, arr)
      }
      const norm = normalizeSchoolName(s.name)
      if (norm) {
        const arr = schoolsByNormName.get(norm) ?? []
        arr.push(lookup)
        schoolsByNormName.set(norm, arr)
      }
    }

    let playersQuery = supabase
      .from('players')
      .select('id, first_name, last_name, sheet_id, gender')
      .not('sheet_id', 'is', null)
    if (playerIdsFilter.length > 0) {
      playersQuery = playersQuery.in('id', playerIdsFilter)
    }
    const { data: players, error: playersErr } = await playersQuery
    if (playersErr) throw playersErr

    const validPlayers = (players ?? []).filter(
      (p): p is Player => typeof p.sheet_id === 'string' && p.sheet_id.length > 0
    )

    const results: PlayerResult[] = []
    for (const p of validPlayers) {
      const r = await syncPlayer(
        supabase,
        sheets,
        schoolsByMasterId,
        schoolsByNormName,
        sameGenderCandidatesCount,
        p
      )
      results.push(r)
      console.log(
        `[sync] ${r.player_name} → green=${r.green_count} mapped=${r.mapped_count} inserted=${r.inserted} updated=${r.updated}${r.error ? ` ERROR=${r.error}` : ''}`
      )
    }

    const totals = results.reduce(
      (acc, r) => ({
        playersProcessed: acc.playersProcessed + 1,
        assignmentsUpserted: acc.assignmentsUpserted + r.inserted + r.updated,
        newAssignments: acc.newAssignments + r.inserted,
        unchanged: acc.unchanged + r.updated,
      }),
      { playersProcessed: 0, assignmentsUpserted: 0, newAssignments: 0, unchanged: 0 }
    )
    const errors = results.filter((r) => r.error).map((r) => `${r.player_name}: ${r.error}`)

    return NextResponse.json({
      ...totals,
      total_schools_loaded: totalSchoolsLoaded,
      errors,
      results,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('sync-player-sheets error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
// Hobby plan default is 10s for routes / 60s for crons. Raise to 60s for
// the manual-trigger batches so a single ~15-player batch fits comfortably.
export const maxDuration = 60
