import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BackToPlayersLink } from '../BackToPlayersLink'

export const dynamic = 'force-dynamic'
import { AdminAddSchool } from './AdminAddSchool'
import { AdminChecklist } from './AdminChecklist'
import { AgentFollowupChecklist, type FollowupItem } from './AgentFollowupChecklist'
import { AgentReassign } from './AgentReassign'
import { ParentEmails } from './ParentEmails'
import { InternalNotes } from './InternalNotes'
import { InterviewPrepEditor } from './InterviewPrepEditor'
import { ScoutRecentResults } from './ScoutRecentResults'
import { getScoutProfile } from '@/lib/scout-profile'
import { IntroVideoEditor } from './IntroVideoEditor'
import { ChangeAccessEmailForm } from './ChangeAccessEmailForm'
import { InviteCrmPlayerForm } from './InviteCrmPlayerForm'
import { InviteParentsList } from './InviteParentsList'
import { PlayerEmailEditor } from './PlayerEmailEditor'
import { PlayerCRMSection } from './PlayerCRMSection'
import { PlayerVisibleNotes } from './PlayerVisibleNotes'
import { RealtimeListener } from './RealtimeListener'
import { SheetIdEditor } from './SheetIdEditor'
import { TasksSection } from './TasksSection'
import {
  Pipeline,
  type Assignment,
  type PlayerCriterion,
  type School,
} from '@/app/(app)/schools/Pipeline'

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

type NoteWithSchool = {
  id: string
  note_date: string
  author_type: 'player' | 'parent' | 'other' | 'agent'
  author_name: string
  body: string
  created_at: string
  school_name: string
}

