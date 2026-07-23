'use client'

import { useState, useTransition } from 'react'
import { addPlayerNote, deletePlayerNote } from './player-notes-actions'

type PlayerNote = {
  id: string
  body: string
  author_name: string | null
  author_role: string | null
  created_at: string
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function PlayerVisibleNotes({
  playerId,
  notes,
}: {
  playerId: string
  notes: PlayerNote[]
}) {
  const [adding, setAdding] = useState(false)
  const [body, setBody] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAdd() {
    if (!body.trim()) return
    const txt = body
    setBody('')
    setAdding(false)
    startTransition(async () => {
      try {
        await addPlayerNote(playerId, txt)
      } catch (err) {
        console.error(err)
      }
    })
  }

  function handleDelete(noteId: string) {
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cette note ?')) return
    startTransition(async () => {
      try {
        await deletePlayerNote(noteId, playerId)
      } catch (err) {
        console.error(err)
      }
    })
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="display text-xl text-navy">📝 Notes (visibles joueur)</h2>
          <p className="text-xs text-muted">
            Partagées avec le joueur et ses parents. Pour les messages privés équipe,
            utilise la section &laquo;&nbsp;Notes équipe&nbsp;&raquo; ci-dessus.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-[#C11722]"
        >
          + Note
        </button>
      </div>

      {adding && (
        <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/5 p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message visible par le joueur et ses parents…"
            rows={3}
            autoFocus
            className="w-full rounded-md border border-line bg-white px-2 py-1 text-sm text-navy outline-none focus:border-orange placeholder:text-muted"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setBody('')
              }}
              className="text-xs text-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={pending || !body.trim()}
              className="rounded-md bg-orange px-3 py-1 text-xs font-bold text-white disabled:opacity-60"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="rounded-md border border-dashed border-line py-6 text-center text-xs text-muted">
          Aucune note partagée pour ce joueur.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-md border border-line bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {n.author_name ?? '?'}
                  {n.author_role && n.author_role !== 'agent' && (
                    <span className="ml-1 text-orange">({n.author_role})</span>
                  )}
                  {' · '}
                  {DATE_FMT.format(new Date(n.created_at))}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(n.id)}
                  disabled={pending}
                  className="text-[10px] uppercase text-muted hover:text-red-600"
                >
                  Supprimer
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-navy">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
