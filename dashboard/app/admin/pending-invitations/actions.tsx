'use server'

import { render } from '@react-email/render'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { InvitationEmail } from '@/components/emails/InvitationEmail'
import { sendEmail } from '@/lib/email'
import { findPlayerSheet } from '@/lib/google'
import { findScoutAthleteId } from '@/lib/scout-link'
import { APP_HOST, LOGO_URL } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

function isValidEmail(email: string | null | undefined): email is string {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

async function getCurrentAgent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data: agent, error } = await supabase
    .from('agents')
    .select('id, first_name, last_name')
    .eq('auth_user_id', user.id)
    .single()
  if (error || !agent) throw error ?? new Error('not an agent')
  return agent
}

export async function approveInvitation(invitationId: string) {
  const agent = await getCurrentAgent()
  const admin = getAdminSupabase()

  const { data: invitation, error: fetchErr } = await admin
    .from('pending_player_invitations')
    .select('*')
    .eq('id', invitationId)
    .single()
  if (fetchErr || !invitation) throw fetchErr ?? new Error('invitation not found')
  if (invitation.status !== 'pending') {
    throw new Error(`invitation status is ${invitation.status}, not pending`)
  }
  if (!isValidEmail(invitation.email)) {
    throw new Error(
      'invalid or missing email — edit the invitation before approving'
    )
  }

  const realEmail = invitation.email.trim().toLowerCase()

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email: realEmail,
      email_confirm: true,
    }
  )
  if (createErr || !created?.user) {
    throw createErr ?? new Error('createUser failed')
  }
  const newUserId = created.user.id

  const { data: existingCrmRow } = await admin
    .from('players')
    .select('id, sheet_id')
    .ilike('first_name', invitation.first_name)
    .ilike('last_name', invitation.last_name)
    .eq('graduation_year', invitation.graduation_year)
    .is('auth_user_id', null)
    .maybeSingle()

  const parentEmails = Array.isArray(invitation.parent_emails)
    ? (invitation.parent_emails as string[])
    : []

  let player: { id: string }
  if (existingCrmRow) {
    const { data: linked, error: linkErr } = await admin
      .from('players')
      .update({
        auth_user_id: newUserId,
        gender: invitation.gender,
        agent_id: invitation.agent_id,
        parent_emails: parentEmails,
      })
      .eq('id', existingCrmRow.id)
      .select('id')
      .single()
    if (linkErr || !linked) {
      await admin.auth.admin.deleteUser(newUserId).catch(() => undefined)
      throw linkErr ?? new Error('player link failed')
    }
    player = linked
  } else {
    const { data: inserted, error: playerErr } = await admin
      .from('players')
      .insert({
        auth_user_id: newUserId,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        graduation_year: invitation.graduation_year,
        gender: invitation.gender,
        agent_id: invitation.agent_id,
        parent_emails: parentEmails,
      })
      .select('id')
      .single()
    if (playerErr || !inserted) {
      await admin.auth.admin.deleteUser(newUserId).catch(() => undefined)
      throw playerErr ?? new Error('player insert failed')
    }
    player = inserted
  }

  // §6.6bis: best-effort auto-link to the player's SCOUT athlete by normalized
  // name. Only fills scout_athlete_id when empty (never overwrites); requires a
  // unique non-archived name match. Non-blocking — a unlinked player is fine
  // (the weekly catch-up reconciles the rest).
  try {
    const scoutAthleteId = await findScoutAthleteId(
      invitation.first_name,
      invitation.last_name
    )
    if (scoutAthleteId) {
      await admin
        .from('players')
        .update({ scout_athlete_id: scoutAthleteId })
        .eq('id', player.id)
        .is('scout_athlete_id', null)
    }
  } catch (err) {
    console.error('[approveInvitation] scout auto-link failed:', err)
  }

  // Auto-link Drive sheet (Liste Facs) — skip if already linked manually
  try {
    const alreadyLinkedSheetId = existingCrmRow?.sheet_id ?? null
    if (alreadyLinkedSheetId) {
      // Already manually linked — keep it, no Drive search
    } else {
      const findRes = await findPlayerSheet(invitation.first_name, invitation.last_name)
      if (findRes.found && findRes.fileId) {
        await admin
          .from('players')
          .update({ sheet_id: findRes.fileId })
          .eq('id', player.id)
      } else {
      const candidatesText = findRes.candidates.length === 0
        ? '<p>Aucun fichier trouvé.</p>'
        : `<p>Plusieurs candidats trouvés :</p><ul>${findRes.candidates.map((c) => `<li>${c.name} (${c.id})</li>`).join('')}</ul>`
      await sendEmail({
        to: 'nicolas@usathleticperformance.com',
        subject: `[USAP] Sheet Liste Facs introuvable pour ${invitation.first_name} ${invitation.last_name}`,
        html: `
          <p>Le joueur <strong>${invitation.first_name} ${invitation.last_name}</strong> vient d'être approved mais aucun sheet "Liste Facs" n'a pu être lié automatiquement.</p>
          ${candidatesText}
          <p>Action requise : crée/vérifie son sheet <code>${invitation.first_name} ${invitation.last_name} - Liste Facs</code> dans le dossier Clients.</p>
          <p>Une fois fait, le sync automatique nocturne le linkera.</p>
        `,
          playerId: player.id,
          templateKey: 'sheet_link_warning',
          payload: {
            firstName: invitation.first_name,
            lastName: invitation.last_name,
            candidatesCount: findRes.candidates.length,
          },
        })
      }
    }
  } catch (err) {
    console.error('[approveInvitation] sheet auto-link failed:', err)
  }

  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: realEmail,
      options: {
        redirectTo: `${APP_HOST}/auth/callback`,
      },
    })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw linkErr ?? new Error('generateLink failed')
  }
  const tokenHash = linkData.properties.hashed_token
  const magicLink = `${APP_HOST}/auth/callback?token_hash=${tokenHash}&type=magiclink`

  const override =
    process.env.NODE_ENV !== 'production'
      ? process.env.INVITATION_EMAIL_OVERRIDE
      : null
  const recipientEmail =
    override && isValidEmail(override) ? override : realEmail

  let agentFullName: string | null = invitation.agent_first_name ?? null
  let agentIsFounder = false
  if (invitation.agent_id) {
    const { data: ag } = await admin
      .from('agents')
      .select('first_name, last_name, role')
      .eq('id', invitation.agent_id)
      .maybeSingle()
    if (ag) {
      agentFullName = `${ag.first_name ?? ''} ${ag.last_name ?? ''}`.trim() || agentFullName
      agentIsFounder = ag.role === 'founder'
    }
  }

  const html = await render(
    <InvitationEmail
      role="player"
      firstName={invitation.first_name}
      magicLink={magicLink}
      agentName={agentFullName}
      isFounder={agentIsFounder}
      logoUrl={LOGO_URL}
      loginUrl={`${APP_HOST}/login`}
    />
  )

  const emailResult = await sendEmail({
    to: recipientEmail,
    subject: 'Ton accès à ton espace USAP',
    html,
    playerId: player.id,
    templateKey: 'player_invitation',
    payload: {
      realEmail,
      override: !!override,
      magicLinkPresent: true,
    },
  })
  if (!emailResult.ok) {
    console.error(
      `[approveInvitation] email failed for ${recipientEmail}: ${emailResult.error}`
    )
  }

  await admin
    .from('pending_player_invitations')
    .update({
      status: 'invited',
      invited_at: new Date().toISOString(),
      reviewed_by: agent.id,
      reviewed_at: new Date().toISOString(),
      player_id: player.id,
    })
    .eq('id', invitationId)

  revalidatePath('/admin/pending-invitations')

  return {
    ok: emailResult.ok,
    recipientEmail,
    overrideActive: !!override,
    error: emailResult.error ?? null,
  }
}

