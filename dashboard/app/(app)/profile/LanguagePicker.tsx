'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { updatePlayerLanguage } from './language-actions'

export function LanguagePicker({
  initialLang,
}: {
  initialLang: 'fr' | 'en'
}) {
  const t = useTranslations('profile.language')
  const router = useRouter()
  const [lang, setLang] = useState(initialLang)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function pick(next: 'fr' | 'en') {
    if (next === lang || pending) return
    setLang(next)
    setSaved(false)
    startTransition(async () => {
      try {
        await updatePlayerLanguage(next)
        setSaved(true)
        router.refresh()
      } catch (err) {
        console.error(err)
        setLang(lang)
      }
    })
  }

  return (
    <section className="rounded-md border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="display text-sm text-navy">{t('title')}</h3>
        {pending && (
          <span className="text-[11px] italic text-muted">{t('saving')}</span>
        )}
        {!pending && saved && (
          <span className="text-[11px] italic text-orange">{t('saved')}</span>
        )}
      </header>
      <div className="px-5 py-4">
        <p className="mb-3 text-xs text-muted">{t('subtitle')}</p>
        <div className="flex flex-col gap-2">
          {(['fr', 'en'] as const).map((l) => (
            <label
              key={l}
              className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                lang === l
                  ? 'border-orange bg-orange/10'
                  : 'border-line bg-white hover:border-orange/40'
              }`}
            >
              <input
                type="radio"
                name="lang"
                value={l}
                checked={lang === l}
                onChange={() => pick(l)}
                disabled={pending}
                className="h-4 w-4"
              />
              <span className="text-navy">{t(l)}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  )
}
