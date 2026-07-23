import 'server-only'
import { getScoutServerClient } from './scout-server'
import {
  SCORING_PERIODS,
  type ScoringByPeriod,
  type ScoringCell,
  type ScoringPeriod,
  type ScoutResult,
  type ScoutProfile,
} from './scout-types'

export type {
  ScoringPeriod,
  ScoringCell,
  ScoringByPeriod,
  ScoutResult,
  ScoutProfile,
} from './scout-types'
export { PERIOD_LABELS } from './scout-types'

/**
 * Read-only projection of a SCOUT athlete for the player dashboard.
 *
 * ONLY the columns a player/parent is allowed to see are listed here. Internal /
 * coach-pitch fields are NEVER selected — defense in depth on top of the
 * server-only gating. Excluded on purpose: strengths, areas_of_improvement,
 * why_good_recruit, something_else_coaches_know, other_interests (coach pitch),
 * preferences_division/region, star_rating, status, committed*, virement_*_eur,
 * crm_status, agent_id, agent_secondary_id, signing_season.
 */
// Per-period scoring columns all exist in SCOUT (≈140/142 athletes). The global
// `scoring_average` / `scoring_average_vs_par` columns are mostly empty and must
// NOT be used for display. vs CR all-time lives in scoring_average_vs_course_rating.
const ATHLETE_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'status', // SERVER-SIDE gating only (hide section when placed) — never displayed
  // Scoring — raw average per period
  'scoring_avg_last_3_raw',
  'scoring_avg_last_5_raw',
  'scoring_avg_last_7_raw',
  'scoring_avg_last_10_raw',
  'scoring_avg_current_year_raw',
  'scoring_avg_all_time_raw',
  // Scoring — vs par per period
  'scoring_avg_vs_par_last_3',
  'scoring_avg_vs_par_last_5',
  'scoring_avg_vs_par_last_7',
  'scoring_avg_vs_par_last_10',
  'scoring_avg_vs_par_current_year',
  'scoring_avg_vs_par_all_time',
  // Scoring — vs course rating per period (no _all_time column; use the global one)
  'scoring_avg_vs_cr_last_3',
  'scoring_avg_vs_cr_last_5',
  'scoring_avg_vs_cr_last_7',
  'scoring_avg_vs_cr_last_10',
  'scoring_avg_vs_cr_current_year',
  'scoring_average_vs_course_rating',
  'best_recent_scoring_avg',
  'best_recent_period',
  // Rankings
  'french_adult_ranking',
  'french_ranking_in_their_class',
  'wagr_ranking',
  // Distances / physical
  'drive_distance_carry',
  'seven_iron_distance_carry',
  'max_club_head_speed',
  // Academic
  'academic_gpa',
  'sat',
  'duolingo',
  'toefl',
  'intended_majors',
  // Profile
  'golf_club_team',
  'swing_coach',
  'profile_photo',
  'video_links',
].join(', ')

type JoinedTournament = {
  name: string | null
  start_date: string | null
  end_date: string | null
  location: string | null
  course_par: number | string | null
  course_rating: number | string | null
  field_size: number | string | null
}

type JoinedResult = {
  total_score: number | string | null
  position: number | null
  position_text: string | null
  rounds: string | null
  field_size: number | string | null
  // Supabase types a foreign relation as an array; at runtime a to-one relation
  // comes back as a single object. Accept both.
  tournaments: JoinedTournament | JoinedTournament[] | null
}

function oneTournament(
  t: JoinedTournament | JoinedTournament[] | null
): JoinedTournament | null {
  if (!t) return null
  return Array.isArray(t) ? (t[0] ?? null) : t
}

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Parse the comma-separated rounds string ("72,74,71") into numbers. */
function parseRounds(rounds: string | null): number[] {
  if (!rounds) return []
  return rounds
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0)
}

