import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

type SendEmailParams = {
  to: string | string[]
  cc?: string | string[]
  subject: string
  html: string
  playerId?: string | null
  templateKey: string
  payload?: Record<string, unknown> | null
  headers?: Record<string, string>
}

const FROM = 'USAP Dashboard <noreply@notifications.usathleticperformance.com>'

export async function sendEmail({
  to,
  cc,
  subject,
  html,
  playerId = null,
  templateKey,
  payload = null,
  headers,
}: SendEmailParams): Promise<{ ok: boolean; error?: string; resendId?: string }> {
  const supabase = await createClient()

  const recipientForLog = Array.isArray(to) ? to.join(', ') : to

  const { data: notifId, error: logError } = await supabase.rpc(
    'log_notification_pending',
    {
      p_player_id: playerId,
      p_template_key: templateKey,
      p_recipient_email: recipientForLog,
      p_subject: subject,
      p_payload: payload,
    }
  )
  if (logError) {
    console.error('log_notification_pending failed:', logError)
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    const errorMsg = 'RESEND_API_KEY not set'
    console.warn('[email]', errorMsg)
    if (notifId) {
      await supabase.rpc('log_notification_result', {
        p_id: notifId,
        p_status: 'failed',
        p_resend_id: null,
        p_error: errorMsg,
      })
    }
    return { ok: false, error: errorMsg }
  }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    ...(cc ? { cc } : {}),
    subject,
    html,
    ...(headers ? { headers } : {}),
  })

  if (error) {
    const errorMsg = error.message ?? String(error)
    console.error('[email] Resend error:', errorMsg)
    if (notifId) {
      await supabase.rpc('log_notification_result', {
        p_id: notifId,
        p_status: 'failed',
        p_resend_id: null,
        p_error: errorMsg,
      })
    }
    return { ok: false, error: errorMsg }
  }

  if (notifId) {
    await supabase.rpc('log_notification_result', {
      p_id: notifId,
      p_status: 'sent',
      p_resend_id: data?.id ?? null,
      p_error: null,
    })
  }

  return { ok: true, resendId: data?.id }
}
