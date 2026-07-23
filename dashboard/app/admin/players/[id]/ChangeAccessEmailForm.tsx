'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { changePlayerAccessEmail } from './invite-actions'

// Change the LOGIN email (auth.users.email). Updates the existing auth account
// in place (or reconciles an orphan) — never creates a second account.
export function ChangeAccessEmailForm({
  playerId,
  currentEmail,
}: {
  playerId: string
  currentEmail: string | null
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Email invalide')
      return
    }
    if (
      !window.confirm(
        `Changer l’email de connexion de « ${currentEmail ?? '?'} » vers « ${trimmed} » ?\n\nLe compte existant est mis à jour (pas de nouveau compte). Le joueur recevra un nouveau magic link et devra se connecter avec ce nouvel email.`
      )
    ) {
      return
    }
    startTransition(async () => {
      try {
        const res = await changePlayerAccessEmail(playerId, trimmed)
        if (!res.ok) {
          setError(res.error)
          return
        }
        if (!res.changed) {
          toast.success('C’était déjà l’email de connexion.')
        } else {
          const bits = [`Email de connexion → ${res.email}`]
          if (res.reconciled) bits.push('compte orphelin réconcilié')
          if (res.oldAccountDeleted) bits.push('ancien compte supprimé')
          bits.push(res.linkSent ? 'magic link envoyé' : 'magic link NON envoyé')
          toast.success(bits.join(' · '))
        }
        setEmail('')
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] font-bold uppercase tracking-wide text-muted underline hover:text-orange"
      >
        Changer l’email d’accès
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-line bg-white p-3">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">
        Changer l’email d’accès (connexion)
      </span>
      <p className="text-[11px] text-muted">
        Connexion actuelle : <span className="font-semibold text-navy">{currentEmail ?? '—'}</span>
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={pending}
        placeholder="nouvel-email@example.com"
        className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange disabled:opacity-60"
      />
      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
        >
          {pending ? 'Changement…' : 'Confirmer le changement'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError(null)
            setEmail('')
          }}
          disabled={pending}
          className="rounded-md border border-line px-4 py-2 text-sm font-bold text-muted hover:text-navy disabled:opacity-60"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
