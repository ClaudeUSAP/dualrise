'use server'

import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function suggestCorrection(
  fieldKey: string,
  fieldLabel: string,
  currentValue: string,
  suggestion: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select('first_name, last_name')
        .eq('id', member.player_id)
        .single()
    : { data: null }

  const playerName = player
    ? `${player.first_name} ${player.last_name}`
    : user.email

  const html = `
    <h2>Suggestion de correction profil SCOUT</h2>
    <p><strong>Joueur</strong> : ${playerName}</p>
    <p><strong>Email</strong> : ${user.email}</p>
    <p><strong>Champ</strong> : ${fieldLabel} (<code>${fieldKey}</code>)</p>
    <p><strong>Valeur actuelle</strong> : ${currentValue}</p>
    <p><strong>Suggestion du joueur</strong> :</p>
    <blockquote style="border-left: 3px solid #E11D2A; padding-left: 12px; margin: 8px 0;">
      ${suggestion.replace(/\n/g, '<br/>')}
    </blockquote>
    <p style="font-size: 12px; color: #888; margin-top: 24px;">
      Va dans SCOUT pour vérifier et corriger si nécessaire.
    </p>
  `

  await sendEmail({
    to: 'nicolas@usathleticperformance.com',
    subject: `[USAP] Correction profil SCOUT — ${playerName} — ${fieldLabel}`,
    html,
    templateKey: 'scout_correction',
    payload: { fieldKey, currentValue, suggestion },
  })
}
