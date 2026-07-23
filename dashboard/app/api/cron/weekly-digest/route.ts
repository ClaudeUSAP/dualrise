import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { signUnsub } from '@/lib/digest-unsubscribe'
import { sendEmail } from '@/lib/email'
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

function dateFmt(locale: 'fr' | 'en') {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}
function timeFmt(locale: 'fr' | 'en') {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const COPY_FR = {
  h1: (week: string) => `Ton récap USAP — semaine du ${week}`,
  hello: (name: string) => `Coucou ${name} 👋`,
  section1: 'Nouvelles facs ajoutées cette semaine',
  section2: 'Prochains calls coachs',
  section3: 'Tâches ouvertes',
  empty:
    'Pas de mouvement cette semaine. Ouvre ton dashboard pour avancer sur les prochaines étapes.',
  stageLabel: 'stage :',
  atTime: ' à ',
  cta: 'Ouvrir mon dashboard',
  footer: 'USAP Dashboard — envoyé seulement les semaines avec du nouveau.',
  unsub: 'Se désinscrire de ces emails',
}
const COPY_EN = {
  h1: (week: string) => `Your USAP summary — week of ${week}`,
  hello: (name: string) => `Hi ${name} 👋`,
  section1: 'New schools added this week',
  section2: 'Upcoming coach calls',
  section3: 'Open tasks',
  empty:
    "Nothing moved this week. Open your dashboard to keep things going.",
  stageLabel: 'stage:',
  atTime: ' at ',
  cta: 'Open my dashboard',
  footer: 'USAP Dashboard — only sent on weeks with something new.',
  unsub: 'Unsubscribe from these emails',
}

// Returns the Monday 00:00 of the week containing `now` in Europe/Paris time.
function weekStartParis(now: Date): Date {
  // ISO weekday: Monday=1..Sunday=7
  const d = new Date(now)
  const day = (d.getUTCDay() + 6) % 7 // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

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

async function run() {
  const supabase = getAdminSupabase()
  const now = new Date()
  const weekStart = weekStartParis(now)
  const weekStartISO = weekStart.toISOString()
  const weekStartDate = weekStartISO.slice(0, 10)
  const nowISO = now.toISOString()
  const todayDate = now.toISOString().slice(0, 10)
  const in14Date = new Date(now.getTime() + 14 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select(
      'id, first_name, last_name, auth_user_id, parent_emails, weekly_digest_optin, preferred_language'
    )
    .eq('weekly_digest_optin', true)
  if (playersErr) {
    return NextResponse.json({ error: playersErr.message }, { status: 500 })
  }

  let sentCount = 0
  let skippedCount = 0
  const errors: Array<{ player_id: string; error: string }> = []
  const log: Array<{ player_id: string; recipients: string[]; sections: number }> = []

  for (const p of players ?? []) {
    try {
      // Skip if already sent this week
      const { data: existingLog } = await supabase
        .from('digest_log')
        .select('id')
        .eq('player_id', p.id)
        .eq('week_start', weekStartDate)
        .maybeSingle()
      if (existingLog) {
        skippedCount++
        continue
      }

      // Recipients: the player's own login email (opted-in by the query above)
      // + parent emails, minus any parent who unsubscribed.
      let playerEmail: string | null = null
      if (p.auth_user_id) {
        const { data: emailRow } = await supabase.rpc('get_player_email', {
          p_player_id: p.id,
        })
        if (typeof emailRow === 'string' && emailRow) playerEmail = emailRow.trim()
      }
      const { data: optoutRows } = await supabase
        .from('parent_digest_optouts')
        .select('email')
        .eq('player_id', p.id)
      const optedOut = new Set(
        ((optoutRows ?? []) as Array<{ email: string }>).map((r) =>
          (r.email ?? '').toLowerCase()
        )
      )
      const parentEmails = ((p.parent_emails as string[] | null) ?? [])
        .filter((e): e is string => typeof e === 'string' && e.includes('@'))
        .map((e) => e.trim())
        .filter((e) => !optedOut.has(e.toLowerCase()))

      // 1. New schools added this week
      const { data: newAssignments } = await supabase
        .from('school_assignments')
        .select('stage, schools(name, division, governing_body)')
        .eq('player_id', p.id)
        .gte('created_at', weekStartISO)
        .lte('created_at', nowISO)
      const newAssignmentsList = (newAssignments ?? []) as Array<{
        stage: string
        schools:
          | { name: string; division: string; governing_body: string | null }
          | { name: string; division: string; governing_body: string | null }[]
          | null
      }>

      // 2. Upcoming calls in next 14 days
      const { data: callsRaw } = await supabase
        .from('calendar_events')
        .select('title, event_date, event_time, schools:related_school(name)')
        .eq('player_id', p.id)
        .eq('event_type', 'call')
        .gte('event_date', todayDate)
        .lte('event_date', in14Date)
        .order('event_date')
        .order('event_time')
      const calls = (callsRaw ?? []) as Array<{
        title: string
        event_date: string
        event_time: string | null
        schools: { name: string } | { name: string }[] | null
      }>

      // 3. Tasks pending in next 7 days (we render all open tasks since
      //    due_date_text is free-form; the player decides relevance).
      const { data: tasksRaw } = await supabase
        .from('player_tasks')
        .select('title, due_date_text, schools:school_id(name)')
        .eq('player_id', p.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)
      const tasks = (tasksRaw ?? []) as Array<{
        title: string
        due_date_text: string | null
        schools: { name: string } | { name: string }[] | null
      }>

      // Player locale — parents (when no auth user) fall back to FR by default.
      const playerLocale: 'fr' | 'en' =
        p.preferred_language === 'en' ? 'en' : 'fr'
      const dateF = dateFmt(playerLocale)
      const timeF = timeFmt(playerLocale)
      const L = playerLocale === 'en' ? COPY_EN : COPY_FR

      // Only send if something NEW happened this week: new schools added, or new
      // calls scheduled this week. Standing tasks / already-known upcoming calls
      // don't trigger a send — quiet weeks are skipped entirely (no email).
      const { count: newCallsCount } = await supabase
        .from('calendar_events')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', p.id)
        .eq('event_type', 'call')
        .gte('created_at', weekStartISO)
        .lte('created_at', nowISO)
      const hasNew = newAssignmentsList.length > 0 || (newCallsCount ?? 0) > 0
      if (!hasNew) {
        skippedCount++
        continue
      }

      const sections: string[] = []

      if (newAssignmentsList.length > 0) {
        sections.push(
          `<h2 style="margin-top:24px;color:#0B1D58;font-family:sans-serif;font-size:16px;">🏫 ${L.section1}</h2>
           <ul style="margin:0;padding-left:20px;font-family:sans-serif;font-size:14px;color:#0B1D58;">
             ${newAssignmentsList
               .map((a) => {
                 const s = Array.isArray(a.schools) ? a.schools[0] : a.schools
                 if (!s) return ''
                 const gov = s.governing_body
                   ? ` ${htmlEscape(s.governing_body)}`
                   : ''
                 return `<li><strong>${htmlEscape(s.name)}</strong> — ${htmlEscape(s.division)}${gov} <span style="color:#666;">· ${L.stageLabel} ${htmlEscape(a.stage)}</span></li>`
               })
               .join('')}
           </ul>`
        )
      }

      if (calls.length > 0) {
        sections.push(
          `<h2 style="margin-top:24px;color:#0B1D58;font-family:sans-serif;font-size:16px;">📞 ${L.section2}</h2>
           <ul style="margin:0;padding-left:20px;font-family:sans-serif;font-size:14px;color:#0B1D58;">
             ${calls
               .map((c) => {
                 const date = dateF.format(new Date(`${c.event_date}T00:00:00`))
                 const time = c.event_time
                   ? `${L.atTime}${timeF.format(new Date(`${c.event_date}T${c.event_time}`))}`
                   : ''
                 const s = Array.isArray(c.schools) ? c.schools[0] : c.schools
                 const sch = s?.name ? ` — ${htmlEscape(s.name)}` : ''
                 return `<li><strong>${date}${time}</strong>${sch}</li>`
               })
               .join('')}
           </ul>`
        )
      }

      if (tasks.length > 0) {
        sections.push(
          `<h2 style="margin-top:24px;color:#0B1D58;font-family:sans-serif;font-size:16px;">⏰ ${L.section3}</h2>
           <ul style="margin:0;padding-left:20px;font-family:sans-serif;font-size:14px;color:#0B1D58;">
             ${tasks
               .map((t) => {
                 const due = t.due_date_text
                   ? ` <span style="color:#E11D2A;">(${htmlEscape(t.due_date_text)})</span>`
                   : ''
                 const s = Array.isArray(t.schools) ? t.schools[0] : t.schools
                 const sch = s?.name
                   ? ` <span style="color:#666;">· ${htmlEscape(s.name)}</span>`
                   : ''
                 return `<li>${htmlEscape(t.title)}${due}${sch}</li>`
               })
               .join('')}
           </ul>`
        )
      }

      // Build the per-recipient target list. We send ONE email per recipient
      // (not a shared To:) so each gets its own unsubscribe link and parents
      // never see each other's addresses.
      const targets: Array<{ email: string; role: 'player' | 'parent' }> = []
      if (playerEmail) targets.push({ email: playerEmail, role: 'player' })
      for (const e of parentEmails) targets.push({ email: e, role: 'parent' })
      if (targets.length === 0) {
        skippedCount++
        continue
      }

      const subject =
        playerLocale === 'en'
          ? `Your USAP weekly summary — ${p.first_name}`
          : `Ton récap USAP de la semaine — ${p.first_name}`
      const sectionsHtml = sections.join('')

      const sent: string[] = []
      let anyOk = false
      let lastErr: string | null = null
      for (const tgt of targets) {
        const token = signUnsub({
          r: tgt.role,
          p: p.id,
          ...(tgt.role === 'parent' ? { e: tgt.email } : {}),
          l: playerLocale,
        })
        const unsubUrl = `${APP_HOST}/api/digest/unsubscribe?token=${encodeURIComponent(token)}`
        const html = `<!doctype html><html><body style="background:#FAFAF7;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;font-family:sans-serif;">
    <h1 style="margin:0 0 8px;color:#0B1D58;font-size:22px;">${L.h1(dateF.format(weekStart))}</h1>
    <p style="margin:0;color:#666;font-size:14px;">${L.hello(htmlEscape(p.first_name))}</p>
    ${sectionsHtml}
    <p style="margin-top:32px;text-align:center;">
      <a href="${APP_HOST}/schools" style="display:inline-block;background:#E11D2A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">${L.cta}</a>
    </p>
    <p style="margin-top:32px;color:#999;font-size:11px;text-align:center;">${L.footer}<br><a href="${unsubUrl}" style="color:#999;">${L.unsub}</a></p>
  </div>
</body></html>`

        const res = await sendEmail({
          to: tgt.email,
          subject,
          html,
          playerId: p.id,
          templateKey: 'weekly_digest',
          payload: {
            week_start: weekStartDate,
            sections: sections.length,
            locale: playerLocale,
            role: tgt.role,
          },
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })
        if (res.ok) {
          anyOk = true
          sent.push(tgt.email)
        } else {
          lastErr = res.error ?? 'send failed'
        }
      }

      // Log per player+week so we never re-send the same week.
      await supabase.from('digest_log').insert({
        player_id: p.id,
        week_start: weekStartDate,
        recipients: sent,
        status: anyOk ? 'sent' : 'failed',
        errors: anyOk ? null : lastErr,
      })

      if (anyOk) {
        sentCount++
        log.push({ player_id: p.id, recipients: sent, sections: sections.length })
      } else {
        errors.push({ player_id: p.id, error: lastErr ?? 'send failed' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push({ player_id: p.id, error: msg })
    }
  }

  return NextResponse.json({
    weekStart: weekStartDate,
    playersChecked: players?.length ?? 0,
    sent: sentCount,
    skipped: skippedCount,
    errors,
    log,
  })
}
