'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ArticleMarkdown } from '../../../../(app)/resources/ArticleMarkdown'
import {
  archiveBriefing,
  saveBriefingDraft,
  validateAndSendBriefing,
} from '../../actions'

export function BriefingForm({
  id,
  initialContent,
  status,
  metadata,
}: {
  id: string
  initialContent: string
  status: 'draft' | 'sent' | 'archived'
  metadata: {
    playerName: string
    schoolName: string | null
    dateLabel: string
  }
}) {
  const [content, setContent] = useState(initialContent)
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')
  const [error, setError] = useState<string | null>(null)

  function handleSaveDraft() {
    setError(null)
    startTransition(async () => {
      try {
        await saveBriefingDraft(id, content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  function handleValidate() {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Envoyer ce brief au joueur (${metadata.playerName}) maintenant ?`
      )
    )
      return
    setError(null)
    startTransition(async () => {
      try {
        await validateAndSendBriefing(id, content)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        if (msg === 'NEXT_REDIRECT') return
        setError(msg)
      }
    })
  }

  function handleArchive() {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Annuler ce brief ? Il ne sera pas envoyé au joueur.')
    )
      return
    setError(null)
    startTransition(async () => {
      try {
        await archiveBriefing(id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        if (msg === 'NEXT_REDIRECT') return
        setError(msg)
      }
    })
  }

  const isSent = status === 'sent'

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/planning"
          className="text-xs font-bold uppercase tracking-wide text-muted hover:text-orange"
        >
          ← Planning
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleArchive}
            disabled={pending}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:text-red"
          >
            Annuler le brief
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={pending}
            className="rounded-md border border-orange bg-white px-3 py-1.5 text-xs font-bold text-orange hover:bg-orange/10"
          >
            {pending ? 'Sauvegarde…' : 'Sauvegarder le draft'}
          </button>
          {!isSent && (
            <button
              type="button"
              onClick={handleValidate}
              disabled={pending}
              className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-[#C11722] disabled:opacity-50"
            >
              {pending ? 'Envoi…' : 'Valider et envoyer au joueur'}
            </button>
          )}
        </div>
      </div>

      <header>
        <h1 className="display text-2xl text-navy">Brief call — {metadata.playerName}</h1>
        <p className="mt-1 text-sm text-muted">
          {metadata.schoolName ?? '—'} · {metadata.dateLabel}
          {isSent && (
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800">
              Envoyé
            </span>
          )}
          {status === 'archived' && (
            <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
              Annulé
            </span>
          )}
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 lg:hidden">
        <TabButton active={tab === 'editor'} onClick={() => setTab('editor')}>
          ✍️ Éditeur
        </TabButton>
        <TabButton active={tab === 'preview'} onClick={() => setTab('preview')}>
          👁️ Aperçu joueur
        </TabButton>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={tab === 'editor' ? '' : 'hidden lg:block'}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
            Markdown
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={28}
            spellCheck={false}
            className="w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-[13px] leading-relaxed focus:border-orange focus:outline-none"
          />
        </div>
        <div className={tab === 'preview' ? '' : 'hidden lg:block'}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
            Aperçu (ce que verra le joueur)
          </label>
          <div className="min-h-[400px] rounded-md border border-line bg-white p-4">
            {content.trim() ? (
              <ArticleMarkdown source={content} />
            ) : (
              <p className="text-sm italic text-muted">L&apos;aperçu apparaîtra ici.</p>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-bold ${
        active
          ? 'bg-navy text-white'
          : 'bg-cream-2 text-muted hover:bg-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}
