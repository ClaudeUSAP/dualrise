'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  approveInvitation,
  declineInvitation,
  updateInvitationEmail,
  updateInvitationParentEmails,
} from './actions'

export type Invitation = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  graduation_year: number
  gender: 'Men' | 'Women'
  class_year_label: string | null
  agent_first_name: string | null
  agent_id: string | null
  agent_full_name: string | null
  email_source: string | null
  parent_emails: string[]
  created_at: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function PendingInvitationsTable({
  invitations,
}: {
  invitations: Invitation[]
}) {
  if (invitations.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line bg-white p-8 text-center text-muted">
        Aucune invitation en attente. Lance la sync pour récupérer les nouveaux
        joueurs depuis Clients-Pipe.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-cream-2/50 text-left">
            <Th>Nom</Th>
            <Th>Email joueur / parents</Th>
            <Th>Agent</Th>
            <Th>Class</Th>
            <Th>Source</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <Row key={inv.id} invitation={inv} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode
  align?: 'right'
}) {
  return (
    <th
      className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted ${
        align === 'right' ? 'text-right' : ''
      }`}
    >
      {children}
    </th>
  )
}

function Row({ invitation }: { invitation: Invitation }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [emailDraft, setEmailDraft] = useState(invitation.email ?? '')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const emailValid = EMAIL_RE.test((invitation.email ?? '').trim())
  const rowFlagged = !invitation.email || !emailValid

  function commitEmail() {
    const trimmed = emailDraft.trim().toLowerCase()
    if (!trimmed) {
      setError('Email vide')
      return
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('Format email invalide')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await updateInvitationEmail(invitation.id, trimmed)
        setEditing(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'erreur')
      }
    })
  }

  function handleApprove() {
    if (!emailValid) {
      setError('Email invalide — édite avant d’approuver')
      return
    }
    if (!window.confirm(`Approuver et inviter ${invitation.first_name} ${invitation.last_name} ?`)) {
      return
    }
    setError(null)
    setInfo(null)
    startTransition(async () => {
      try {
        const res = await approveInvitation(invitation.id)
        const summary = res.overrideActive
          ? `Email envoyé à ${res.recipientEmail} (override actif)`
          : `Email envoyé à ${res.recipientEmail}`
        setInfo(res.ok ? summary : `Player créé mais email failed: ${res.error}`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'erreur')
      }
    })
  }

  function handleDecline() {
    const reason = window.prompt(
      `Refuser ${invitation.first_name} ${invitation.last_name} ? Raison (optionnel) :`,
      ''
    )
    if (reason === null) return
    setError(null)
    startTransition(async () => {
      try {
        await declineInvitation(invitation.id, reason || null)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'erreur')
      }
    })
  }

  return (
    <tr
      className={`border-t border-line align-top ${
        rowFlagged ? 'bg-yellow-50' : ''
      }`}
    >
      <td className="px-4 py-3">
        <div className="font-bold text-navy">
          {invitation.first_name} {invitation.last_name}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEmail()
                  if (e.key === 'Escape') {
                    setEmailDraft(invitation.email ?? '')
                    setEditing(false)
                    setError(null)
                  }
                }}
                disabled={pending}
                className="flex-1 rounded-md border border-orange bg-white px-2 py-1 text-xs outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={commitEmail}
                disabled={pending}
                className="rounded bg-orange px-2 py-1 text-[10px] font-bold text-white disabled:opacity-60"
              >
                ✓
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setEmailDraft(invitation.email ?? '')
                  setEditing(false)
                  setError(null)
                }}
                className="rounded border border-line bg-white px-2 py-1 text-[10px] text-muted"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEmailDraft(invitation.email ?? '')
                setEditing(true)
              }}
              className="text-left text-xs text-navy hover:text-orange"
            >
              {invitation.email ?? (
                <span className="italic text-muted">— manquant —</span>
              )}
            </button>
          )}
          <ParentEmailsEditor
            invitationId={invitation.id}
            initial={invitation.parent_emails}
          />
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted">
        {invitation.agent_full_name ?? invitation.agent_first_name ?? '—'}
        {!invitation.agent_id && invitation.agent_first_name && (
          <span className="ml-1 text-red">(pas matché)</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted">
        {invitation.graduation_year} ·{' '}
        {invitation.gender === 'Men' ? 'Boys' : 'Girls'}
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            invitation.email_source === 'fiche_info'
              ? 'bg-orange-soft text-orange'
              : invitation.email_source === 'manual'
              ? 'bg-navy-bright/10 text-navy-bright'
              : 'bg-zinc-200 text-muted'
          }`}
        >
          {invitation.email_source === 'fiche_info'
            ? 'Fiche Info'
            : invitation.email_source === 'manual'
            ? 'Manuel'
            : 'Manquant'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleApprove}
              disabled={pending || !emailValid}
              title={emailValid ? 'Approuver' : 'Email manquant ou invalide'}
              className="rounded bg-green px-2 py-1 text-[10px] font-bold text-white disabled:bg-zinc-300"
            >
              ✅ Approve
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={pending}
              className="rounded border border-line bg-white px-2 py-1 text-[10px] font-bold text-muted hover:text-red disabled:opacity-60"
            >
              ❌ Decline
            </button>
          </div>
          {error && <span className="text-[10px] text-red">{error}</span>}
          {info && <span className="text-[10px] text-green">{info}</span>}
        </div>
      </td>
    </tr>
  )
}

function ParentEmailsEditor({
  invitationId,
  initial,
}: {
  invitationId: string
  initial: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [emails, setEmails] = useState<string[]>(initial)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  function persist(next: string[]) {
    setError(null)
    startTransition(async () => {
      try {
        await updateInvitationParentEmails(invitationId, next)
        setEmails(next)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'erreur')
      }
    })
  }

  function addEmail() {
    const trimmed = draft.trim().toLowerCase()
    if (!trimmed) return
    if (!EMAIL_RE.test(trimmed)) {
      setError('Format email invalide')
      return
    }
    if (emails.includes(trimmed)) {
      setDraft('')
      return
    }
    persist([...emails, trimmed])
    setDraft('')
  }

  function removeEmail(email: string) {
    persist(emails.filter((e) => e !== email))
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
        Parents
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {emails.map((e) => (
          <span
            key={e}
            className="inline-flex items-center gap-1 rounded-full bg-cream-2 px-2 py-0.5 text-[11px] text-navy"
          >
            {e}
            <button
              type="button"
              onClick={() => removeEmail(e)}
              disabled={pending}
              className="text-muted hover:text-red disabled:opacity-50"
              aria-label={`Retirer ${e}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          type="email"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addEmail()
            }
            if (e.key === 'Backspace' && draft === '' && emails.length > 0) {
              e.preventDefault()
              removeEmail(emails[emails.length - 1])
            }
          }}
          onBlur={addEmail}
          placeholder={emails.length === 0 ? 'parent@email.com' : '+ ajouter'}
          disabled={pending}
          className="min-w-[120px] flex-1 rounded border border-line bg-white px-1.5 py-0.5 text-[11px] outline-none focus:border-orange disabled:opacity-50"
        />
      </div>
      {error && <span className="text-[10px] text-red">{error}</span>}
    </div>
  )
}
