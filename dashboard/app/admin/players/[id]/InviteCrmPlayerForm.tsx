'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { inviteCrmPlayer } from './invite-actions'

export function InviteCrmPlayerForm({
  playerId,
  isResend = false,
  defaultEmail,
  defaultParentEmails,
}: {
  playerId: string
  isResend?: boolean
  defaultEmail?: string
  defaultParentEmails?: string[]
}) {
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [parentEmailsRaw, setParentEmailsRaw] = useState(
    (defaultParentEmails ?? []).join('\n')
  )
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Email invalide')
      return
    }
    const parentEmails = parentEmailsRaw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    startTransition(async () => {
      try {
        const res = await inviteCrmPlayer(playerId, trimmed, parentEmails)
        if (!res.ok) {
          setError(res.error)
          return
        }
        const note = res.overrideActive
          ? ` (override actif → ${res.recipientEmail})`
          : res.ccCount > 0
            ? ` (+ ${res.ccCount} parent${res.ccCount > 1 ? 's' : ''} en CC)`
            : ''
        const verb = res.resend ? 'Magic link renvoyé' : 'Invitation envoyée'
        toast.success(`${verb} à ${res.recipientEmail}${note}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
          {isResend ? 'Email de connexion' : 'Email du joueur'}
        </span>
        {isResend ? (
          // Already invited: the login email is read-only here — the magic link
          // is always sent to the existing account. Change it via the dedicated
          // « Changer l’email d’accès » action (never via this form, which used
          // to silently create a duplicate account).
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full cursor-not-allowed rounded-md border border-line bg-gray-50 px-3 py-2 text-sm text-muted outline-none"
          />
        ) : (
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            placeholder="joueur@example.com"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange disabled:opacity-60"
          />
        )}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
          Emails parents <span className="text-muted">(optionnel, 1 par ligne)</span>
        </span>
        <textarea
          value={parentEmailsRaw}
          onChange={(e) => setParentEmailsRaw(e.target.value)}
          disabled={pending}
          rows={2}
          placeholder="parent1@example.com&#10;parent2@example.com"
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange disabled:opacity-60"
        />
      </label>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !email.trim()}
        className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
      >
        {pending
          ? 'Envoi…'
          : isResend
            ? '🔁 Renvoyer le magic link'
            : '✉️ Envoyer l’invitation'}
      </button>
    </form>
  )
}
