'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { clearIntroVideoUrl, updateIntroVideoUrl } from './sheet-actions'

export function IntroVideoEditor({
  playerId,
  initialUrl,
}: {
  playerId: string
  initialUrl: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialUrl ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    if (!draft.trim()) {
      setError('Lien vidéo requis')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await updateIntroVideoUrl(playerId, draft)
        toast.success('Vidéo de présentation enregistrée')
        setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  function handleClear() {
    if (typeof window !== 'undefined' && !window.confirm('Retirer la vidéo ?')) {
      return
    }
    startTransition(async () => {
      try {
        await clearIntroVideoUrl(playerId)
        toast.success('Vidéo retirée')
        setDraft('')
        setEditing(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  return (
    <section className="mt-6 rounded-md border border-line bg-white p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">
        🎬 Vidéo de présentation
      </h3>
      <p className="mt-1 text-xs text-muted">
        Lien YouTube de la vidéo de présentation du joueur. Visible côté joueur.
      </p>

      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <input
              type="url"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') {
                  setDraft(initialUrl ?? '')
                  setEditing(false)
                  setError(null)
                }
              }}
              placeholder="https://www.youtube.com/watch?v=…"
              disabled={pending}
              className="w-80 max-w-full rounded-md border border-orange bg-white px-2 py-1 text-sm outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={pending || !draft.trim()}
              className="rounded-md bg-orange px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(initialUrl ?? '')
                setEditing(false)
                setError(null)
              }}
              disabled={pending}
              className="rounded-md border border-line bg-white px-2 py-1 text-xs text-muted"
            >
              ✕
            </button>
            {initialUrl && (
              <button
                type="button"
                onClick={handleClear}
                disabled={pending}
                className="ml-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              >
                Retirer
              </button>
            )}
          </div>
          {error && <span className="text-[11px] text-red-700">{error}</span>}
        </div>
      ) : initialUrl ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={initialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-bold text-green-700 transition-colors hover:bg-green-100"
          >
            ▶️ Voir la vidéo ↗
          </a>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-line bg-white px-2 py-1.5 text-xs text-muted hover:border-orange hover:text-orange"
            title="Modifier le lien"
          >
            ✏️
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-dashed border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:border-orange hover:text-orange"
        >
          + Ajouter un lien vidéo
        </button>
      )}
    </section>
  )
}
