'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { updatePlayerEmail } from './checklist-actions'

// Editable contact/source email (players.player_email). Distinct from the
// login email (auth.users.email) — changing this does NOT touch the auth
// account; it just stores the email used to pre-fill the invitation.
export function PlayerEmailEditor({
  playerId,
  initialEmail,
}: {
  playerId: string
  initialEmail: string | null
}) {
  const [email, setEmail] = useState(initialEmail ?? '')
  const [saved, setSaved] = useState(initialEmail ?? '')
  const [pending, startTransition] = useTransition()

  const dirty = email.trim().toLowerCase() !== saved.trim().toLowerCase()

  function handleSave() {
    const trimmed = email.trim().toLowerCase()
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Email invalide')
      return
    }
    startTransition(async () => {
      try {
        await updatePlayerEmail(playerId, trimmed)
        setSaved(trimmed)
        setEmail(trimmed)
        toast.success('Email du joueur enregistré')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
        Email du joueur (contact)
      </span>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSave()
            }
          }}
          disabled={pending}
          placeholder="joueur@example.com"
          className="flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !dirty}
          className="rounded-md bg-navy px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
        >
          {pending ? '…' : 'Enregistrer'}
        </button>
      </div>
      <span className="mt-1 block text-[11px] text-muted">
        Email de contact / source (sert à pré-remplir l’invitation). Ce n’est pas
        l’email de connexion.
      </span>
    </label>
  )
}
