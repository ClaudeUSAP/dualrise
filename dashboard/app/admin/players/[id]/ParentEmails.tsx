'use client'

import { useState, useTransition } from 'react'
import { updateParentEmails } from './checklist-actions'

export function ParentEmails({
  playerId,
  initialEmails,
}: {
  playerId: string
  initialEmails: string[]
}) {
  const [emails, setEmails] = useState<string[]>(initialEmails)
  const [newEmail, setNewEmail] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAdd() {
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return
    if (emails.includes(trimmed)) {
      setNewEmail('')
      return
    }
    const next = [...emails, trimmed]
    setEmails(next)
    setNewEmail('')
    startTransition(async () => {
      try {
        await updateParentEmails(playerId, next)
      } catch (err) {
        console.error(err)
        setEmails(emails)
      }
    })
  }

  function handleRemove(email: string) {
    const next = emails.filter((e) => e !== email)
    setEmails(next)
    startTransition(async () => {
      try {
        await updateParentEmails(playerId, next)
      } catch (err) {
        console.error(err)
        setEmails(emails)
      }
    })
  }

  return (
    <section className="mt-10">
      <h2 className="display mb-4 text-xl text-navy">Emails parents</h2>
      <p className="mb-4 text-xs text-muted">
        Pour le digest hebdomadaire automatique. Les parents reçoivent un email chaque lundi avec les nouveautés de la semaine.
      </p>
      <div className="rounded-md border border-line bg-white p-4">
        {emails.length > 0 ? (
          <ul className="mb-3 flex flex-col gap-1">
            {emails.map((e) => (
              <li key={e} className="flex items-center justify-between text-sm">
                <span className="text-navy">{e}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(e)}
                  disabled={pending}
                  className="text-[10px] uppercase text-muted hover:text-red disabled:opacity-50"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-xs italic text-muted">Aucun email parent ajouté.</p>
        )}
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAdd()
              }
            }}
            placeholder="parent@email.com"
            className="flex-1 rounded-md border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-orange"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending || !newEmail.trim()}
            className="rounded-md bg-orange px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            Ajouter
          </button>
        </div>
      </div>
    </section>
  )
}
