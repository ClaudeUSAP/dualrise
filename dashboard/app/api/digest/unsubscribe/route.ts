import { createClient as createAdminClient } from '@supabase/supabase-js'
import { verifyUnsub } from '@/lib/digest-unsubscribe'

export const runtime = 'nodejs'

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env not set')
  return createAdminClient(url, key, { auth: { persistSession: false } })
}

const COPY = {
  fr: {
    confirmTitle: 'Se désinscrire des emails USAP',
    confirmBody:
      'Tu ne recevras plus le récap hebdomadaire USAP. Confirme ci-dessous.',
    confirmBtn: 'Confirmer la désinscription',
    doneTitle: 'Désinscription confirmée',
    doneBody:
      'C’est fait — tu ne recevras plus le récap hebdomadaire. Tu peux te réabonner à tout moment depuis ton dashboard.',
    invalid: 'Lien invalide ou expiré.',
  },
  en: {
    confirmTitle: 'Unsubscribe from USAP emails',
    confirmBody:
      'You will stop receiving the USAP weekly summary. Confirm below.',
    confirmBtn: 'Confirm unsubscribe',
    doneTitle: 'Unsubscribe confirmed',
    doneBody:
      'Done — you will no longer receive the weekly summary. You can re-subscribe anytime from your dashboard.',
    invalid: 'Invalid or expired link.',
  },
}

function page(inner: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"></head>
<body style="background:#FAFAF7;margin:0;padding:24px;font-family:sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:8px;padding:32px;text-align:center;color:#0B1D58;">
    ${inner}
  </div>
</body></html>`
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(page(body), {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

async function applyOptOut(token: string): Promise<boolean> {
  const payload = verifyUnsub(token)
  if (!payload) return false
  const admin = getAdminSupabase()
  if (payload.r === 'player') {
    const { error } = await admin
      .from('players')
      .update({ weekly_digest_optin: false })
      .eq('id', payload.p)
    return !error
  }
  // parent
  const { error } = await admin
    .from('parent_digest_optouts')
    .upsert(
      { player_id: payload.p, email: (payload.e ?? '').trim().toLowerCase() },
      { onConflict: 'player_id,email' }
    )
  return !error
}

// GET → confirmation page (no mutation, so email-scanner prefetches can't
// accidentally unsubscribe). The button POSTs to the same URL.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  const payload = verifyUnsub(token)
  const L = COPY[payload?.l === 'en' ? 'en' : 'fr']
  if (!payload) return htmlResponse(`<p>${L.invalid}</p>`, 400)
  const action = `/api/digest/unsubscribe?token=${encodeURIComponent(token ?? '')}`
  return htmlResponse(
    `<h2 style="margin:0 0 12px;">${L.confirmTitle}</h2>
     <p style="color:#666;font-size:14px;">${L.confirmBody}</p>
     <form method="POST" action="${action}" style="margin-top:24px;">
       <button type="submit" style="background:#E11D2A;color:#fff;border:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:14px;cursor:pointer;">${L.confirmBtn}</button>
     </form>`
  )
}

// POST → apply. Handles both the confirmation-page button and the one-click
// List-Unsubscribe-Post (RFC 8058) request from Gmail/Outlook.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  const payload = verifyUnsub(token)
  const L = COPY[payload?.l === 'en' ? 'en' : 'fr']
  if (!payload) return htmlResponse(`<p>${L.invalid}</p>`, 400)
  const ok = await applyOptOut(token!)
  if (!ok) return htmlResponse(`<p>${L.invalid}</p>`, 400)
  return htmlResponse(
    `<h2 style="margin:0 0 12px;">${L.doneTitle}</h2>
     <p style="color:#666;font-size:14px;">${L.doneBody}</p>`
  )
}
