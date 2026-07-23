'use server'

import { render } from '@react-email/render'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { InvitationEmail } from '@/components/emails/InvitationEmail'
import { sendEmail } from '@/lib/email'
import { findPlayerSheet } from '@/lib/google'
import { LOGO_URL } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'

const PLAYER_HOST = 'https://player.usathleticperformance.com'

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

// Look up an existing auth user by email (admin API has no get-by-email, so we
// page through listUsers — same approach as the invite recovery path).
async function findAuthUserByEmail(
  admin: ReturnType<typeof getAdminSupabase>,
  email: string
) {
  const target = email.trim().toLowerCase()
  let page = 1
  while (page <= 20) {
    const { data: listed } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    const match = listed?.users?.find(
      (u) => (u.email ?? '').toLowerCase() === target
    )
    if (match) return match
    if (!listed?.users || listed.users.length < 200) break
    page++
  }
  return null
}

// Generate a magic link for an EXISTING auth user and email it. The email must
// already belong to an auth account — generateLink({type:'magiclink'}) silently
// creates a new account otherwise (the root cause of the duplicate-account bug).
async function sendPlayerMagicLink(
  admin: ReturnType<typeof getAdminSupabase>,
  opts: {
    playerId: string
    firstName: string
    email: string
    agentName: string | null
    isFounder: boolean
    isResend: boolean
  }
) {
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: opts.email,
      options: { redirectTo: `${PLAYER_HOST}/auth/callback` },
    })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw linkErr ?? new Error('generateLink failed')
  }
  const magicLink = `${PLAYER_HOST}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`

  const override =
    process.env.NODE_ENV !== 'production'
      ? process.env.INVITATION_EMAIL_OVERRIDE
      : null
  const recipientEmail =
    override && isValidEmail(override) ? override : opts.email

  const html = await render(
    <InvitationEmail
      role="player"
      firstName={opts.firstName}
      magicLink={magicLink}
      agentName={opts.agentName}
      isFounder={opts.isFounder}
      logoUrl={LOGO_URL}
      loginUrl={`${PLAYER_HOST}/login`}
    />
  )

  return sendEmail({
    to: recipientEmail,
    subject: opts.isResend
      ? `🔁 Ton lien USAP, ${opts.firstName}`
      : `🎉 Bienvenue ${opts.firstName} - Ton dashboard USAP est prêt`,
    html,
    playerId: opts.playerId,
    templateKey: opts.isResend
      ? 'player_invitation_resend'
      : 'player_invitation',
    payload: {
      realEmail: opts.email,
      override: !!override,
      magicLinkPresent: true,
      source: 'change_access_email',
      resend: opts.isResend,
      ccCount: 0,
    },
  })
}

async function ensureAgent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role, first_name, last_name')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) throw new Error('not an agent')
  return { agent }
}

export type InviteCrmPlayerResult =
  | {
      ok: true
      recipientEmail: string
      overrideActive: boolean
      resend: boolean
      ccCount: number
    }
  | { ok: false; error: string }

