'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { clearSheetId, updateSheetId } from './sheet-actions'

export function SheetIdEditor({
  playerId,
  initialSheetId,
}: {
  playerId: string
  initialSheetId: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialSheetId ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    if (!draft.trim()) {
      setError('Sheet ID requis')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await updateSheetId(playerId, draft)
        toast.success('Sheet lié')
        setEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  function handleClear() {
    if (typeof window !== 'undefined' && !window.confirm('Délier ce sheet ?')) return
    startTransition(async () => {
      try {
        await clearSheetId(playerId)
        toast.success('Sheet délié')
        setDraft('')
        setEditing(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  const sheetUrl = initialSheetId
    ? `https://docs.google.com/spreadsheets/d/${initialSheetId}/edit`
    : null

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') {
                setDraft(initialSheetId ?? '')
                setEditing(false)
                setError(null)
              }
            }}
            placeholder="URL Google Sheet ou ID"
            disabled={pending}
            className="w-72 rounded-md border border-orange bg-white px-2 py-1 text-xs outline-none disabled:opacity-60"
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
              setDraft(initialSheetId ?? '')
              setEditing(false)
              setError(null)
            }}
            disabled={pending}
            className="rounded-md border border-line bg-white px-2 py-1 text-xs text-muted"
          >
            ✕
          </button>
          {initialSheetId && (
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="ml-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              Délier
            </button>
          )}
        </div>
        {error && (
          <span className="text-[10px] text-red-700">{error}</span>
        )}
      </div>
    )
  }

  if (!sheetUrl) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:border-orange hover:text-orange"
      >
        + Lier un Google Sheet
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-1">
      <a
        href={sheetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-bold text-green-700 transition-colors hover:bg-green-100"
      >
        📊 Liste Facs (Google Sheet) ↗
      </a>
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={pending}
        className="rounded-md border border-line bg-white px-2 py-1.5 text-xs text-muted hover:border-orange hover:text-orange"
        title="Modifier le sheet lié"
      >
        ✏️
      </button>
    </div>
  )
}
