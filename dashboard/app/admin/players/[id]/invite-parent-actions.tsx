'use server'

import { render } from '@react-email/render'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { InvitationEmail } from '@/components/emails/InvitationEmail'
import { sendEmail } from '@/lib/email'
import { APP_HOST, LOGO_URL } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'

const PLAYER_HOST = APP_HOST

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

export async function invitePlayerParent(
  playerId: string,
  parentEmail: string
): Promise<{ ok: boolean; recipientEmail: string; overrideActive: boolean }> {
  await ensureAgent()

  const trimmedEmail = parentEmail.trim().toLowerCase()
  if (!isValidEmail(trimmedEmail)) {
    throw new Error('Email parent invalide')
  }

  const admin = getAdminSupabase()

  const { data: player, error: playerErr } = await admin
    .from('players')
    .select('id, first_name, last_name, agent_id')
    .eq('id', playerId)
    .single()
  if (playerErr || !player) throw playerErr ?? new Error('Joueur introuvable')

  let agentFullName: string | null = null
  let agentIsFounder = false
  if (player.agent_id) {
    const { data: ag } = await admin
      .from('agents')
      .select('first_name, last_name, role')
      .eq('id', player.agent_id)
      .maybeSingle()
    agentFullName = ag ? `${ag.first_name ?? ''} ${ag.last_name ?? ''}`.trim() || null : null
    agentIsFounder = ag?.role === 'founder'
  }

  // Find or create auth user for this parent email
  let parentAuthId: string | null = null
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: trimmedEmail,
    email_confirm: true,
  })
  if (createErr) {
    // User may already exist — try to find them via listUsers
    let page = 1
    while (page <= 10 && !parentAuthId) {
      const { data: listed } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      const match = listed?.users?.find(
        (u) => (u.email ?? '').toLowerCase() === trimmedEmail
      )
      if (match) parentAuthId = match.id
      if (!listed?.users || listed.users.length < 200) break
      page++
    }
    if (!parentAuthId) {
      throw createErr ?? new Error('createUser failed')
    }
  } else if (created?.user) {
    parentAuthId = created.user.id
  }
  if (!parentAuthId) throw new Error('parent auth_user_id not resolved')

  // Link as parent in player_members (idempotent via PK)
  const { error: memberErr } = await admin.from('player_members').upsert(
    {
      player_id: playerId,
      auth_user_id: parentAuthId,
      role: 'parent',
    },
    { onConflict: 'player_id,auth_user_id' }
  )
  if (memberErr) throw memberErr

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: trimmedEmail,
    options: { redirectTo: `${PLAYER_HOST}/auth/callback` },
  })
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

  const html = await render(
    <InvitationEmail
      role="parent"
      firstName={player.first_name}
      magicLink={magicLink}
      agentName={agentFullName}
      isFounder={agentIsFounder}
      logoUrl={LOGO_URL}
      loginUrl={`${PLAYER_HOST}/login`}
    />
  )

  const result = await sendEmail({
    to: recipientEmail,
    subject: "Votre accès à l'espace Dual Rise de votre enfant",
    html,
    playerId,
    templateKey: 'parent_invitation',
    payload: {
      realEmail: trimmedEmail,
      override: !!override,
      role: 'parent',
    },
  })

  revalidatePath(`/admin/players/${playerId}`)

  if (!result.ok) {
    throw new Error(`Magic link généré mais email failed: ${result.error}`)
  }

  return { ok: true, recipientEmail, overrideActive: !!override }
}