export async function declineInvitation(
  invitationId: string,
  reason: string | null
) {
  const agent = await getCurrentAgent()
  const admin = getAdminSupabase()
  const { error } = await admin
    .from('pending_player_invitations')
    .update({
      status: 'declined',
      notes: reason && reason.trim() ? reason.trim() : null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: agent.id,
    })
    .eq('id', invitationId)
  if (error) throw error
  revalidatePath('/admin/pending-invitations')
}

export async function updateInvitationEmail(
  invitationId: string,
  newEmail: string
) {
  await getCurrentAgent()
  const trimmed = newEmail.trim().toLowerCase()
  if (!isValidEmail(trimmed)) throw new Error('invalid email format')
  const admin = getAdminSupabase()
  const { error } = await admin
    .from('pending_player_invitations')
    .update({
      email: trimmed,
      email_source: 'manual',
    })
    .eq('id', invitationId)
  if (error) throw error
  revalidatePath('/admin/pending-invitations')
}

export async function updateInvitationParentEmails(
  invitationId: string,
  emails: string[]
) {
  await getCurrentAgent()
  const cleaned = Array.from(
    new Set(
      emails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0 && isValidEmail(e))
    )
  )
  const admin = getAdminSupabase()
  const { error } = await admin
    .from('pending_player_invitations')
    .update({ parent_emails: cleaned })
    .eq('id', invitationId)
  if (error) throw error
  revalidatePath('/admin/pending-invitations')
}
