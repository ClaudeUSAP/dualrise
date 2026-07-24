import { NextResponse } from 'next/server'
import {
  notifyCoachInterestUp,
  notifyNewCoachNote,
} from '@/lib/email-triggers'
import { createClient } from '@/lib/supabase/server'

type Body = {
  template?: 'note' | 'interest'
  playerId?: string
  schoolName?: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'not authenticated' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as Body
  const template = body.template ?? 'note'
  const schoolName = body.schoolName ?? 'Penn State'

  let playerId = body.playerId
  if (!playerId) {
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    playerId = player?.id
  }
  if (!playerId) {
    return NextResponse.json({ error: 'no player resolvable' }, { status: 400 })
  }

  let result
  if (template === 'interest') {
    result = await notifyCoachInterestUp({
      playerId,
      schoolName,
      oldLevel: 1,
      newLevel: 2,
    })
  } else {
    result = await notifyNewCoachNote({
      playerId,
      schoolName,
      coachName: 'Greg Nye',
      agentName: 'Camille (Agent Dual Rise)',
      noteBody:
        'Call avec coach. Très intéressé par le profil. Demande à voir les 2 derniers résultats.',
    })
  }

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 }
    )
  }
  return NextResponse.json({
    ok: true,
    resendId: result.resendId,
    template,
    schoolName,
  })
}