export async function inviteCrmPlayer(
  playerId: string,
  email: string,
  parentEmailsInput?: string[]
): Promise<InviteCrmPlayerResult> {
  const { agent } = await ensureAgent()

  let trimmedEmail = email.trim().toLowerCase()
  if (!isValidEmail(trimmedEmail)) {
    throw new Error('Email invalide')
  }

  const parentEmails = Array.from(
    new Set(
      (parentEmailsInput ?? [])
        .map((e) => e.trim().toLowerCase())
        .filter((e) => isValidEmail(e))
    )
  )

  const admin = getAdminSupabase()

  const { data: player, error: playerErr } = await admin
    .from('players')
    .select(
      'id, first_name, last_name, graduation_year, gender, agent_id, auth_user_id, sheet_id'
    )
    .eq('id', playerId)
    .single()
  if (playerErr || !player) throw playerErr ?? new Error('Joueur introuvable')

  const isResend = !!player.auth_user_id

  let agentFirstName: string | null = null
  let agentFullName: string | null = null
  let agentIsFounder = false
  if (player.agent_id) {
    const { data: ag } = await admin
      .from('agents')
      .select('first_name, last_name, role')
      .eq('id', player.agent_id)
      .maybeSingle()
    agentFirstName = ag?.first_name ?? null
    agentFullName = ag ? `${ag.first_name ?? ''} ${ag.last_name ?? ''}`.trim() || null : null
    agentIsFounder = ag?.role === 'founder'
  }

  if (!isResend) {
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: trimmedEmail,
        email_confirm: true,
      })

    let newUserId: string
    let recoveredExisting = false

    if (createErr) {
      const code = (createErr as { code?: string }).code
      const status = (createErr as { status?: number }).status
      const isEmailExists = code === 'email_exists' || status === 422
      if (!isEmailExists) {
        throw createErr
      }

      // Email already in auth.users — look it up to decide whether to relink
      // or surface a friendly conflict error.
      let existingUserId: string | null = null
      let page = 1
      while (page <= 10 && !existingUserId) {
        const { data: listed } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        })
        const match = listed?.users?.find(
          (u) => (u.email ?? '').toLowerCase() === trimmedEmail
        )
        if (match) existingUserId = match.id
        if (!listed?.users || listed.users.length < 200) break
        page++
      }
      if (!existingUserId) throw createErr

      // If that auth user is already attached to a different player, refuse.
      const { data: otherPlayer } = await admin
        .from('players')
        .select('id, first_name, last_name')
        .eq('auth_user_id', existingUserId)
        .neq('id', playerId)
        .maybeSingle()
      if (otherPlayer) {
        return {
          ok: false,
          error: `Cet email est déjà rattaché au joueur ${otherPlayer.first_name} ${otherPlayer.last_name}. Si c'est un doublon, supprime cette fiche-ci ou utilise un autre email.`,
        }
      }

      newUserId = existingUserId
      recoveredExisting = true
    } else if (created?.user) {
      newUserId = created.user.id
    } else {
      throw new Error('createUser failed')
    }

    const { error: linkPlayerErr } = await admin
      .from('players')
      .update({
        auth_user_id: newUserId,
        parent_emails: parentEmails,
      })
      .eq('id', playerId)
    if (linkPlayerErr) {
      if (!recoveredExisting) {
        await admin.auth.admin.deleteUser(newUserId).catch(() => undefined)
      }
      throw linkPlayerErr
    }

    if (!player.sheet_id) {
      try {
        const findRes = await findPlayerSheet(
          player.first_name,
          player.last_name
        )
        if (findRes.found && findRes.fileId) {
          await admin
            .from('players')
            .update({ sheet_id: findRes.fileId })
            .eq('id', playerId)
        }
      } catch (err) {
        console.error('[inviteCrmPlayer] sheet auto-link failed:', err)
      }
    }
  } else {
    // Resend flow — authoritatively use the player's EXISTING login email and
    // never the address passed in. Trusting a user-supplied email here is what
    // made generateLink() create a duplicate orphan account. Changing the login
    // email goes through changePlayerAccessEmail() instead.
    const { data: existing } = await admin.auth.admin.getUserById(
      player.auth_user_id as string
    )
    const existingEmail = existing?.user?.email?.toLowerCase()
    if (existingEmail && isValidEmail(existingEmail)) {
      trimmedEmail = existingEmail
    }
    // Refresh parent_emails on the player record
    await admin
      .from('players')
      .update({ parent_emails: parentEmails })
      .eq('id', playerId)
  }

  const { data: existingInv } = await admin
    .from('pending_player_invitations')
    .select('id')
    .eq('player_id', playerId)
    .maybeSingle()

  const nowIso = new Date().toISOString()
  if (existingInv) {
    await admin
      .from('pending_player_invitations')
      .update({
        email: trimmedEmail,
        parent_emails: parentEmails,
        status: 'invited',
        invited_at: nowIso,
        reviewed_by: agent.id,
        reviewed_at: nowIso,
      })
      .eq('id', existingInv.id)
  } else {
    await admin.from('pending_player_invitations').insert({
      first_name: player.first_name,
      last_name: player.last_name,
      email: trimmedEmail,
      parent_emails: parentEmails,
      graduation_year: player.graduation_year,
      gender: player.gender,
      agent_id: player.agent_id,
      agent_first_name: agentFirstName,
      source: 'manual_invite',
      email_source: 'manual',
      status: 'invited',
      invited_at: nowIso,
      reviewed_by: agent.id,
      reviewed_at: nowIso,
      player_id: playerId,
    })
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink(
    {
      type: 'magiclink',
      email: trimmedEmail,
      options: { redirectTo: `${PLAYER_HOST}/auth/callback` },
    }
  )
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw linkErr ?? new Error('generateLink failed')
  }
  const tokenHash = linkData.properties.hashed_token
  const magicLink = `${PLAYER_HOST}/auth/callback?token_hash=${tokenHash}&type=magiclink`

  const override =
    process.env.NODE_ENV !== 'production'
      ? process.env.INVITATION_EMAIL_OVERRIDE
      : null
  const recipientEmail =
    override && isValidEmail(override) ? override : trimmedEmail

  // In override mode (dev), don't CC real parents — all goes to override only
  const cc = override ? undefined : parentEmails.length > 0 ? parentEmails : undefined

  const html = await render(
    <InvitationEmail
      role="player"
      firstName={player.first_name}
      magicLink={magicLink}
      agentName={agentFullName}
      isFounder={agentIsFounder}
      logoUrl={LOGO_URL}
      loginUrl={`${PLAYER_HOST}/login`}
    />
  )

  const emailResult = await sendEmail({
    to: recipientEmail,
    cc,
    subject: 'Ton accès à ton espace USAP',
    html,
    playerId,
    templateKey: isResend ? 'player_invitation_resend' : 'player_invitation',
    payload: {
      realEmail: trimmedEmail,
      override: !!override,
      magicLinkPresent: true,
      source: 'manual_invite',
      resend: isResend,
      ccCount: cc ? (Array.isArray(cc) ? cc.length : 1) : 0,
    },
  })

  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/admin/players')

  if (!emailResult.ok) {
    throw new Error(`Magic link généré mais email failed: ${emailResult.error}`)
  }

  return {
    ok: true,
    recipientEmail,
    overrideActive: !!override,
    resend: isResend,
    ccCount: cc ? (Array.isArray(cc) ? cc.length : 1) : 0,
  }
}

