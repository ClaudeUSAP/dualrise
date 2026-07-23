import type { SupabaseClient } from '@supabase/supabase-js'
import enMessages from '../messages/en.json'
import frMessages from '../messages/fr.json'

export type Locale = 'fr' | 'en'
export const LOCALES: Locale[] = ['fr', 'en']
export const DEFAULT_LOCALE: Locale = 'fr'

const MESSAGES_BY_LOCALE: Record<Locale, typeof frMessages> = {
  fr: frMessages,
  en: enMessages,
}

export function getMessages(locale: Locale) {
  return MESSAGES_BY_LOCALE[locale] ?? MESSAGES_BY_LOCALE[DEFAULT_LOCALE]
}

/**
 * Server-side message lookup by dotted key (e.g. `nav.schools`). Falls back to
 * the French message when the English version is missing. Use this in
 * server components where we can't call useTranslations().
 */
export function serverT(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const lookup = (loc: Locale): string | null => {
    let cursor: unknown = MESSAGES_BY_LOCALE[loc]
    for (const part of key.split('.')) {
      if (typeof cursor !== 'object' || cursor === null) return null
      cursor = (cursor as Record<string, unknown>)[part]
    }
    return typeof cursor === 'string' ? cursor : null
  }
  const raw = lookup(locale) ?? lookup(DEFAULT_LOCALE) ?? key
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (_, p: string) =>
    p in params ? String(params[p]) : `{${p}}`
  )
}

/**
 * Resolve the locale for the currently authenticated viewer. Reads
 * players.preferred_language for players & parents. Falls back to 'fr' for
 * agents/founders or anyone not linked to a player.
 */
export async function getViewerLocale(supabase: SupabaseClient): Promise<Locale> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return DEFAULT_LOCALE

  // Try the direct player path first (player auth_user_id link)
  const { data: ownPlayer } = await supabase
    .from('players')
    .select('preferred_language')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (ownPlayer?.preferred_language) {
    return normalize(ownPlayer.preferred_language)
  }

  // Otherwise look at player_members (parents and similar)
  const { data: member } = await supabase
    .from('player_members')
    .select('player_id')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (member?.player_id) {
    const { data: linked } = await supabase
      .from('players')
      .select('preferred_language')
      .eq('id', member.player_id)
      .maybeSingle()
    if (linked?.preferred_language) return normalize(linked.preferred_language)
  }

  return DEFAULT_LOCALE
}

function normalize(value: string): Locale {
  return value === 'en' ? 'en' : 'fr'
}
