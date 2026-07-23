export type SheetMeta = {
  gender: 'Men' | 'Women'
  governing_body: 'NCAA' | 'NAIA' | 'NJCAA'
  division_tier: string | null
}

export function parseFileName(name: string): SheetMeta {
  const m = name.match(/^(Men|Women)['_]?s\s+Golf\s+(NCAA|NAIA|NJCAA)\s*(\d+)?/i)
  if (!m) throw new Error(`Cannot parse file name: ${name}`)
  const gender = (m[1].charAt(0).toUpperCase() +
    m[1].slice(1).toLowerCase()) as 'Men' | 'Women'
  const governing_body = m[2].toUpperCase() as 'NCAA' | 'NAIA' | 'NJCAA'
  const division_tier = m[3] ?? null
  return { gender, governing_body, division_tier }
}

export function deriveLegacyDivision(
  governing_body: string,
  division_tier: string | null
): string | null {
  if (governing_body === 'NCAA') {
    if (division_tier === '1') return 'D1'
    if (division_tier === '2') return 'D2'
    if (division_tier === '3') return 'D3'
  }
  if (governing_body === 'NAIA') return 'NAIA'
  if (governing_body === 'NJCAA') return 'JUCO'
  return null
}

export function parseCellInt(value: string | undefined | null): number | null {
  if (value == null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  const m = trimmed.match(/-?\d[\d\s,]*/)
  if (!m) return null
  const digitsOnly = m[0].replace(/[^\d-]/g, '')
  if (!digitsOnly || digitsOnly === '-') return null
  const n = parseInt(digitsOnly, 10)
  return Number.isNaN(n) ? null : n
}

export function parseCellBool(
  value: string | undefined | null
): boolean | null {
  if (value == null) return null
  const v = String(value).trim().toLowerCase()
  if (!v) return null
  if (v === 'oui' || v === 'yes' || v === 'true' || v === '1') return true
  if (v === 'non' || v === 'no' || v === 'false' || v === '0') return false
  return null
}

export function parseCellInt5(value: string | undefined | null): number | null {
  const n = parseCellInt(value)
  if (n == null) return null
  if (n < 0 || n > 5) return null
  return n
}

export function parseCellInt10(
  value: string | undefined | null
): number | null {
  const n = parseCellInt(value)
  if (n == null) return null
  if (n < 0 || n > 10) return null
  return n
}

export function findMajTab(tabs: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[\s/]/g, '')
  return tabs.find((t) => norm(t) === 'maj112025') ?? null
}

export function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

export function normalizeSchoolName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

const HEADER_MAPPERS: { match: (norm: string) => boolean; column: string }[] = [
  { match: (n) => n === 'schoolid', column: 'master_school_id' },
  { match: (n) => n.startsWith('rank'), column: 'ranking' },
  {
    match: (n) =>
      n.includes('univers') ||
      n.startsWith('nomu') ||
      n === 'school' ||
      n === 'name',
    column: 'name',
  },
  { match: (n) => n.startsWith('headcoach') || n === 'coach', column: 'coach_name' },
  {
    match: (n) => n.startsWith('email'),
    column: 'coach_email',
  },
  { match: (n) => n.startsWith('etat') || n === 'state', column: 'state_full' },
  {
    match: (n) => n.startsWith('ville') && n.includes('habitants'),
    column: 'nearby_city',
  },
  {
    match: (n) =>
      n.startsWith('distancedugolf') || n.startsWith('distancetogolf'),
    column: 'distance_to_golf_minutes',
  },
  {
    match: (n) =>
      n.startsWith('qualitedesdorms') || n.startsWith('dormsquality'),
    column: 'dorms_quality',
  },
  {
    match: (n) =>
      n.startsWith('infrastructuresindoor') || n.startsWith('indoor'),
    column: 'indoor_facilities',
  },
  {
    match: (n) =>
      n.startsWith('parcoursdentrainement') || n.startsWith('practice'),
    column: 'practice_courses',
  },
  {
    match: (n) => n === 'mentaliteducoach' || n === 'coachmentality',
    column: 'coach_mentality',
  },
  {
    match: (n) => n === 'avisagentsurlecoach' || n === 'agentopinion',
    column: 'agent_opinion_coach',
  },
  {
    match: (n) => n.startsWith('meteo') || n.startsWith('weather'),
    column: 'weather_rating',
  },
  {
    match: (n) => n.startsWith('budgetmini') || n.startsWith('minbudget'),
    column: 'min_budget_after_aid_usd',
  },
  {
    match: (n) => n.startsWith('facreligieuse') || n.startsWith('religious'),
    column: 'religious',
  },
]

export function findColumn(headerNorm: string): string | null {
  for (const m of HEADER_MAPPERS) {
    if (m.match(headerNorm)) return m.column
  }
  return null
}
