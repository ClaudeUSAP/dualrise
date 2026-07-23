import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getSheets } from '@/lib/google'

// Agent payment amounts/paid flags are NOT synced from the sheet anymore —
// the dashboard is the source of truth. Editable by founders in PlayerCRMSection.

const CLIENTS_PIPE_SHEET_ID = '1ovJoiLI-cYd_pLMFVmC486jHMAHr8XmTH1i2U71NoSc'
const FICHE_INFO_SHEET_ID = '1WKrT_q1qHcQKJJ2b_Ltpo8OgbEiX6XXuDBu1sUfzP4I'
const SKIP_SCHOOLS = new Set(['will not go to the us'])

function getAdminSupabase() {
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

function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '')
}

function findHeaderIndex(
  headers: string[],
  predicates: ((norm: string) => boolean)[]
): number {
  for (let i = 0; i < headers.length; i++) {
    const n = normalizeHeader(String(headers[i] ?? ''))
    if (predicates.some((p) => p(n))) return i
  }
  return -1
}

const CLASS_RE = /^\s*(20\d{2})\s+(gar[cç]ons?|filles?|boys?|girls?)\s*[-–—]?\s*$/i

function parseClass(
  value: string
): { year: number; gender: 'Men' | 'Women'; label: string } | null {
  if (!value) return null
  const m = value.match(CLASS_RE)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const lc = m[2].toLowerCase()
  const gender =
    lc.startsWith('garc') || lc.startsWith('garç') || lc.startsWith('boy')
      ? 'Men'
      : 'Women'
  return { year, gender, label: value.trim() }
}

function parsePlayerName(
  value: string
): { first_name: string; last_name: string } | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parts = trimmed.split(/\s+/)
  if (parts.length < 2) return null
  const first_name = parts[0]
  const last_name = parts.slice(1).join(' ')
  return { first_name, last_name }
}

function pickFirstAgentName(value: string): string | null {
  if (!value) return null
  const first = value.split(/[/&,]/)[0].trim()
  return first || null
}

type PendingInsert = {
  first_name: string
  last_name: string
  email: string | null
  graduation_year: number
  class_year_label: string | null
  gender: 'Men' | 'Women'
  agent_first_name: string | null
  agent_id: string | null
  email_source: string | null
}

