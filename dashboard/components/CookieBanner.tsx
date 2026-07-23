'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'usap_cookie_notice_seen_v1'

/**
 * Info-only cookie banner.
 *
 * USAP n'utilise QUE des cookies strictement nécessaires (auth, préférences).
 * Aucun cookie publicitaire ni profilage tiers → un simple bandeau d'information suffit
 * en conformité avec la directive ePrivacy (pas de consentement requis pour les cookies
 * strictement nécessaires).
 *
 * Si tu ajoutes un jour Google Analytics, Pixel Facebook, ou tout autre tracker tiers,
 * il faudra remplacer ce composant par une vraie CMP (Cookie Management Platform) avec
 * consentement granulaire — ex: Axeptio, Didomi.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY)
      if (!seen) setVisible(true)
    } catch {
      // localStorage indisponible (mode privé strict, etc.) — on n'affiche pas
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Information sur les cookies"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-lg border border-line bg-white shadow-lg sm:bottom-6 sm:left-6 sm:right-6"
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm leading-relaxed text-navy">
          🍪 Nous utilisons uniquement des cookies <strong>strictement nécessaires</strong>{' '}
          au fonctionnement du site (authentification, préférences). Aucun cookie
          publicitaire ou de profilage n&apos;est utilisé.{' '}
          <Link
            href="/privacy#cookies"
            className="font-semibold text-orange underline decoration-orange/40 underline-offset-2 hover:decoration-orange"
          >
            En savoir plus
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-navy-bright"
        >
          J&apos;ai compris
        </button>
      </div>
    </div>
  )
}
