'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendEmail } from '@/lib/email'
import { APP_HOST } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
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
  const fullName =
    `${(agent as { first_name?: string }).first_name ?? ''} ${(agent as { last_name?: string }).last_name ?? ''}`.trim() ||
    user.email ||
    'Agent'
  return { supabase, user, agent, fullName }
}

export async function saveBriefingDraft(id: string, content: string) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('call_briefings')
    .update({ content_markdown: content })
    .eq('id', id)
  if (error) throw error
  revalidatePath(`/admin/briefings/${id}/edit`)
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function validateAndSendBriefing(id: string, content: string) {
  const { supabase, user, fullName } = await ensureAgent()

  // Update content + status atomically
  const { error: updateErr } = await supabase
    .from('call_briefings')
    .update({
      content_markdown: content,
      status: 'sent',
      sent_at: new Date().toISOString(),
      validated_by_user_id: user.id,
      validated_by_name: fullName,
    })
    .eq('id', id)
  if (updateErr) throw updateErr

  // Fetch what we need to compose the player email. Use the service client
  // because the player's auth.users email is not visible to the agent's session.
  const admin = getServiceClient()
  const { data: briefing } = await admin
    .from('call_briefings')
    .select(
      'id, player_id, event_id, content_markdown, calendar_events:event_id(event_date, event_time, timezone), players:player_id(first_name, last_name, auth_user_id, preferred_language), schools:school_id(name)'
    )
    .eq('id', id)
    .single()

  if (briefing) {
    const ev = Array.isArray(briefing.calendar_events)
      ? briefing.calendar_events[0]
      : briefing.calendar_events
    const player = Array.isArray(briefing.players)
      ? briefing.players[0]
      : briefing.players
    const school = Array.isArray(briefing.schools)
      ? briefing.schools[0]
      : briefing.schools

    let to: string | null = null
    if (player?.auth_user_id) {
      const { data: emailRow } = await admin.rpc('get_player_email', {
        p_player_id: briefing.player_id,
      })
      if (typeof emailRow === 'string') to = emailRow
    }

    if (to && ev && player) {
      const lang: 'fr' | 'en' =
        player.preferred_language === 'en' ? 'en' : 'fr'
      const intl = lang === 'en' ? 'en-US' : 'fr-FR'
      const dateF = new Intl.DateTimeFormat(intl, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      const timeF = new Intl.DateTimeFormat(intl, {
        hour: '2-digit',
        minute: '2-digit',
      })
      const dateLabel = dateF.format(new Date(`${ev.event_date}T00:00:00`))
      const timeLabel = ev.event_time
        ? `${lang === 'en' ? ' at ' : ' à '}${timeF.format(new Date(`${ev.event_date}T${ev.event_time}`))}`
        : ''
      const schoolName =
        school?.name ?? (lang === 'en' ? 'your call' : 'ton call')
      const cta = `${APP_HOST}/briefings/${briefing.id}`

      const subject =
        lang === 'en'
          ? `Prepare for your call with ${schoolName} — ${dateLabel}${timeLabel}`
          : `Prépare ton call avec ${schoolName} — ${dateLabel}${timeLabel}`

      const html =
        lang === 'en'
          ? `<!doctype html><html><body style="background:#FAFAF7;margin:0;padding:24px;font-family:sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
    <h1 style="margin:0 0 12px;color:#0B1D58;font-size:20px;">Prepare for your coach call 📞</h1>
    <p style="color:#0B1D58;font-size:14px;">Hi ${htmlEscape(player.first_name)},</p>
    <p style="color:#0B1D58;font-size:14px;">Your agent has prepared a brief for your call with <strong>${htmlEscape(schoolName)}</strong>, scheduled <strong>${dateLabel}${timeLabel}</strong>.</p>
    <p style="color:#0B1D58;font-size:14px;">Take 10 minutes to read it before the call — everything's inside: useful links, coach bio, questions to ask, agent notes.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${cta}" style="display:inline-block;background:#E11D2A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">View the brief on my dashboard</a>
    </p>
  </div>
</body></html>`
          : `<!doctype html><html><body style="background:#FAFAF7;margin:0;padding:24px;font-family:sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
    <h1 style="margin:0 0 12px;color:#0B1D58;font-size:20px;">Prépare ton call coach 📞</h1>
    <p style="color:#0B1D58;font-size:14px;">Salut ${htmlEscape(player.first_name)},</p>
    <p style="color:#0B1D58;font-size:14px;">Ton agent t'a préparé un brief pour ton call avec <strong>${htmlEscape(schoolName)}</strong>, prévu <strong>${dateLabel}${timeLabel}</strong>.</p>
    <p style="color:#0B1D58;font-size:14px;">Prends 10 minutes pour le relire avant l'appel — tout est dedans : liens utiles, bio coach, questions à mettre en avant, contexte agent.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${cta}" style="display:inline-block;background:#E11D2A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Voir le brief sur mon dashboard</a>
    </p>
  </div>
</body></html>`

      await sendEmail({
        to,
        subject,
        html,
        playerId: briefing.player_id,
        templateKey: 'call_briefing_sent',
        payload: { briefing_id: briefing.id, locale: lang },
      })
    }
  }

  revalidatePath(`/admin/briefings/${id}/edit`)
  revalidatePath('/schools')
  revalidatePath(`/briefings/${id}`)
  redirect('/admin/planning')
}

export async function archiveBriefing(id: string) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('call_briefings')
    .update({ status: 'archived' })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/admin/planning')
  redirect('/admin/planning')
}