async function runSync(debugHeaders: boolean) {
  const sheets = getSheets()
  const supabase = getAdminSupabase()

  const pipeRes = await sheets.spreadsheets.values.get({
    spreadsheetId: CLIENTS_PIPE_SHEET_ID,
    range: 'A1:Z2000',
  })
  const pipeRows = (pipeRes.data.values ?? []) as string[][]
  const pipeHeaders = pipeRows[0] ?? []

  const ficheRes = await sheets.spreadsheets.values.get({
    spreadsheetId: FICHE_INFO_SHEET_ID,
    range: 'A1:Z5000',
  })
  const ficheRows = (ficheRes.data.values ?? []) as string[][]
  const ficheHeaders = ficheRows[0] ?? []

  const playerColPipe = findHeaderIndex(pipeHeaders, [
    (n) => n === 'player' || n === 'players' || n === 'joueur' || n === 'name',
  ])
  const classColPipe = findHeaderIndex(pipeHeaders, [
    (n) => n === 'class' || n === 'classe' || n === 'promotion',
  ])
  const schoolColPipe = findHeaderIndex(pipeHeaders, [
    (n) => n === 'school' || n === 'fac' || n === 'university' || n === 'college',
  ])
  const agentColPipe = findHeaderIndex(pipeHeaders, [
    (n) => n === 'agents' || n === 'agent',
  ])

  const ficheEmailCol = findHeaderIndex(ficheHeaders, [
    (n) => n === 'adresseemail' || n === 'email' || n === 'mail',
  ])
  const ficheNameCol = findHeaderIndex(ficheHeaders, [
    (n) =>
      n.startsWith('prenom') ||
      n === 'prenometnom' ||
      n === 'nom' ||
      n === 'fullname' ||
      n === 'name',
  ])

  if (debugHeaders) {
    return NextResponse.json({
      pipe: {
        headers: pipeHeaders,
        playerCol: playerColPipe,
        classCol: classColPipe,
        schoolCol: schoolColPipe,
        agentCol: agentColPipe,
      },
      fiche: {
        headers: ficheHeaders,
        emailCol: ficheEmailCol,
        nameCol: ficheNameCol,
      },
    })
  }

  if (playerColPipe < 0 || classColPipe < 0) {
    return NextResponse.json(
      {
        error: 'cannot find Player or Class column in Clients-Pipe',
        pipeHeaders,
      },
      { status: 500 }
    )
  }

  const ficheByName = new Map<string, string>()
  if (ficheNameCol >= 0 && ficheEmailCol >= 0) {
    for (let i = 1; i < ficheRows.length; i++) {
      const row = ficheRows[i]
      const name = (row?.[ficheNameCol] ?? '').trim()
      const email = (row?.[ficheEmailCol] ?? '').trim()
      if (!name || !email) continue
      const key = normalizeName(name)
      if (key && !ficheByName.has(key)) ficheByName.set(key, email)
    }
  }

  const { data: agents } = await supabase
    .from('agents')
    .select('id, first_name, last_name')
  const agentByFirstName = new Map<string, { id: string; full: string }>()
  for (const a of agents ?? []) {
    const key = normalizeName(a.first_name)
    if (!agentByFirstName.has(key)) {
      agentByFirstName.set(key, {
        id: a.id,
        full: `${a.first_name} ${a.last_name}`,
      })
    }
  }

  const { data: existingPlayers } = await supabase
    .from('players')
    .select('id, first_name, last_name, graduation_year')
  const existingPlayerKey = new Set(
    (existingPlayers ?? []).map(
      (p) =>
        `${normalizeName(p.first_name)}|${normalizeName(p.last_name)}|${p.graduation_year}`
    )
  )
  const { data: existingPending } = await supabase
    .from('pending_player_invitations')
    .select('first_name, last_name, graduation_year, status')
    .neq('status', 'declined')
  const existingPendingKey = new Set(
    (existingPending ?? []).map(
      (p) =>
        `${normalizeName(p.first_name)}|${normalizeName(p.last_name)}|${p.graduation_year}`
    )
  )

  let currentClass: { year: number; gender: 'Men' | 'Women'; label: string } | null = null
  let playersInPipe = 0
  let skippedAlreadyExists = 0
  let skippedNoEmail = 0
  let skippedAmbiguous = 0
  const toInsert: PendingInsert[] = []
  const errors: string[] = []

  for (let i = 1; i < pipeRows.length; i++) {
    const row = pipeRows[i] ?? []
    const playerCell = (row[playerColPipe] ?? '').trim()
    const classCell = (row[classColPipe] ?? '').trim()
    const schoolCell =
      schoolColPipe >= 0 ? (row[schoolColPipe] ?? '').trim() : ''
    const agentCell = agentColPipe >= 0 ? (row[agentColPipe] ?? '').trim() : ''

    const parsedClass = parseClass(classCell)
    if (parsedClass) {
      currentClass = parsedClass
    }
    if (!playerCell) continue
    if (/^\d/.test(playerCell)) continue
    if (/total/i.test(playerCell)) continue

    const meta = parseClass(classCell) ?? currentClass
    if (!meta) continue
    if (meta.year !== 2027 && meta.year !== 2028) continue

    const lcSchool = schoolCell.toLowerCase()
    if (SKIP_SCHOOLS.has(lcSchool)) continue

    const name = parsePlayerName(playerCell)
    if (!name) continue

    playersInPipe++

    const dupKey = `${normalizeName(name.first_name)}|${normalizeName(name.last_name)}|${meta.year}`

    if (existingPlayerKey.has(dupKey)) {
      skippedAlreadyExists++
      continue
    }
    if (existingPendingKey.has(dupKey)) {
      skippedAlreadyExists++
      continue
    }

    const fullKey = normalizeName(`${name.first_name} ${name.last_name}`)
    const reverseKey = normalizeName(`${name.last_name} ${name.first_name}`)
    const email =
      ficheByName.get(fullKey) ?? ficheByName.get(reverseKey) ?? null

    if (!email) skippedNoEmail++

    const agentFirstRaw = pickFirstAgentName(agentCell)
    let agentId: string | null = null
    if (agentFirstRaw) {
      const normRaw = normalizeName(agentFirstRaw)
      const matches = (agents ?? []).filter((a) => {
        const normFirst = normalizeName(a.first_name)
        const normFull = normalizeName(`${a.first_name} ${a.last_name}`)
        return normFirst === normRaw || normFull === normRaw
      })
      if (matches.length === 1) {
        agentId = matches[0].id
      } else if (matches.length > 1) {
        agentId = matches[0].id
        errors.push(
          `Ambiguous agent first name "${agentFirstRaw}" for ${name.first_name} ${name.last_name} — picked ${matches[0].first_name} ${matches[0].last_name}`
        )
        skippedAmbiguous++
      }
    }

    toInsert.push({
      first_name: name.first_name,
      last_name: name.last_name,
      email,
      graduation_year: meta.year,
      class_year_label: meta.label,
      gender: meta.gender,
      agent_first_name: agentFirstRaw,
      agent_id: agentId,
      email_source: email ? 'fiche_info' : 'missing',
    })
  }

  let insertedCount = 0
  if (toInsert.length > 0) {
    const { data: inserted, error: insertErr } = await supabase
      .from('pending_player_invitations')
      .upsert(toInsert, {
        onConflict: 'first_name,last_name,graduation_year',
        ignoreDuplicates: true,
      })
      .select('id')
    if (insertErr) {
      errors.push(`Bulk upsert failed: ${insertErr.message}`)
    } else {
      insertedCount = inserted?.length ?? 0
    }
  }

  return NextResponse.json({
    playersInPipe,
    newInvitations: insertedCount,
    skippedAlreadyExists,
    skippedNoEmail,
    skippedAmbiguousAgent: skippedAmbiguous,
    errors,
  })
}

async function handler(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const debug = url.searchParams.get('debug') === 'headers'
  try {
    return await runSync(debug)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('sync-clients-pipe error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const GET = handler
export const POST = handler
