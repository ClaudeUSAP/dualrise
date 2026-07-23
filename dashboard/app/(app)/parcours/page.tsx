type PhaseKey =
  | 'acquisition'
  | 'profile'
  | 'recruiting'
  | 'offers'
  | 'commitment'
  | 'admin'
  | 'departure'

const PHASES: Array<{ key: PhaseKey; emoji: string }> = [
  { key: 'acquisition', emoji: '🎯' },
  { key: 'profile', emoji: '📋' },
  { key: 'recruiting', emoji: '🤝' },
  { key: 'offers', emoji: '💌' },
  { key: 'commitment', emoji: '✍️' },
  { key: 'admin', emoji: '🛂' },
  { key: 'departure', emoji: '✈️' },
]

function getCurrentPhaseKey(graduationYear: number | null): PhaseKey {
  if (!graduationYear) return 'acquisition'
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1  // 1-12
  // graduationYear = year of departure (N)
  const yearsBefore = graduationYear - year
  if (yearsBefore >= 2) {
    if (month >= 9 || month <= 1) return 'profile'
    return 'recruiting'
  }
  if (yearsBefore === 1) {
    if (month <= 6) return 'recruiting'
    if (month <= 11) return 'commitment'
    return 'admin'
  }
  if (yearsBefore === 0) {
    if (month <= 7) return 'admin'
    return 'departure'
  }
  return 'departure'
}

import { redirect } from 'next/navigation'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'

export default async function ParcoursPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const locale = await getViewerLocale(supabase)

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select('graduation_year, first_name')
        .eq('id', member.player_id)
        .single()
    : { data: null }

  const currentPhase = getCurrentPhaseKey(player?.graduation_year ?? null)
  const currentIdx = PHASES.findIndex((p) => p.key === currentPhase)

  return (
    <div>
      <h1 className="display mb-2 text-2xl text-navy sm:text-3xl">
        {serverT(locale, 'parcours.title')}
      </h1>
      <p className="mb-8 text-sm text-muted">
        {serverT(locale, 'parcours.subtitle')}
        {player?.graduation_year && (
          <span>
            {' '}
            {serverT(locale, 'parcours.youLeaveIn')}
            <strong className="text-orange">Fall {player.graduation_year}</strong>
            .
          </span>
        )}
      </p>

      <div className="flex flex-col gap-4">
        {PHASES.map((phase, idx) => {
          const isPast = idx < currentIdx
          const isCurrent = idx === currentIdx
          const isFuture = idx > currentIdx
          return (
            <div
              key={phase.key}
              className={`rounded-md border p-4 transition-shadow ${
                isCurrent
                  ? 'border-orange bg-orange/5 shadow-md'
                  : isPast
                  ? 'border-line bg-cream-2/40'
                  : 'border-line bg-white'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
                    isCurrent
                      ? 'bg-orange text-white'
                      : isPast
                      ? 'bg-zinc-300'
                      : 'bg-cream-2 text-zinc-400'
                  }`}
                >
                  {isPast ? '✓' : phase.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`display text-lg ${
                        isCurrent ? 'text-orange' : isPast ? 'text-muted' : 'text-navy'
                      }`}
                    >
                      {serverT(locale, `parcours.phases.${phase.key}.label`)}
                    </h3>
                    {isCurrent && (
                      <span className="rounded bg-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {serverT(locale, 'parcours.inProgress')}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs font-bold uppercase tracking-wide ${
                      isCurrent ? 'text-orange' : 'text-muted'
                    }`}
                  >
                    {serverT(locale, `parcours.phases.${phase.key}.period`)}
                  </p>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      isFuture ? 'text-muted' : 'text-navy'
                    }`}
                  >
                    {serverT(
                      locale,
                      `parcours.phases.${phase.key}.description`
                    )}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
