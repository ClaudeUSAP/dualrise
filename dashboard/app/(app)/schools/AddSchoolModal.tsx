'use client'

import { useRef, useState, useTransition } from 'react'
import { addAssignment } from './actions'
import type { School } from './Pipeline'

export function AddSchoolModal({ availableSchools }: { availableSchools: School[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState('')

  function handleOpen() {
    dialogRef.current?.showModal()
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleClose() {
    dialogRef.current?.close()
    setQuery('')
  }

  function handlePick(schoolId: string) {
    startTransition(async () => {
      try {
        await addAssignment(schoolId)
        handleClose()
      } catch (err) {
        console.error(err)
      }
    })
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? availableSchools.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.city && s.city.toLowerCase().includes(q)) ||
          s.division.toLowerCase() === q
      )
    : availableSchools

  function formatGender(g: string | null): string | null {
    if (!g) return null
    const v = g.toLowerCase()
    if (v === 'men') return '👤 Men'
    if (v === 'women') return '👤 Women'
    if (v === 'mixed') return '👤 Mixed'
    return `👤 ${g}`
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#C11722]"
      >
        + Ajouter une école
      </button>

      <dialog
        ref={dialogRef}
        className="rounded-md p-0 backdrop:bg-black/40"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose()
        }}
        onClose={() => setQuery('')}
      >
        <div className="w-[480px] max-w-[90vw] p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">Ajouter une école</h2>
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
            placeholder="Rechercher une école..."
            className="mb-3 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange"
          />

          {availableSchools.length === 0 ? (
            <p className="text-sm text-muted">
              Toutes les écoles disponibles sont déjà dans ton pipeline.
            </p>
          ) : filtered.length === 0 ? (
            <p className="rounded-md border border-dashed border-line py-6 text-center text-sm text-muted">
              Aucune école trouvée
            </p>
          ) : (
            <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(s.id)}
                    disabled={pending}
                    className="w-full rounded-md border border-line bg-white p-3 text-left transition-colors hover:bg-cream-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-navy">{s.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                        {s.division}
                        {s.ranking != null && s.ranking < 1000
                          ? ` · #${s.ranking}`
                          : ''}
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      {[
                        s.division,
                        [s.city, s.state_code].filter(Boolean).join(', ') || null,
                        formatGender(s.gender),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
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
