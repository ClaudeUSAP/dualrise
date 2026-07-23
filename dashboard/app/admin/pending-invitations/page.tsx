import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  PendingInvitationsTable,
  type Invitation,
} from './PendingInvitationsTable'
import { SyncButton } from './SyncButton'

export default async function PendingInvitationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invitationsRaw } = await supabase
    .from('pending_player_invitations')
    .select(
      'id, first_name, last_name, email, graduation_year, gender, class_year_label, agent_first_name, agent_id, email_source, parent_emails, created_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const invitations = (
    (invitationsRaw ?? []) as Array<
      Omit<Invitation, 'agent_full_name' | 'parent_emails'> & {
        parent_emails: unknown
      }
    >
  ).map((row) => ({
    ...row,
    parent_emails: Array.isArray(row.parent_emails)
      ? (row.parent_emails as string[]).filter(
          (e): e is string => typeof e === 'string'
        )
      : [],
  })) as Omit<Invitation, 'agent_full_name'>[]

  const agentIds = Array.from(
    new Set(
      invitations
        .map((i) => i.agent_id)
        .filter((v): v is string => typeof v === 'string')
    )
  )
  const agentNameById = new Map<string, string>()
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, first_name, last_name')
      .in('id', agentIds)
    for (const a of agents ?? []) {
      agentNameById.set(a.id, `${a.first_name} ${a.last_name}`)
    }
  }

  const enriched: Invitation[] = invitations.map((i) => ({
    ...i,
    agent_full_name: i.agent_id ? agentNameById.get(i.agent_id) ?? null : null,
  }))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-2xl text-navy sm:text-3xl">
            Invitations en attente
          </h1>
          <p className="mt-1 text-sm text-muted">
            {enriched.length} invitation{enriched.length !== 1 ? 's' : ''}{' '}
            détectée{enriched.length !== 1 ? 's' : ''} depuis Clients-Pipe.
            Vérifie l’email avant d’approuver.
          </p>
        </div>
        <SyncButton />
      </div>

      <PendingInvitationsTable invitations={enriched} />
    </div>
  )
}
