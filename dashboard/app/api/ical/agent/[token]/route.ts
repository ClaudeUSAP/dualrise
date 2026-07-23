import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const HOST = 'usap-family-dashboard.vercel.app'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function fold(line: string): string {
  if (line.length <= 75) return line
  let out = ''
  let i = 0
  while (i < line.length) {
    const sliceLen = i === 0 ? 75 : 74
    const chunk = line.slice(i, i + sliceLen)
    out += i === 0 ? chunk : '\r\n ' + chunk
    i += sliceLen
  }
  return out
}

function fmtDateOnly(date: string): string {
  return date.replace(/-/g, '')
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

function fmtUtcStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function localToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00Z`)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts: Record<string, string> = {}
  for (const p of fmt.formatToParts(naiveUtc)) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }
  const hour = parts.hour === '24' ? '00' : parts.hour
  const displayedAsTz = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}Z`
  )
  const offsetMs = displayedAsTz.getTime() - naiveUtc.getTime()
  return new Date(naiveUtc.getTime() - offsetMs)
}

type CalendarEventRow = {
  id: string
  title: string
  event_date: string
  event_time: string | null
  event_type: string
  description: string | null
  ical_uid: string | null
  timezone: string | null
  player_id: string
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'invalid token' }, { status: 403 })
  }

  try {
    const supabase = getAdminClient()
    const { data: agent } = await supabase
      .from('agents')
      .select('id, role, first_name, last_name, ical_token')
      .eq('ical_token', token)
      .single()

    if (!agent) {
      return NextResponse.json({ error: 'invalid token' }, { status: 403 })
    }

    const isFounder = (agent as { role?: string }).role === 'founder'

    let playersQuery = supabase.from('players').select('id, first_name, last_name')
    if (!isFounder) playersQuery = playersQuery.eq('agent_id', agent.id)
    const { data: playersRaw } = await playersQuery
    const players = (playersRaw ?? []) as Array<{
      id: string
      first_name: string
      last_name: string
    }>
    const playerById = new Map(players.map((p) => [p.id, p]))

    if (players.length === 0) {
      const body =
        'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//USAP Dashboard//FR\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR\r\n'
      return new NextResponse(body, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Cache-Control': 'no-cache, no-store',
        },
      })
    }

    const { data: events } = await supabase
      .from('calendar_events')
      .select(
        'id, title, event_date, event_time, event_type, description, ical_uid, timezone, player_id'
      )
      .in(
        'player_id',
        players.map((p) => p.id)
      )
      .order('event_date')

    const agentName = `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim()
    const dtstamp = fmtUtcStamp(new Date())

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//USAP Dashboard//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      fold(`NAME:USAP Planning agent - ${agentName}`),
      fold(`X-WR-CALNAME:USAP Planning agent - ${agentName}`),
      'X-WR-TIMEZONE:Europe/Paris',
    ]

    for (const e of (events ?? []) as CalendarEventRow[]) {
      const player = playerById.get(e.player_id)
      const playerName = player ? `${player.first_name} ${player.last_name}` : ''
      const uid = `agent-${e.ical_uid ?? e.id}@${HOST}`
      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${uid}`)
      lines.push(`DTSTAMP:${dtstamp}`)

      if (e.event_time) {
        const tz = e.timezone || 'Europe/Paris'
        const startUtc = localToUtc(e.event_date, e.event_time.slice(0, 5), tz)
        const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000)
        lines.push(`DTSTART:${fmtUtcStamp(startUtc)}`)
        lines.push(`DTEND:${fmtUtcStamp(endUtc)}`)
      } else {
        lines.push(`DTSTART;VALUE=DATE:${fmtDateOnly(e.event_date)}`)
        lines.push(`DTEND;VALUE=DATE:${nextDay(e.event_date)}`)
      }

      const summary = playerName ? `${playerName} — ${e.title}` : e.title
      lines.push(fold(`SUMMARY:${escapeIcsText(summary)}`))
      lines.push(
        fold(`DESCRIPTION:${escapeIcsText(e.description || e.event_type)}`)
      )
      lines.push(`CATEGORIES:${e.event_type.toUpperCase()}`)
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')
    const body = lines.join('\r\n') + '\r\n'

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="usap-agent.ics"',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('agent ical feed error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
