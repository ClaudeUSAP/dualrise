'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  addSchoolToPipeline,
  searchSchoolsForPipeline,
  type SchoolSearchResult,
} from './school-actions'

export function AdminAddSchool({ playerId }: { playerId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SchoolSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!dialogRef.current?.open) return
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await searchSchoolsForPipeline(playerId, query)
        if (!cancelled) setResults(res)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'erreur')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, playerId])

  function handleOpen() {
    setQuery('')
    setResults([])
    setError(null)
    dialogRef.current?.showModal()
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleClose() {
    dialogRef.current?.close()
  }

  function handlePick(schoolId: string) {
    startTransition(async () => {
      try {
        await addSchoolToPipeline(playerId, schoolId)
        handleClose()
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'erreur')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#C11722]"
      >
        + Ajouter une fac
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-md p-0 backdrop:bg-black/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose()
        }}
      >
        <div className="w-[520px] max-w-[90vw] p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">Ajouter une fac</h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-muted hover:text-navy"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tape pour chercher (nom de la fac)…"
            className="mb-3 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange"
          />

          {error && (
            <p className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-6 text-center text-sm text-muted">Recherche…</p>
          ) : results.length === 0 ? (
            <p className="rounded-md border border-dashed border-line py-6 text-center text-sm text-muted">
              {query.trim() ? 'Aucune école trouvée' : 'Tape un nom pour chercher'}
            </p>
          ) : (
            <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(s.id)}
                    disabled={pending}
                    className="w-full rounded-md border border-line bg-white p-3 text-left transition-colors hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-navy">{s.name}</span>
                      {s.division && (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          {s.division}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted">
                      {[s.city, s.state_code].filter(Boolean).join(', ')}
                      {s.gender ? ` · ${s.gender}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  )
}
