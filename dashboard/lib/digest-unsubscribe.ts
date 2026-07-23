import { createHmac, timingSafeEqual } from 'crypto'

// Signed, tamper-proof unsubscribe tokens — no DB token column needed, and the
// same mechanism works for the player and for each parent email. The payload is
// public (base64url JSON) but signed with a server secret so it can't be forged.
export type UnsubPayload = {
  r: 'player' | 'parent' // recipient role
  p: string // player_id
  e?: string // parent email (parent only)
  l?: 'fr' | 'en' // locale for the confirmation page
}

function secret(): string {
  const s =
    process.env.DIGEST_UNSUB_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('No secret available for digest unsubscribe tokens')
  return s
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function sig(body: string): string {
  return b64url(createHmac('sha256', secret()).update(body).digest())
}

export function signUnsub(payload: UnsubPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  return `${body}.${sig(body)}`
}

export function verifyUnsub(token: string | null | undefined): UnsubPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  let expected: string
  try {
    expected = sig(body)
  } catch {
    return null
  }
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as UnsubPayload
    if (payload.r !== 'player' && payload.r !== 'parent') return null
    if (!payload.p) return null
    if (payload.r === 'parent' && !payload.e) return null
    return payload
  } catch {
    return null
  }
}