export type ChangeAccessEmailResult =
  | {
      ok: true
      email: string
      changed: boolean
      reconciled: boolean
      oldAccountDeleted: boolean
      linkSent: boolean
    }
  | { ok: false; error: string }

// Change a player's ACCESS / LOGIN email (auth.users.email) the right way:
// update the existing auth account in place — never create a second account.
// If another (orphan) account already owns the target email, re-point the
// player to it, drop the stale membership and delete the abandoned account.
// Keeps players.player_email in sync with the new login email.
export async function changePlayerAccessEmail(
  playerId: string,
  newEmail: string
): Promise<ChangeAccessEmailResult> {
  await ensureAgent()

  const target = newEmail.trim().toLowerCase()
  if (!isValidEmail(target)) return { ok: false, error: 'Email invalide' }

  const admin = getAdminSupabase()

  const { data: player, error: playerErr } = await admin
    .from('players')
    .select('id, first_name, agent_id, auth_user_id')
    .eq('id', playerId)
    .single()
  if (playerErr || !player) return { ok: false, error: 'Joueur introuvable' }
  if (!player.auth_user_id) {
    return {
      ok: false,
      error: 'Ce joueur n’a pas encore de compte — utilise l’invitation.',
    }
  }

  const oldAuthId = player.auth_user_id as string

  const { data: current } = await admin.auth.admin.getUserById(oldAuthId)
  const currentEmail = current?.user?.email?.toLowerCase() ?? null

  let changed = false
  let reconciled = false
  let oldAccountDeleted = false

  if (currentEmail === target) {
    // Already the login email — just keep the contact column aligned.
    await admin.from('players').update({ player_email: target }).eq('id', playerId)
  } else {
    const existing = await findAuthUserByEmail(admin, target)

    if (existing && existing.id === oldAuthId) {
      // Same account already — only the contact column needs aligning.
      await admin
        .from('players')
        .update({ player_email: target })
        .eq('id', playerId)
    } else if (existing) {
      // A different auth account owns this email (typically an orphan from the
      // old bug). Refuse if it belongs to another player.
      const { data: otherPlayer } = await admin
        .from('players')
        .select('id, first_name, last_name')
        .eq('auth_user_id', existing.id)
        .neq('id', playerId)
        .maybeSingle()
      if (otherPlayer) {
        return {
          ok: false,
          error: `Cet email est déjà le compte d’accès de ${otherPlayer.first_name} ${otherPlayer.last_name}. Choisis un autre email.`,
        }
      }
      // Re-point the player to the account that owns the email + sync contact.
      // The trigger inserts the new player_members(role=player) row.
      const { error: relinkErr } = await admin
        .from('players')
        .update({ auth_user_id: existing.id, player_email: target })
        .eq('id', playerId)
      if (relinkErr) return { ok: false, error: relinkErr.message }
      changed = true
      reconciled = true
      // Drop the stale membership and the abandoned account.
      await admin
        .from('player_members')
        .delete()
        .eq('player_id', playerId)
        .eq('auth_user_id', oldAuthId)
      const { error: delErr } = await admin.auth.admin.deleteUser(oldAuthId)
      oldAccountDeleted = !delErr
      if (delErr) {
        console.error('[changePlayerAccessEmail] old account delete failed:', delErr)
      }
    } else {
      // Email is free — rename the existing auth account in place.
      const { error: updErr } = await admin.auth.admin.updateUserById(oldAuthId, {
        email: target,
        email_confirm: true,
      })
      if (updErr) return { ok: false, error: updErr.message }
      changed = true
      await admin
        .from('players')
        .update({ player_email: target })
        .eq('id', playerId)
    }
  }

  let linkSent = false
  if (changed) {
    let agentName: string | null = null
    let agentIsFounder = false
    if (player.agent_id) {
      const { data: ag } = await admin
        .from('agents')
        .select('first_name, last_name, role')
        .eq('id', player.agent_id)
        .maybeSingle()
      agentName = ag
        ? `${ag.first_name ?? ''} ${ag.last_name ?? ''}`.trim() || null
        : null
      agentIsFounder = ag?.role === 'founder'
    }
    try {
      const res = await sendPlayerMagicLink(admin, {
        playerId,
        firstName: player.first_name,
        email: target,
        agentName,
        isFounder: agentIsFounder,
        isResend: true,
      })
      linkSent = res.ok
    } catch (err) {
      console.error('[changePlayerAccessEmail] magic link send failed:', err)
    }
  }

  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/admin/players')

  return { ok: true, email: target, changed, reconciled, oldAccountDeleted, linkSent }
}
