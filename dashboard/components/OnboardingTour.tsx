'use client'

import { useEffect, useState, useTransition } from 'react'
import { completeOnboarding } from '@/app/(app)/actions/onboarding'

type Step = {
  emoji: string
  title: string
  body: string
}

export function OnboardingTour({
  initialOpen,
  firstName,
}: {
  initialOpen: boolean
  firstName: string
}) {
  const [open, setOpen] = useState(initialOpen)
  const [step, setStep] = useState(0)
  // Default to checked: most users either complete the tour or explicitly
  // skip it, in which case they expect "dismissed" to mean "for good". Power
  // users who want to re-see it can untick before closing.
  const [dontShowAgain, setDontShowAgain] = useState(true)
  const [, startTransition] = useTransition()

  const STEPS: Step[] = [
    {
      emoji: '👋',
      title: `BIENVENUE ${firstName.toUpperCase()}`,
      body: `Ton dashboard USAP est ton hub central pour ton projet golf-études aux US.

Ce dashboard est partagé avec tes parents : vous pouvez tous y contribuer.

Mini-tour d'1 minute pour découvrir tes 5 onglets.`,
    },
    {
      emoji: '📋',
      title: 'MES ÉCOLES CIBLES',
      body: `Toutes les universités avec lesquelles tu es en contact, organisées en 3 colonnes : Intéressés par toi, En échange, Offre reçue.

Glisse les cartes pour mettre à jour ton avancement.

Clique sur une école pour voir les liens d'informations, ajouter tes notes (privées ou partagées avec ton agent) et tes ratings.`,
    },
    {
      emoji: '✅',
      title: 'MA CHECKLIST',
      body: `Tout ce qu'on doit boucler étape par étape :

Profil Golfique, Académique, Admin Fac, Visa, Arrivée US.

Survole les "?" orange pour plus de détails.`,
    },
    {
      emoji: '📅',
      title: 'MON CALENDRIER',
      body: `Calls coachs, deadlines admin, tournois. Tout au même endroit.

Clique sur une case vide pour ajouter un événement, sync dans ton Google Calendar ou iPhone.`,
    },
    {
      emoji: '👁️',
      title: 'MON PROFIL SCOUT',
      body: `Ce que les coachs US voient sur toi.

Si une info est inexacte, clique sur « Suggérer ». Nicolas reçoit un email et corrige.`,
    },
    {
      emoji: '📚',
      title: 'RESSOURCES',
      body: `Guides, FAQ, et tous les documents utiles pour ton parcours.

Préparation des calls coachs, infos visa, conseils académiques.

À consulter quand tu as un doute.`,
    },
    {
      emoji: '🎉',
      title: 'TU ES PRÊT',
      body: `Bonne chance dans ton projet ! L'équipe USAP est là pour t'accompagner.

Tu peux refaire ce tour à tout moment depuis ton profil.

Explore tout ce que la plateforme a à offrir.`,
    },
  ]

  const total = STEPS.length
  const isLast = step === total - 1
  const isFirst = step === 0

  function close() {
    setOpen(false)
    // Only persist when the user explicitly opts to never see the tour
    // again. Otherwise just dismiss for the current session — it will
    // re-open on the next visit until onboarding_completed flips.
    if (!dontShowAgain) return
    startTransition(async () => {
      try {
        await completeOnboarding()
      } catch (err) {
        console.error(err)
      }
    })
  }

  function next() {
    if (isLast) close()
    else setStep((s) => s + 1)
  }

  function prev() {
    if (!isFirst) setStep((s) => s - 1)
  }

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step])

  if (!open) return null

  const current = STEPS[step]
  const ctaText = isLast
    ? 'Démarrer mon dashboard'
    : isFirst
    ? 'Commencer le tour'
    : 'Suivant →'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 29, 88, 0.6)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded-xl bg-cream shadow-2xl">
        <div className="bg-navy px-6 py-6 text-white">
          <div className="text-4xl leading-none" aria-hidden>
            {current.emoji}
          </div>
          <h2 className="display mt-3 text-2xl">{current.title}</h2>
        </div>

        <div className="px-6 py-6">
          <p className="whitespace-pre-line text-sm leading-relaxed text-navy">{current.body}</p>
        </div>

        <div className="flex flex-col gap-3 border-t border-line bg-white px-6 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span>Ne plus afficher ce message</span>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">
              Étape {step + 1}/{total}
            </span>
            <div className="flex gap-2">
              {isFirst ? (
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md px-3 py-1.5 text-xs text-muted transition-colors hover:text-navy"
                >
                  Passer le tour
                </button>
              ) : (
                <button
                  type="button"
                  onClick={prev}
                  className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-navy"
                >
                  ← Précédent
                </button>
              )}
              <button
                type="button"
                onClick={next}
                autoFocus
                className="rounded-md bg-orange px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#C11722]"
              >
                {ctaText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
