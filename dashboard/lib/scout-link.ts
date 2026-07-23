import 'server-only'
import { getScoutServerClient } from './scout-server'

/**
 * Normalize a name for cross-system matching: lowercase, strip accents, drop
 * everything except a–z (spaces, hyphens, apostrophes included). Mirrors the
 * Clients-Pipe sync normalizer so the dashboard and SCOUT match identically.
 */
export function normalizeScoutName(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '')
}

/**
 * Dashboard normalized full name → SCOUT normalized full name, for athletes
 * whose recorded name differs between the two systems. (Sacha Le Helloco already
 * matches after normalization — "lehelloco" === "lehelloco" — but is listed for
 * documentation.)
 */
const NAME_ALIASES: Record<string, string> = {
  lyloohourantier: 'lyloohourantierjanin', // SCOUT: Hourantier-Janin
  sachalehelloco: 'sachalehelloco', // SCOUT: Le Helloco
  clararyjaceck: 'clararyjacek', // SCOUT: Ryjacek
}

/**
 * Best-effort lookup of a SCOUT athlete id by normalized name. Returns the id
 * ONLY on a unique match among non-archived athletes; returns null on 0 or >1
 * matches, or when the SCOUT client is not configured. Never throws — callers
 * treat a null as "leave the link empty, the weekly catch-up handles it".
 */
export async function findScoutAthleteId(
  firstName: string,
  lastName: string
): Promise<string | null> {
  const scout = getScoutServerClient()
  if (!scout) return null

  const dashNorm = normalizeScoutName(`${firstName} ${lastName}`)
  if (!dashNorm) return null
  const target = NAME_ALIASES[dashNorm] ?? dashNorm

  const { data, error } = await scout
    .from('athletes')
    .select('id, first_name, last_name, status')
    .neq('status', 'archived')
  if (error || !data) return null

  const matches = data.filter(
    (a) =>
      normalizeScoutName(
        `${(a as { first_name?: string }).first_name ?? ''} ${(a as { last_name?: string }).last_name ?? ''}`
      ) === target
  )
  return matches.length === 1 ? ((matches[0] as { id: string }).id) : null
}
