import { render } from '@react-email/render'
import { CoachInterestUpEmail } from '@/components/emails/CoachInterestUpEmail'
import { NewCoachNoteEmail } from '@/components/emails/NewCoachNoteEmail'
import { sendEmail } from './email'
import { APP_HOST, LOGO_URL } from './site'
import { createClient } from './supabase/server'

const DASHBOARD_URL = `${APP_HOST}/schools`

async function getPlayerEmailAndName(
  playerId: string
): Promise<{ email: string | null; firstName: string | null }> {
  const supabase = await createClient()
  const [{ data: email }, { data: player }] = await Promise.all([
    supabase.rpc('get_player_email', { p_player_id: playerId }),
    supabase.from('players').select('first_name').eq('id', playerId).single(),
  ])
  return {
    email: typeof email === 'string' ? email : null,
    firstName: player?.first_name ?? null,
  }
}

export async function notifyCoachInterestUp({
  playerId,
  schoolName,
  oldLevel,
  newLevel,
}: {
  playerId: string
  schoolName: string
  oldLevel: number
  newLevel: number
}) {
  const { email, firstName } = await getPlayerEmailAndName(playerId)
  if (!email) return { ok: false, error: 'no recipient' }

  const html = await render(
    <CoachInterestUpEmail
      playerName={firstName ?? 'champion'}
      schoolName={schoolName}
      oldLevel={oldLevel}
      newLevel={newLevel}
      dashboardUrl={DASHBOARD_URL}
      logoUrl={LOGO_URL}
    />
  )

  return sendEmail({
    to: email,
    subject: `${schoolName} a augmenté son intérêt pour toi`,
    html,
    playerId,
    templateKey: 'coach_interest_up',
    payload: { schoolName, oldLevel, newLevel },
  })
}

export async function notifyNewCoachNote({
  playerId,
  schoolName,
  coachName,
  agentName,
  noteBody,
}: {
  playerId: string
  schoolName: string
  coachName: string | null
  agentName: string
  noteBody: string
}) {
  const { email, firstName } = await getPlayerEmailAndName(playerId)
  if (!email) return { ok: false, error: 'no recipient' }

  const html = await render(
    <NewCoachNoteEmail
      playerName={firstName ?? 'champion'}
      schoolName={schoolName}
      coachName={coachName}
      agentName={agentName}
      noteBody={noteBody}
      dashboardUrl={DASHBOARD_URL}
      logoUrl={LOGO_URL}
    />
  )

  return sendEmail({
    to: email,
    subject: `Nouveau message de ${agentName} sur ${schoolName}`,
    html,
    playerId,
    templateKey: 'new_coach_note',
    payload: { schoolName, coachName, agentName },
  })
}
