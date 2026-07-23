import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'
import { CALL_BRIEFINGS_ENABLED } from '@/lib/feature-flags'
import { APP_HOST } from '@/lib/site'

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

function checkAuth(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const TIME_FMT = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
})

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return run()
}
export async function GET(req: Request) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return run()
}

function buildMarkdown(args: {
  playerFirstName: string
  playerLastName: string
  eventDate: string
  eventTime: string | null
  timezone: string | null
  locale: 'fr' | 'en'
  school: {
    name: string
    division: string | null
    state_code: string | null
    state_full: string | null
    coach_name: string | null
    coach_bio: string | null
    website_url: string | null
    scoreboard_url: string | null
    niche_url: string | null
    instagram_url: string | null
    governing_body: string | null
  } | null
  prep: string | null
}): string {
  const en = args.locale === 'en'
  const dateFmt = new Intl.DateTimeFormat(en ? 'en-US' : 'fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeFmt = new Intl.DateTimeFormat(en ? 'en-US' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const fullName = `${args.playerFirstName} ${args.playerLastName}`
  const dateLabel = dateFmt.format(new Date(`${args.eventDate}T00:00:00`))
  const timeLabel = args.eventTime
    ? `${en ? ' at ' : ' à '}${timeFmt.format(
        new Date(`${args.eventDate}T${args.eventTime}`)
      )}`
    : ''
  const tz = args.timezone ? ` (${args.timezone})` : ''

  const lines: string[] = []
  if (en) {
    lines.push(`# Coach call brief — ${fullName}`)
    lines.push('')
    lines.push(`**Date:** ${dateLabel}${timeLabel}${tz}`)
    if (args.school) {
      lines.push(`**University:** ${args.school.name}`)
      const div = args.school.division ?? ''
      const gov = args.school.governing_body
        ? `${args.school.governing_body} `
        : ''
      const state = args.school.state_full || args.school.state_code || ''
      if (div || state) {
        lines.push(
          `**Division:** ${gov}${div}${state ? ` — ${state}` : ''}`.trim()
        )
      }
      lines.push(
        `**Coach:** ${args.school.coach_name || 'to be researched before the call'}`
      )
    } else {
      lines.push('**University:** _(not linked — to fill in)_')
    }
    lines.push('')
    lines.push('## Useful links')
    if (args.school) {
      const links: string[] = []
      if (args.school.website_url)
        links.push(`- 🌐 [Official team website](${args.school.website_url})`)
      if (args.school.scoreboard_url)
        links.push(`- 📊 [Scoreboard / Ranking](${args.school.scoreboard_url})`)
      if (args.school.niche_url)
        links.push(`- 🎓 [Niche.com](${args.school.niche_url})`)
      if (args.school.instagram_url)
        links.push(`- 📱 [Team Instagram](${args.school.instagram_url})`)
      lines.push(links.length > 0 ? links.join('\n') : '_No links available yet._')
    } else {
      lines.push('_(school not linked)_')
    }
    lines.push('')
    lines.push('## Coach bio')
    lines.push(
      args.school?.coach_bio?.trim() || '_To research before the call._'
    )
    lines.push('')
    lines.push('## Your personalized questions')
    lines.push(
      args.prep?.trim() ||
        '_No personalized prep yet. Add some from the player profile._'
    )
    lines.push('')
    lines.push('## Agent notes (to complete before validation)')
    lines.push('')
    lines.push(
      '_Free space to add specific context: recent recruits, conference, what the coach is looking for this year…_'
    )
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(
      '> Brief auto-generated. Edit above before validating and sending to the player.'
    )
    return lines.join('\n')
  }

  // FR (default)
  lines.push(`# Brief call coach — ${fullName}`)
  lines.push('')
  lines.push(`**Date du call :** ${dateLabel}${timeLabel}${tz}`)
  if (args.school) {
    lines.push(`**Université :** ${args.school.name}`)
    const div = args.school.division ?? ''
    const gov = args.school.governing_body ? `${args.school.governing_body} ` : ''
    const state = args.school.state_full || args.school.state_code || ''
    if (div || state) {
      lines.push(
        `**Division :** ${gov}${div}${state ? ` — ${state}` : ''}`.trim()
      )
    }
    lines.push(
      `**Coach :** ${args.school.coach_name || 'à compléter avant le call'}`
    )
  } else {
    lines.push('**Université :** _(non liée — à compléter)_')
  }
  lines.push('')
  lines.push('## Liens utiles')
  if (args.school) {
    const links: string[] = []
    if (args.school.website_url)
      links.push(`- 🌐 [Site officiel équipe](${args.school.website_url})`)
    if (args.school.scoreboard_url)
      links.push(`- 📊 [Scoreboard / Ranking](${args.school.scoreboard_url})`)
    if (args.school.niche_url)
      links.push(`- 🎓 [Niche.com](${args.school.niche_url})`)
    if (args.school.instagram_url)
      links.push(`- 📱 [Instagram équipe](${args.school.instagram_url})`)
    lines.push(links.length > 0 ? links.join('\n') : '_Aucun lien renseigné._')
  } else {
    lines.push('_(école non liée)_')
  }
  lines.push('')
  lines.push('## Coach bio')
  lines.push(args.school?.coach_bio?.trim() || '_À rechercher avant le call._')
  lines.push('')
  lines.push('## Questions personnalisées du joueur')
  lines.push(
    args.prep?.trim() ||
      '_Aucune prep personnalisée. Édite-la depuis le profil joueur._'
  )
  lines.push('')
  lines.push('## Notes agent (à compléter avant validation)')
  lines.push('')
  lines.push(
    '_Espace libre pour ajouter contexte spécifique : recrues récentes, conférence, ce que le coach cherche cette année…_'
  )
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(
    '> Brief généré automatiquement. Édite ci-dessus avant de valider l’envoi au joueur.'
  )
  return lines.join('\n')
}

async function run() {
  if (!CALL_BRIEFINGS_ENABLED) {
    return NextResponse.json({ disabled: true })
  }
  const supabase = getAdminSupabase()
  const now = new Date()
  // Hobby-plan crons run at most once per day, so widen the lookup window.
  // We scan every call between now+24h and now+72h. The event_id UNIQUE index
  // makes the insert idempotent — re-runs skip events that already have a
  // briefing row.
  const start = new Date(now.getTime() + 24 * 3600 * 1000)
  const end = new Date(now.getTime() + 72 * 3600 * 1000)
  const startDate = start.toISOString().slice(0, 10)
  const endDate = end.toISOString().slice(0, 10)

  const { data: events, error: eventsErr } = await supabase
    .from('calendar_events')
    .select(
      'id, player_id, title, event_date, event_time, timezone, related_school, players:player_id(first_name, last_name, agent_id, preferred_language), schools:related_school(name, division, state_code, state_full, coach_name, coach_bio, website_url, scoreboard_url, niche_url, instagram_url, governing_body)'
    )
    .eq('event_type', 'call')
    .gte('event_date', startDate)
    .lte('event_date', endDate)
  if (eventsErr) {
    return NextResponse.json({ error: eventsErr.message }, { status: 500 })
  }

  let created = 0
  let skipped = 0
  const errors: Array<{ event_id: string; error: string }> = []

  for (const ev of (events ?? []) as Array<{
    id: string
    player_id: string
    title: string
    event_date: string
    event_time: string | null
    timezone: string | null
    related_school: string | null
    players:
      | {
          first_name: string
          last_name: string
          agent_id: string | null
          preferred_language: string | null
        }
      | Array<{
          first_name: string
          last_name: string
          agent_id: string | null
          preferred_language: string | null
        }>
      | null
    schools:
      | {
          name: string
          division: string | null
          state_code: string | null
          state_full: string | null
          coach_name: string | null
          coach_bio: string | null
          website_url: string | null
          scoreboard_url: string | null
          niche_url: string | null
          instagram_url: string | null
          governing_body: string | null
        }
      | Array<{
          name: string
          division: string | null
          state_code: string | null
          state_full: string | null
          coach_name: string | null
          coach_bio: string | null
          website_url: string | null
          scoreboard_url: string | null
          niche_url: string | null
          instagram_url: string | null
          governing_body: string | null
        }>
      | null
  }>) {
    try {
      // Filter precisely: event must be in the next 24h–72h window.
      const eventStart = new Date(
        `${ev.event_date}T${ev.event_time ?? '12:00'}:00`
      )
      const diffMs = eventStart.getTime() - now.getTime()
      if (diffMs < 24 * 3600 * 1000 || diffMs > 72 * 3600 * 1000) continue

      // Already generated?
      const { data: existing } = await supabase
        .from('call_briefings')
        .select('id, status')
        .eq('event_id', ev.id)
        .maybeSingle()
      if (existing) {
        skipped++
        continue
      }

      const player = Array.isArray(ev.players) ? ev.players[0] : ev.players
      if (!player) continue
      const school = Array.isArray(ev.schools) ? ev.schools[0] : ev.schools

      // Fetch interview prep
      const { data: prepRow } = await supabase
        .from('player_interview_prep')
        .select('content_markdown')
        .eq('player_id', ev.player_id)
        .maybeSingle()

      const locale: 'fr' | 'en' =
        player.preferred_language === 'en' ? 'en' : 'fr'

      const markdown = buildMarkdown({
        playerFirstName: player.first_name,
        playerLastName: player.last_name,
        eventDate: ev.event_date,
        eventTime: ev.event_time,
        timezone: ev.timezone,
        locale,
        school: school ?? null,
        prep: prepRow?.content_markdown ?? null,
      })

      const { data: inserted, error: insertErr } = await supabase
        .from('call_briefings')
        .insert({
          event_id: ev.id,
          player_id: ev.player_id,
          school_id: ev.related_school ?? null,
          content_markdown: markdown,
          status: 'draft',
        })
        .select('id')
        .single()
      if (insertErr) throw insertErr

      // Notify agent
      let agentEmail: string | null = null
      let agentFirstName = ''
      if (player.agent_id) {
        const { data: agent } = await supabase
          .from('agents')
          .select('email, first_name')
          .eq('id', player.agent_id)
          .maybeSingle()
        agentEmail = agent?.email ?? null
        agentFirstName = agent?.first_name ?? ''
      }

      if (agentEmail) {
        const cta = `${APP_HOST}/admin/briefings/${inserted.id}/edit`
        const dateLabel = DATE_FMT.format(
          new Date(`${ev.event_date}T00:00:00`)
        )
        const schoolName = school?.name ?? '(école non liée)'
        const subject =
          locale === 'en'
            ? `[USAP] Coach call brief to validate — ${player.first_name} ${player.last_name} / ${schoolName} / ${dateLabel}`
            : `[USAP] Brief call à valider — ${player.first_name} ${player.last_name} / ${schoolName} / ${dateLabel}`
        const html = `<!doctype html><html><body style="background:#FAFAF7;margin:0;padding:24px;font-family:sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;">
    <h1 style="margin:0 0 12px;color:#0B1D58;font-size:20px;">Brief call à valider — ${htmlEscape(player.first_name)} ${htmlEscape(player.last_name)}</h1>
    <p style="color:#0B1D58;font-size:14px;">Salut ${htmlEscape(agentFirstName) || 'l\'agent'},</p>
    <p style="color:#0B1D58;font-size:14px;">Un call coach approche dans 48h avec <strong>${htmlEscape(schoolName)}</strong>.</p>
    <p style="color:#0B1D58;font-size:14px;">Un brief a été pré-généré pour ${htmlEscape(player.first_name)}. Tu peux le relire, l'éditer et l'envoyer.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${cta}" style="display:inline-block;background:#E11D2A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Ouvrir le brief</a>
    </p>
    <p style="margin-top:24px;color:#666;font-size:12px;">Call prévu : <strong>${dateLabel}</strong>. À envoyer idéalement dans les 24h.</p>
  </div>
</body></html>`
        await sendEmail({
          to: agentEmail,
          subject,
          html,
          playerId: ev.player_id,
          templateKey: 'call_briefing_draft',
          payload: { event_id: ev.id, briefing_id: inserted.id },
        })
        await supabase
          .from('call_briefings')
          .update({ agent_notified_at: new Date().toISOString() })
          .eq('id', inserted.id)
      }

      created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push({ event_id: ev.id, error: msg })
    }
  }

  return NextResponse.json({
    scanned: events?.length ?? 0,
    created,
    skipped,
    errors,
  })
}