export default async function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: playerId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, first_name, last_name, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, graduation_year, gender, parent_emails, player_email, agent_id, auth_user_id, sheet_id, show_interview_prep, intro_video_url, scout_athlete_id')
    .eq('id', playerId)
    .single()

  if (!player) {
    return (
      <div className="rounded-md border border-line bg-white p-6 text-muted">
        Joueur introuvable ou pas dans ton périmètre.{' '}
        <BackToPlayersLink className="font-bold text-orange">
          ← Retour
        </BackToPlayersLink>
      </div>
    )
  }

  // §6.6 — agent/founder: recent SCOUT tournament results (read-only, all statuses)
  const scoutProfile = player.scout_athlete_id
    ? await getScoutProfile(player.scout_athlete_id)
    : null

  const [
    { data: assignmentsData },
    { data: criteriaData },
    { data: templatesData },
    { data: overridesData },
    { data: progressData },
    { data: internalNotesData },
    { data: crmData },
    { data: tasksData },
    { data: agentsListData },
    { data: playerNotesData },
    { data: interviewPrepData },
    { data: followupData },
  ] = await Promise.all([
    supabase
      .from('school_assignments')
      .select(
        `id, stage, coach_interest,
         schools(id, name, city, state_code, division, gender, governing_body, ranking, coach_name, niche_url, website_url, scoreboard_url, instagram_url, roster_size, graduates_count, tuition_min_usd, tuition_max_usd, coach_email, coach_initials, coach_bio, lat, lng),
         rating_sessions(id, author_type, evaluated_at, created_at, rating_session_items(criterion_key, criterion_label, is_custom, rating)),
         school_call_notes(id, note_date, author_type, author_name, author_user_id, visibility, body, created_at, updated_at)`
      )
      .eq('player_id', playerId)
      .order('created_at', { ascending: true }),
    supabase
      .from('player_criteria')
      .select('id, criterion_key, label, is_default, position')
      .eq('player_id', playerId)
      .order('position', { ascending: true }),
    supabase
      .from('checklist_templates')
      .select('id, item_key, section_label, section_order, item_label_fr, url_link, tooltip_fr, due_hint_fr, is_usap_side, position, show_tooltip_inline')
      .eq('active', true)
      .order('section_order', { ascending: true })
      .order('position', { ascending: true }),
    supabase
      .from('checklist_player_overrides')
      .select('id, template_id, hidden, custom_label_fr, custom_url_link, custom_tooltip_fr, custom_due_hint_fr, custom_section_label, custom_section_order, custom_position')
      .eq('player_id', playerId),
    supabase
      .from('checklist_progress')
      .select('item_key, checked, checked_by_name, checked_by_role')
      .eq('player_id', playerId)
      .eq('checked', true),
    supabase
      .from('internal_notes')
      .select('id, body, author_name, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('player_crm_data')
      .select(
        'status, virement_1_paid, virement_1_amount, virement_2_paid, virement_2_amount, agent_payment_1_amount, agent_payment_1_paid, agent_payment_2_amount, agent_payment_2_paid'
      )
      .eq('player_id', playerId)
      .maybeSingle(),
    supabase
      .from('player_tasks')
      .select(`
        id, title, description, due_date_text, school_id, status,
        done_at, done_by_name, done_by_role,
        assigned_by_name, email_sent_at, created_at,
        schools(name)
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('agents')
      .select('id, first_name, last_name, role')
      .order('first_name'),
    supabase
      .from('player_notes')
      .select('id, body, author_name, author_role, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('player_interview_prep')
      .select('content_markdown, updated_at, updated_by_name')
      .eq('player_id', playerId)
      .maybeSingle(),
    supabase
      .from('agent_followup_checklist')
      .select('id, item_key, item_label, is_default, position, checked, url_link')
      .eq('player_id', playerId)
      .order('position', { ascending: true }),
  ])

  const assignments = (assignmentsData ?? []) as unknown as Assignment[]
  const playerCriteria = (criteriaData ?? []) as PlayerCriterion[]
  const agentsList = (agentsListData ?? []) as Array<{
    id: string
    first_name: string | null
    last_name: string | null
    role: string | null
  }>
  const currentPlayerAgent = agentsList.find((a) => a.id === player.agent_id) ?? null
  const currentAgentName = currentPlayerAgent
    ? `${currentPlayerAgent.first_name ?? ''} ${currentPlayerAgent.last_name ?? ''}`.trim() ||
      null
    : null
  const isFounder = (agent as { role?: string }).role === 'founder'
  const isCurrentOwner = player.agent_id === agent.id
  const canReassign = isFounder || isCurrentOwner
  // If the player's owning agent IS the founder, there are no agent commissions
  // to track (founder doesn't pay themselves). Hide the whole block.
  const playerAgentIsFounder = currentPlayerAgent?.role === 'founder'
  // Agent payments (commissions) — visible & editable by founder + the player's owning agent.
  const canViewAgentPayments =
    !playerAgentIsFounder && (isFounder || isCurrentOwner)
  const canEditAgentPayments =
    !playerAgentIsFounder && (isFounder || isCurrentOwner)
  // Family virements — founder only.
  const canViewFamilyVirements = isFounder
  const canEditFamilyVirements = isFounder

  let playerAuthEmail: string | null = null
  if (player.auth_user_id) {
    const { data: emailData } = await supabase.rpc('get_player_email', {
      p_player_id: player.id,
    })
    if (typeof emailData === 'string') playerAuthEmail = emailData
  }

  const { data: parentMembersRaw } = await supabase.rpc(
    'get_player_parent_emails',
    { p_player_id: player.id }
  )
  const parentMemberEmails = new Set(
    ((parentMembersRaw ?? []) as Array<{ email: string }>)
      .map((r) => r.email?.toLowerCase())
      .filter((e): e is string => !!e)
  )
  const rawParentEmails = (player.parent_emails as string[] | null) ?? []
  const parentRows = rawParentEmails.map((email) => ({
    email,
    hasAccess: parentMemberEmails.has(email.toLowerCase()),
  }))

  const allNotes: NoteWithSchool[] = []
  for (const a of assignments) {
    const schoolName = a.schools?.name ?? 'École inconnue'
    for (const n of a.school_call_notes ?? []) {
      allNotes.push({ ...n, school_name: schoolName })
    }
  }
  allNotes.sort((a, b) => b.note_date.localeCompare(a.note_date))

  return (
    <div>
      <RealtimeListener playerId={player.id} />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackToPlayersLink className="text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:text-orange">
            ← Mes joueurs
          </BackToPlayersLink>
          <h1 className="display mt-1 text-2xl text-navy sm:text-3xl">
            {player.first_name} {player.last_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-orange px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
              CLASS {player.graduation_year}
            </span>
            {player.gender && (
              <span className="rounded border border-line px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted">
                {player.gender === 'Men' ? 'Boys' : 'Girls'}
              </span>
            )}
            <AgentReassign
              playerId={playerId}
              currentAgentId={player.agent_id ?? null}
              currentAgentName={currentAgentName}
              agents={agentsList}
              canEdit={canReassign}
            />
          </div>
        </div>
        {/* Recruiting is closed once the player is committed/signed — hide
            the Liste Facs sheet UI entirely. The sheet_id stays in DB so a
            short status revert lets the agent edit again if needed. */}
        {!['committed', 'signed'].includes(crmData?.status ?? '') && (
          <SheetIdEditor playerId={player.id} initialSheetId={player.sheet_id ?? null} />
        )}
      </div>

      <section className="mt-6 rounded-md border border-orange/30 bg-orange/5 p-4">
        <h3 className="display text-lg text-navy">
          {player.auth_user_id
            ? '🔁 Renvoyer le magic link'
            : '✉️ Inviter ce joueur sur la plateforme'}
        </h3>
        <p className="mt-1 mb-3 text-xs text-muted">
          {player.auth_user_id
            ? 'Renvoie un nouveau magic link au joueur. Les parents seront mis en copie si renseignés ci-dessous.'
            : 'Ce joueur est en mode CRM-only (pas encore inscrit). Envoie-lui un magic link pour qu’il puisse accéder à son dashboard.'}
        </p>
        <div className="mb-3">
          <PlayerEmailEditor
            playerId={player.id}
            initialEmail={(player as { player_email?: string | null }).player_email ?? null}
          />
        </div>

        <InviteCrmPlayerForm
          playerId={player.id}
          isResend={!!player.auth_user_id}
          defaultEmail={
            playerAuthEmail ??
            (player as { player_email?: string | null }).player_email ??
            undefined
          }
          defaultParentEmails={(player.parent_emails as string[] | null) ?? []}
        />

        {player.auth_user_id && (
          <div className="mt-3">
            <ChangeAccessEmailForm
              playerId={player.id}
              currentEmail={playerAuthEmail ?? null}
            />
          </div>
        )}

        {parentRows.length > 0 && (
          <div className="mt-4 border-t border-orange/20 pt-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              👥 Accès parents
            </h4>
            <InviteParentsList
              playerId={player.id}
              parents={parentRows}
            />
          </div>
        )}
      </section>

      {scoutProfile && (
        <div className="mb-6">
          <ScoutRecentResults results={scoutProfile.recentResults} />
        </div>
      )}

      <PlayerCRMSection
        playerId={player.id}
        initialStatus={crmData?.status ?? null}
        canViewAgentPayments={canViewAgentPayments}
        canEditAgentPayments={canEditAgentPayments}
        initialAgentPayment1Amount={
          crmData?.agent_payment_1_amount != null
            ? Number(crmData.agent_payment_1_amount)
            : null
        }
        initialAgentPayment1Paid={crmData?.agent_payment_1_paid ?? false}
        initialAgentPayment2Amount={
          crmData?.agent_payment_2_amount != null
            ? Number(crmData.agent_payment_2_amount)
            : null
        }
        initialAgentPayment2Paid={crmData?.agent_payment_2_paid ?? false}
        canViewFamilyVirements={canViewFamilyVirements}
        canEditFamilyVirements={canEditFamilyVirements}
        initialVirement1Amount={
          crmData?.virement_1_amount != null
            ? Number(crmData.virement_1_amount)
            : null
        }
        initialVirement1Paid={crmData?.virement_1_paid ?? false}
        initialVirement2Amount={
          crmData?.virement_2_amount != null
            ? Number(crmData.virement_2_amount)
            : null
        }
        initialVirement2Paid={crmData?.virement_2_paid ?? false}
      />

      <InternalNotes
        playerId={playerId}
        notes={(internalNotesData ?? []) as Array<{ id: string; body: string; author_name: string | null; created_at: string }>}
      />

      {(isFounder || isCurrentOwner) && (
        <AgentFollowupChecklist
          playerId={playerId}
          items={(followupData ?? []) as FollowupItem[]}
        />
      )}

      <PlayerVisibleNotes
        playerId={playerId}
        notes={(playerNotesData ?? []) as Array<{ id: string; body: string; author_name: string | null; author_role: string | null; created_at: string }>}
      />

      <IntroVideoEditor
        playerId={player.id}
        initialUrl={
          (player as { intro_video_url?: string | null }).intro_video_url ?? null
        }
      />

      <div className="mt-10 mb-2 flex items-center justify-end">
        <AdminAddSchool playerId={playerId} />
      </div>

      <Pipeline
        assignments={assignments}
        availableSchools={[] as School[]}
        playerCriteria={playerCriteria}
        adminContext={{
          agentName: `${agent.first_name} ${agent.last_name}`,
          agentUserId: user.id,
          isFounder,
        }}
      />

      <section className="mt-10">
        <h2 className="display mb-4 text-xl text-navy">
          Timeline notes &amp; rencontres
        </h2>
        {allNotes.length === 0 ? (
          <p className="rounded-md border border-dashed border-line bg-white py-6 text-center text-sm text-muted">
            Pas encore de notes pour ce joueur.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {allNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-md border border-line bg-white p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="display text-sm text-navy">
                      {note.school_name}
                    </span>
                    <span className="text-xs text-muted">
                      · {DATE_FMT.format(new Date(note.note_date))}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      note.author_type === 'player'
                        ? 'text-orange'
                        : 'text-navy-bright'
                    }`}
                  >
                    {note.author_name}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-navy">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(() => {
        type RawTask = {
          id: string
          title: string
          description: string | null
          due_date_text: string | null
          school_id: string | null
          status: string | null
          done_at: string | null
          done_by_name: string | null
          done_by_role: string | null
          assigned_by_name: string | null
          email_sent_at: string | null
          created_at: string | null
          schools: { name: string } | { name: string }[] | null
        }
        const rawTasks = (tasksData ?? []) as unknown as RawTask[]
        const tasks = rawTasks.map((t) => {
          const schoolEntry = Array.isArray(t.schools) ? t.schools[0] : t.schools
          return {
            id: t.id,
            title: t.title,
            description: t.description,
            due_date_text: t.due_date_text,
            school_id: t.school_id,
            school_name: schoolEntry?.name ?? null,
            status: t.status,
            done_at: t.done_at,
            done_by_name: t.done_by_name,
            done_by_role: t.done_by_role,
            assigned_by_name: t.assigned_by_name,
            email_sent_at: t.email_sent_at,
            created_at: t.created_at,
          }
        })
        const schoolOptionsMap = new Map<string, string>()
        for (const a of assignments) {
          if (a.schools?.id && a.schools?.name) {
            schoolOptionsMap.set(a.schools.id, a.schools.name)
          }
        }
        const schoolOptions = Array.from(schoolOptionsMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name))
        return (
          <TasksSection
            playerId={playerId}
            tasks={tasks}
            schoolOptions={schoolOptions}
          />
        )
      })()}

      {(() => {
        const tpl = (templatesData ?? []) as Array<{ id: string; item_key: string; section_label: string; section_order: number; item_label_fr: string; url_link: string | null; tooltip_fr: string | null; due_hint_fr: string | null; is_usap_side: boolean | null; position: number | null; show_tooltip_inline: boolean | null }>
        const ov = (overridesData ?? []) as Array<{ id: string; template_id: string | null; hidden: boolean; custom_label_fr: string | null; custom_url_link: string | null; custom_tooltip_fr: string | null; custom_due_hint_fr: string | null; custom_section_label: string | null; custom_section_order: number | null; custom_position: number | null }>
        const overrideByTemplate = new Map<string, typeof ov[number]>()
        for (const o of ov) if (o.template_id) overrideByTemplate.set(o.template_id, o)
        const defaults = tpl.map((t) => {
          const o = overrideByTemplate.get(t.id)
          return {
            id: t.id,
            item_key: t.item_key,
            section_label: t.section_label,
            section_order: t.section_order,
            position: o?.custom_position ?? t.position ?? 0,
            original_label: t.item_label_fr,
            original_url: t.url_link,
            original_tooltip: t.tooltip_fr,
            original_due_hint: t.due_hint_fr,
            override_label: o?.custom_label_fr ?? null,
            override_url: o?.custom_url_link ?? null,
            override_tooltip: o?.custom_tooltip_fr ?? null,
            override_due_hint: o?.custom_due_hint_fr ?? null,
            hidden: o?.hidden ?? false,
            is_usap_side: t.is_usap_side ?? false,
            show_tooltip_inline: t.show_tooltip_inline ?? false,
          }
        })
        const customs = ov.filter((o) => !o.template_id).map((o) => ({
          id: o.id,
          section_label: o.custom_section_label ?? 'Custom',
          section_order: o.custom_section_order ?? 99,
          position: o.custom_position ?? 99,
          label: o.custom_label_fr ?? '',
          url: o.custom_url_link,
          tooltip: o.custom_tooltip_fr,
          due_hint: o.custom_due_hint_fr,
        }))
        const progressRows = (progressData ?? []) as Array<{ item_key: string; checked_by_name: string | null; checked_by_role: string | null }>
        const checkedKeys = new Set(progressRows.map((p) => p.item_key))
        const checkedBy = new Map<string, { name: string | null; role: string | null }>()
        for (const p of progressRows) checkedBy.set(p.item_key, { name: p.checked_by_name, role: p.checked_by_role })
        // Extract distinct sections from defaults (preserve order)
        const sectionsMap = new Map<string, number>()
        for (const t of tpl) if (!sectionsMap.has(t.section_label)) sectionsMap.set(t.section_label, t.section_order)
        const availableSections = Array.from(sectionsMap.entries())
          .sort((a, b) => a[1] - b[1])
          .map(([label, order]) => ({ label, order }))
        const adminFullName = `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim()
        const adminRole = (agent as { role?: string }).role === 'founder' ? 'founder' : 'agent'
        return <AdminChecklist playerId={playerId} defaults={defaults} customs={customs} checkedKeys={checkedKeys} checkedBy={checkedBy} availableSections={availableSections} currentAgentName={adminFullName} currentAgentRole={adminRole} />
      })()}

      <ParentEmails playerId={playerId} initialEmails={(player.parent_emails as string[] | null) ?? []} />

      {/* Interview Prep is the last block of the page — when its visibility
          toggle is OFF, only the toggle row renders (the editor + preview are
          hidden, see InterviewPrepEditor). */}
      <InterviewPrepEditor
        playerId={player.id}
        initialContent={interviewPrepData?.content_markdown ?? ''}
        initialShow={
          (player as { show_interview_prep?: boolean | null }).show_interview_prep ?? true
        }
        updatedAt={interviewPrepData?.updated_at ?? null}
        updatedByName={interviewPrepData?.updated_by_name ?? null}
      />
    </div>
  )
}
