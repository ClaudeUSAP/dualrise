'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setWeeklyDigestOptin } from './digest-actions'

const COPY = {
  fr: {
    title: 'Récap hebdomadaire',
    subtitle:
      'Un email les semaines où il y a du nouveau (nouvelles facs, calls à venir). Tu peux te désinscrire ici ou depuis n’importe quel email.',
    on: 'Activé',
    off: 'Désactivé',
    saving: 'Enregistrement…',
    saved: 'Enregistré',
  },
  en: {
    title: 'Weekly summary',
    subtitle:
      'An email on weeks with something new (new schools, upcoming calls). You can unsubscribe here or from any email.',
    on: 'On',
    off: 'Off',
    saving: 'Saving…',
    saved: 'Saved',
  },
}

export function DigestOptIn({
  initialOptin,
  locale = 'fr',
}: {
  initialOptin: boolean
  locale?: 'fr' | 'en'
}) {
  const t = COPY[locale === 'en' ? 'en' : 'fr']
  const router = useRouter()
  const [optin, setOptin] = useState(initialOptin)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function toggle() {
    if (pending) return
    const next = !optin
    setOptin(next)
    setSaved(false)
    startTransition(async () => {
      try {
        await setWeeklyDigestOptin(next)
        setSaved(true)
        router.refresh()
      } catch (err) {
        console.error(err)
        setOptin(!next)
      }
    })
  }

  return (
    <section className="rounded-md border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="display text-sm text-navy">{t.title}</h3>
        {pending && (
          <span className="text-[11px] italic text-muted">{t.saving}</span>
        )}
        {!pending && saved && (
          <span className="text-[11px] italic text-orange">{t.saved}</span>
        )}
      </header>
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <p className="text-xs text-muted">{t.subtitle}</p>
        <button
          type="button"
          role="switch"
          aria-checked={optin}
          onClick={toggle}
          disabled={pending}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            optin ? 'bg-orange' : 'bg-line'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              optin ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
          <span className="sr-only">{optin ? t.on : t.off}</span>
        </button>
      </div>
    </section>
  )
}