function buildScoring(a: Record<string, unknown>): ScoringByPeriod {
  const cell = (period: ScoringPeriod): ScoringCell => ({
    raw: str(a[`scoring_avg_${period}_raw`]),
    vsPar: str(a[`scoring_avg_vs_par_${period}`]),
    vsCR:
      period === 'all_time'
        ? str(a['scoring_average_vs_course_rating'])
        : str(a[`scoring_avg_vs_cr_${period}`]),
  })
  return SCORING_PERIODS.reduce((acc, p) => {
    acc[p] = cell(p)
    return acc
  }, {} as ScoringByPeriod)
}

/**
 * Fetch the SCOUT profile + recent tournament results for a single athlete.
 * `scoutAthleteId` MUST be the viewer's own `players.scout_athlete_id`
 * (isolation is enforced by the caller). Returns null when there is no linked
 * athlete or when SCOUT env vars are not configured — caller shows
 * "profil en préparation".
 */
export async function getScoutProfile(
  scoutAthleteId: string | null | undefined
): Promise<ScoutProfile | null> {
  if (!scoutAthleteId) return null

  const scout = getScoutServerClient()
  if (!scout) return null

  const { data: athlete, error } = await scout
    .from('athletes')
    .select(ATHLETE_COLUMNS)
    .eq('id', scoutAthleteId)
    .maybeSingle()

  if (error || !athlete) {
    if (error) console.error('SCOUT athlete fetch failed:', error.message)
    return null
  }

  const athleteRow = athlete as unknown as Record<string, unknown>

  const { data: results, error: resultsError } = await scout
    .from('tournament_results')
    .select(
      'total_score, position, position_text, rounds, field_size, tournaments(name, start_date, end_date, location, course_par, course_rating, field_size)'
    )
    .eq('athlete_id', scoutAthleteId)

  if (resultsError) {
    console.error('SCOUT results fetch failed:', resultsError.message)
  }

  const recentResults: ScoutResult[] = ((results ?? []) as unknown as JoinedResult[])
    .map((r) => ({ ...r, t: oneTournament(r.tournaments) }))
    .filter((r) => r.t)
    .sort((a, b) => {
      const da = a.t?.start_date ?? a.t?.end_date ?? ''
      const db = b.t?.start_date ?? b.t?.end_date ?? ''
      return db.localeCompare(da)
    })
    .slice(0, 50)
    .map((r) => {
      const rounds = parseRounds(r.rounds)
      const n = rounds.length
      const total = num(r.total_score)
      const par = num(r.t?.course_par)
      const cr = num(r.t?.course_rating)
      const vsPar = total != null && par != null && n > 0 ? total - par * n : null
      const vsCR = total != null && cr != null && n > 0 ? total - cr * n : null
      // Field size of the athlete's own (gendered) event — from the result row,
      // falling back to its tournament_id's field_size. Both are tied to this
      // single result, so this is NEVER a Men + Women aggregate.
      const trFs = num(r.field_size)
      const tFs = num(r.t?.field_size)
      const fieldSize = trFs && trFs > 0 ? trFs : tFs && tFs > 0 ? tFs : null
      return {
        tournamentName: r.t?.name ?? null,
        date: r.t?.start_date ?? r.t?.end_date ?? null,
        location: r.t?.location ?? null,
        position: r.position_text ?? (r.position != null ? `#${r.position}` : null),
        rounds,
        totalScore: total,
        vsPar: vsPar != null ? Math.round(vsPar * 10) / 10 : null,
        vsCR: vsCR != null ? Math.round(vsCR * 10) / 10 : null,
        fieldSize,
      }
    })

  const rawStatus = String(athleteRow.status ?? '').trim().toLowerCase()
  const placed =
    rawStatus === 'committed' || rawStatus === 'in_college' || rawStatus === 'archived'

  return {
    athlete: athleteRow,
    scoring: buildScoring(athleteRow),
    recentResults,
    placed,
  }
}
