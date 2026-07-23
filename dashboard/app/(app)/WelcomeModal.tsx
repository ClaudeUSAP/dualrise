'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { acknowledgeWelcome } from './welcome-actions'

export function WelcomeModal({ firstName }: { firstName: string }) {
  const t = useTranslations('welcomeModal')
  const bullets = t.raw('bullets') as string[]
  const [open, setOpen] = useState(true)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClose() {
    setOpen(false)
    startTransition(async () => {
      try {
        await acknowledgeWelcome()
      } catch (err) {
        console.error(err)
      }
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="w-full max-w-md rounded-md bg-white shadow-xl">
        <div className="border-b border-line px-6 py-5">
          <h2
            id="welcome-title"
            className="display text-2xl text-navy"
          >
            {t('title', { firstName })}
          </h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-navy">{t('intro')}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-navy">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
            {t('privacy')}
            <br />
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-orange hover:underline"
            >
              {t('learnMore')}
            </a>
          </p>
        </div>
        <div className="flex justify-end border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
          >
            {pending ? t('saving') : t('ok')}
          </button>
        </div>
      </div>
    </div>
  )
}
