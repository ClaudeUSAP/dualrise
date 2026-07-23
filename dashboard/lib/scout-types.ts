// Client-safe SCOUT profile types & constants (no 'server-only' — these are
// imported by both the server fetch in scout-profile.ts and the client
// components ScoutScoringCard / ScoutResultsList).

export const SCORING_PERIODS = [
  'last_3',
  'last_5',
  'last_7',
  'last_10',
  'current_year',
  'all_time',
] as const
export type ScoringPeriod = (typeof SCORING_PERIODS)[number]

export const PERIOD_LABELS: Record<ScoringPeriod, string> = {
  last_3: 'Last 3',
  last_5: 'Last 5',
  last_7: 'Last 7',
  last_10: 'Last 10',
  current_year: 'This year',
  all_time: 'All-time',
}

export type ScoringCell = {
  raw: string | null // average score, e.g. "72.78"
  vsPar: string | null // e.g. "1.60"
  vsCR: string | null // e.g. "-11.20"
}
export type ScoringByPeriod = Record<ScoringPeriod, ScoringCell>

export type ScoutResult = {
  tournamentName: string | null
  date: string | null
  location: string | null
  position: string | null
  rounds: number[]
  totalScore: number | null
  vsPar: number | null
  vsCR: number | null
  /** Field size of the athlete's OWN event (gendered) for this result. Sourced
   *  from the result row's tournament_id — never an aggregate of Men + Women. */
  fieldSize: number | null
}

export type ScoutProfile = {
  athlete: Record<string, unknown>
  scoring: ScoringByPeriod
  recentResults: ScoutResult[]
  /** true when the athlete is already placed (committed / in_college / archived).
   *  Used to hide the section player-side; the raw status is never displayed. */
  placed: boolean
}
