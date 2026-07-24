import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
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

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
})

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return await runDigest()
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return await runDigest()
}

async function runDigest() {
  const supabase = getAdminSupabase()
  const sinceISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const upToISO = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, first_name, last_name, parent_emails')
    .not('parent_emails', 'is', null)
  if (playersErr) {
    return NextResponse.json({ error: playersErr.message }, { status: 500 })
  }

  const results: Array<{ playerId: string; sent: number; skipped: boolean; error?: string }> = []

  for (const p of players ?? []) {
    const emails = (p.parent_emails as string[] | null) ?? []
    if (emails.length === 0) {
      results.push({ playerId: p.id, sent: 0, skipped: true })
      continue
    }

    // Fetch this week's data
    const { data: newAssignments } = await supabase
      .from('school_assignments')
      .select('created_at, stage, schools(name)')
      .eq('player_id', p.id)
      .gte('created_at', sinceISO)

    const { data: newNotes } = await supabase
      .from('school_call_notes')
      .select('note_date, body, author_type, author_name, school_assignments!inner(player_id, schools(name))')
      .eq('school_assignments.player_id', p.id)
      .eq('visibility', 'shared')
      .gte('created_at', sinceISO)

    const { data: progress } = await supabase
      .from('checklist_progress')
      .select('item_key, updated_at')
      .eq('player_id', p.id)
      .eq('checked', true)
      .gte('updated_at', sinceISO)

    const { data: events } = await supabase
      .from('calendar_events')
      .select('title, start_at')
      .eq('player_id', p.id)
      .gte('start_at', new Date().toISOString())
      .lte('start_at', upToISO)
      .order('start_at', { ascending: true })

    const aCount = (newAssignments ?? []).length
    const nCount = (newNotes ?? []).length
    const cCount = (progress ?? []).length
    const eCount = (events ?? []).length

    if (aCount + nCount + cCount + eCount === 0) {
      // Skip — nothing new
      results.push({ playerId: p.id, sent: 0, skipped: true })
      continue
    }

    const html = buildDigestHTML({
      firstName: p.first_name,
      newAssignments: (newAssignments ?? []).map((a: any) => ({
        name: a.schools?.name ?? '?',
        stage: a.stage,
      })),
      newNotes: (newNotes ?? []).map((n: any) => ({
        school: n.school_assignments?.schools?.name ?? '?',
        date: n.note_date,
        author: n.author_name,
        body: n.body,
      })),
      checklistChecked: cCount,
      events: (events ?? []).map((e: any) => ({
        title: e.title,
        date: e.start_at,
      })),
    })

    let sentCount = 0
    for (const email of emails) {
      try {
        const r = await sendEmail({
          to: email,
          subject: `📬 Récap de la semaine — ${p.first_name} ${p.last_name}`,
          html,
          playerId: p.id,
          templateKey: 'parent_digest_weekly',
          payload: { aCount, nCount, cCount, eCount },
        })
        if (r.ok) sentCount++
      } catch (err) {
        console.error('digest send failed', email, err)
      }
    }
    results.push({ playerId: p.id, sent: sentCount, skipped: false })
  }

  return NextResponse.json({ players: results.length, results })
}

function buildDigestHTML(data: {
  firstName: string
  newAssignments: Array<{ name: string; stage: string }>
  newNotes: Array<{ school: string; date: string; author: string; body: string }>
  checklistChecked: number
  events: Array<{ title: string; date: string }>
}): string {
  const sections: string[] = []
  if (data.newAssignments.length > 0) {
    const items = data.newAssignments
      .map((a) => `<li>${escapeHtml(a.name)} <em>(${escapeHtml(a.stage)})</em></li>`)
      .join('')
    sections.push(`<h3>📋 Nouvelles écoles dans le pipeline</h3><ul>${items}</ul>`)
  }
  if (data.newNotes.length > 0) {
    const items = data.newNotes
      .map(
        (n) =>
          `<li><strong>${escapeHtml(n.school)}</strong> · ${escapeHtml(DATE_FMT.format(new Date(n.date)))} · ${escapeHtml(n.author)}<br/><em>${escapeHtml(n.body.slice(0, 200))}${n.body.length > 200 ? '…' : ''}</em></li>`
      )
      .join('')
    sections.push(`<h3>💬 Échanges avec l'agent</h3><ul>${items}</ul>`)
  }
  if (data.checklistChecked > 0) {
    sections.push(`<h3>✅ Checklist</h3><p>${data.checklistChecked} tâche${data.checklistChecked > 1 ? 's' : ''} cochée${data.checklistChecked > 1 ? 's' : ''} cette semaine.</p>`)
  }
  if (data.events.length > 0) {
    const items = data.events
      .map(
        (e) =>
          `<li>${escapeHtml(DATE_FMT.format(new Date(e.date)))} — ${escapeHtml(e.title)}</li>`
      )
      .join('')
    sections.push(`<h3>📅 Cette semaine au calendrier</h3><ul>${items}</ul>`)
  }

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #0B1D58;">
      <h2 style="color: #E11D2A;">Cette semaine pour ${escapeHtml(data.firstName)}</h2>
      ${sections.join('\n')}
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="font-size: 12px; color: #888;">
        <a href="${APP_HOST}" style="color: #E11D2A;">Accéder au dashboard Dual Rise</a><br/>
        Vous recevez ce digest car votre email est lié au profil de ${escapeHtml(data.firstName)}.
      </p>
    </div>
  `
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
