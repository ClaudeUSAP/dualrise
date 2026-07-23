'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { invitePlayerParent } from './invite-parent-actions'

type Parent = {
  email: string
  hasAccess: boolean
}

export function InviteParentsList({
  playerId,
  parents,
}: {
  playerId: string
  parents: Parent[]
}) {
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  function handleInvite(email: string) {
    setBusy(email)
    startTransition(async () => {
      try {
        const res = await invitePlayerParent(playerId, email)
        const note = res.overrideActive
          ? ` (override actif → ${res.recipientEmail})`
          : ''
        toast.success(`Accès parent envoyé à ${res.recipientEmail}${note}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur'
        toast.error(msg)
      } finally {
        setBusy(null)
      }
    })
  }

  if (parents.length === 0) {
    return (
      <p className="text-xs text-muted">
        Aucun email parent renseigné. Ajoute-les ci-dessus puis enregistre.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {parents.map((p) => (
        <li
          key={p.email}
          className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <span className="text-sm text-navy">{p.email}</span>
            {p.hasAccess && (
              <span className="ml-2 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                Accès actif
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleInvite(p.email)}
            disabled={pending && busy === p.email}
            className="rounded-md border border-orange bg-white px-3 py-1 text-xs font-bold text-orange transition-colors hover:bg-orange hover:text-white disabled:opacity-60"
          >
            {pending && busy === p.email
              ? 'Envoi…'
              : p.hasAccess
                ? '🔁 Renvoyer'
                : '✉️ Donner accès'}
          </button>
        </li>
      ))}
    </ul>
  )
}
