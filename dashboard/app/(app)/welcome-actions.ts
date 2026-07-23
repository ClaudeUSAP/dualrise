'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import { getViewerMember } from '@/lib/get-viewer-player'
import { APP_HOST } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function welcomeHtml(firstName: string, agentName: string | null, locale: 'fr' | 'en') {
  const name = htmlEscape(firstName)
  const agent = agentName ? htmlEscape(agentName) : null
  if (locale === 'en') {
    return `<!doctype html><html><body style="background:#FAFAF7;margin:0;padding:24px;font-family:sans-serif;color:#0B1D58;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
    <h1 style="margin:0 0 16px;color:#0B1D58;font-size:22px;">Welcome to your USAP dashboard 👋</h1>
    <p style="font-size:14px;line-height:1.55;">Hi ${name},</p>
    <p style="font-size:14px;line-height:1.55;">Welcome to your personal USAP dashboard. This is your space to track your study &amp; golf project in the United States.</p>
    <h2 style="font-size:16px;margin-top:24px;">Here's what you'll find:</h2>
    <ul style="font-size:14px;line-height:1.6;padding-left:20px;">
      <li>🏌️ <strong>Your school pipeline</strong> — all the universities your agent is working on for you, organized by stage (interested, talks, committed).</li>
      <li>📋 <strong>Your admin checklist</strong> — visa, transcript translation, Duolingo, embassy appointment. Checked off by you or your agent.</li>
      <li>📅 <strong>Your calendar</strong> — coach calls, tournaments, deadlines. Subscribe via Google Calendar / iCal from the calendar page.</li>
      <li>🎓 <strong>The Resources section</strong> — a wiki on US divisions, scholarships, how to communicate with coaches.</li>
      <li>📝 <strong>Your personalized interview prep</strong> — questions to ask coaches and the ones they might ask you. Your agent updates it before each important call.</li>
      <li>🗺️ <strong>The map of ~1,400 universities</strong> — visualize every US college golf program by division.</li>
    </ul>
    ${agent ? `<p style="font-size:14px;line-height:1.55;margin-top:24px;">Your USAP agent <strong>${agent}</strong> remains your main point of contact. The dashboard helps them save time but doesn't replace your conversations.</p>` : ''}
    <p style="font-size:14px;line-height:1.55;">Any questions? Write to your agent or to <a href="mailto:nicolas@usathleticperformance.com" style="color:#E11D2A;">nicolas@usathleticperformance.com</a>.</p>
    <p style="text-align:center;margin-top:28px;">
      <a href="${APP_HOST}/schools" style="display:inline-block;background:#E11D2A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Open my dashboard</a>
    </p>
    <p style="margin-top:24px;font-size:12px;color:#666;">— The USAP team</p>
  </div>
</body></html>`
  }
  return `<!doctype html><html><body style="background:#FAFAF7;margin:0;padding:24px;font-family:sans-serif;color:#0B1D58;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
    <h1 style="margin:0 0 16px;color:#0B1D58;font-size:22px;">Bienvenue sur ton dashboard USAP 👋</h1>
    <p style="font-size:14px;line-height:1.55;">Salut ${name},</p>
    <p style="font-size:14px;line-height:1.55;">Bienvenue sur ton dashboard USAP personnel. C'est ton espace pour suivre ton projet d'études et de golf aux États-Unis.</p>
    <h2 style="font-size:16px;margin-top:24px;">Ce que tu y trouves :</h2>
    <ul style="font-size:14px;line-height:1.6;padding-left:20px;">
      <li>🏌️ <strong>Ta pipeline de facs</strong> — toutes les universités sur lesquelles ton agent travaille pour toi, classées par stage (intéressé, en échange, engagé).</li>
      <li>📋 <strong>Ta checklist admin</strong> — visa, traduction bulletins, Duolingo, RDV ambassade. Cochée par toi ou ton agent.</li>
      <li>📅 <strong>Ton calendrier</strong> — calls coachs, tournois, deadlines. Abonne-toi via Google Calendar / iCal depuis la page calendrier.</li>
      <li>🎓 <strong>La section Ressources</strong> — un wiki pour comprendre les divisions, les bourses, comment communiquer avec les coachs.</li>
      <li>📝 <strong>Ta préparation entretien personnalisée</strong> — les questions à poser et celles qu'on te posera. Ton agent l'enrichit avant chaque call important.</li>
      <li>🗺️ <strong>La carte des ~1 400 universités</strong> — visualise chaque programme de golf US par division.</li>
    </ul>
    ${agent ? `<p style="font-size:14px;line-height:1.55;margin-top:24px;">Ton agent USAP <strong>${agent}</strong> reste ton point de contact principal. Le dashboard lui fait gagner du temps mais ne remplace pas vos échanges.</p>` : ''}
    <p style="font-size:14px;line-height:1.55;">Une question ? Écris à ton agent ou à <a href="mailto:nicolas@usathleticperformance.com" style="color:#E11D2A;">nicolas@usathleticperformance.com</a>.</p>
    <p style="text-align:center;margin-top:28px;">
      <a href="${APP_HOST}/schools" style="display:inline-block;background:#E11D2A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Ouvrir mon dashboard</a>
    </p>
    <p style="margin-top:24px;font-size:12px;color:#666;">— L'équipe USAP</p>
  </div>
</body></html>`
}

export async function acknowledgeWelcome() {
  const supabase = await createClient()
  const member = await getViewerMember(supabase)
  if (!member) return

  // Check whether we've already acknowledged before — only first-time triggers
  // the email so re-opening + closing the modal won't re-send.
  const { data: priorState } = await supabase
    .from('players')
    .select('welcome_seen_at, preferred_language, first_name, auth_user_id, agent_id')
    .eq('id', member.player_id)
    .maybeSingle()

  const alreadySeen = !!priorState?.welcome_seen_at

  // players RLS UPDATE is agent/founder-only — a player/parent write here
  // silently affects 0 rows. The viewer is already verified via member,
  // so persist welcome_seen_at through the service role.
  await getServiceClient()
    .from('players')
    .update({ welcome_seen_at: new Date().toISOString() })
    .eq('id', member.player_id)

  // Fire the welcome email on first acknowledgement. Failures are non-blocking
  // so the modal close always succeeds.
  if (!alreadySeen && priorState?.auth_user_id) {
    try {
      const admin = getServiceClient()
      const { data: emailRow } = await admin.rpc('get_player_email', {
        p_player_id: member.player_id,
      })
      const to = typeof emailRow === 'string' && emailRow ? emailRow : null
      if (to) {
        let agentName: string | null = null
        if (priorState.agent_id) {
          const { data: agent } = await admin
            .from('agents')
            .select('first_name, last_name')
            .eq('id', priorState.agent_id)
            .maybeSingle()
          if (agent) {
            agentName =
              `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() || null
          }
        }
        const lang: 'fr' | 'en' =
          priorState.preferred_language === 'en' ? 'en' : 'fr'
        const subject =
          lang === 'en'
            ? 'Welcome to your USAP dashboard'
            : 'Bienvenue sur ton dashboard USAP'
        await sendEmail({
          to,
          subject,
          html: welcomeHtml(priorState.first_name, agentName, lang),
          playerId: member.player_id,
          templateKey: 'welcome',
          payload: { locale: lang },
        })
      }
    } catch (err) {
      console.error('welcome email failed:', err)
    }
  }

  revalidatePath('/schools')
}
