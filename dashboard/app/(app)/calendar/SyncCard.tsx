'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

export function SyncCard({ icalUrl }: { icalUrl: string }) {
  const t = useTranslations('calendar.sync')
  const [copied, setCopied] = useState(false)

  const webcalUrl = icalUrl.replace(/^https?:/, 'webcal:')
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`

  function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(icalUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section className="rounded-md bg-navy p-5 text-white">
      <h3 className="display mb-3 text-sm">{t('title')}</h3>
      <p className="mb-4 text-xs text-white/60">{t('subtitle')}</p>
      <div className="flex flex-col gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-md bg-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/20"
        >
          {t('google')}
        </a>
        <a
          href={webcalUrl}
          className="block rounded-md bg-white/10 px-3 py-2 text-sm transition-colors hover:bg-white/20"
        >
          {t('apple')}
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-orange px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#C11722]"
        >
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
    </section>
  )
}
