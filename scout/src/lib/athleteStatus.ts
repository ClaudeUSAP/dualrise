/**
 * Single source of truth for athlete status — FINAL 4-state model.
 *
 * Canonical values (athletes.status):
 *   in_creation, available, committed, in_college
 *
 * Legacy compatibility (handled until the DB migration runs):
 *   'archived'  → in_college
 *   'new'       → available
 *   'transfer'  → available  (the Transfer status was removed; transfer students
 *                are tracked separately via athletes.studentType, not status)
 *
 * Coach visibility (the real rule — enforced in queries / UI, not just here):
 *   - Catalogue / search: ONLY `available` athletes are listed/consultable.
 *   - Tournament leaderboards: `available` render normally (clickable profile);
 *     `committed` / `in_college` show name + university tag only, NOT clickable;
 *     `in_creation` is never shown anywhere coach-facing.
 */

export type AthleteStatus =
  | 'in_creation'
  | 'available'
  | 'committed'
  | 'in_college'

/** The 4 canonical values, in display order (admin selectors / badges). */
export const ATHLETE_STATUSES: AthleteStatus[] = [
  'in_creation',
  'available',
  'committed',
  'in_college',
]

/** Map any raw DB value (incl. legacy aliases) to a canonical status. */
export function normalizeStatus(raw: string | null | undefined): AthleteStatus {
  switch ((raw ?? '').trim().toLowerCase()) {
    case 'in_creation':
      return 'in_creation'
    case 'committed':
      return 'committed'
    case 'in_college':
    case 'archived': // legacy → in_college
      return 'in_college'
    case 'available':
    case 'new': // legacy → available
    case 'transfer': // removed status → available
      return 'available'
    default:
      return 'available'
  }
}

// English-only labels — Scout's audience is US college coaches.
export const STATUS_LABELS: Record<AthleteStatus, string> = {
  in_creation: 'Building',
  available: 'Available',
  committed: 'Committed',
  in_college: 'In College',
}

/** Human label for a status (canonical or legacy raw value). */
export function statusLabel(raw: string | null | undefined): string {
  return STATUS_LABELS[normalizeStatus(raw)]
}

/** Tailwind badge classes per canonical status (brand navy / orange palette). */
export const STATUS_BADGE_CLASSES: Record<AthleteStatus, string> = {
  in_creation: 'bg-cream-2 text-muted-foreground border-line',
  available: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  committed: 'bg-red-50 text-red-800 border-red-300',
  in_college: 'bg-navy/10 text-navy border-navy/20',
}

/**
 * Raw DB status values to EXCLUDE from coach catalogue / search reads — anything
 * that is not "available". Includes legacy aliases so the filter works before
 * AND after the DB migration. (committed/in_college still appear in leaderboards,
 * but only as name + university tag, never as a consultable profile.)
 */
export const COACH_CATALOGUE_HIDDEN_DB_STATUSES = [
  'in_creation',
  'committed',
  'in_college',
  'archived',
]

/** Whether a coach may open this athlete's full profile (only `available`). */
export function isCoachViewable(raw: string | null | undefined): boolean {
  return normalizeStatus(raw) === 'available'
}

/** Whether an athlete should carry a "committed to <university>" tag. */
export function hasUniversityTag(raw: string | null | undefined): boolean {
  const s = normalizeStatus(raw)
  return s === 'committed' || s === 'in_college'
}
