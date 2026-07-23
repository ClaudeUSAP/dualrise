'use server'

import { render } from '@react-email/render'
import { revalidatePath } from 'next/cache'
import { NewTaskEmail } from '@/components/emails/NewTaskEmail'
import { sendEmail } from '@/lib/email'
import { APP_HOST, LOGO_URL } from '@/lib/site'
import { createClient } from '@/lib/supabase/server'

const TASKS_URL = `${APP_HOST}/tasks`

async function ensureAgent() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { data: agent } = await supabase
    .from('agents')
    .select('id, role, first_name, last_name')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) throw new Error('not an agent')
  return { supabase, agent, user }
}

export async function createTask(
  playerId: string,
  params: {
    title: string
    description?: string | null
    due_date_text?: string | null
    school_id?: string | null
  }
) {
  const title = params.title.trim()
  if (!title) throw new Error('title required')

  const { supabase, agent, user } = await ensureAgent()
  const a = agent as { first_name?: string; last_name?: string }
  const agentName = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()

  const { data: task, error: insertErr } = await supabase
    .from('player_tasks')
    .insert({
      player_id: playerId,
      title,
      description: params.description?.trim() || null,
      due_date_text: params.due_date_text?.trim() || null,
      school_id: params.school_id ?? null,
      assigned_by_user_id: user.id,
      assigned_by_name: agentName,
    })
    .select('id')
    .single()
  if (insertErr || !task) throw insertErr ?? new Error('task insert failed')

  const { data: player } = await supabase
    .from('players')
    .select('first_name, parent_emails')
    .eq('id', playerId)
    .single()

  const { data: emailData } = await supabase.rpc('get_player_email', {
    p_player_id: playerId,
  })
  const playerEmail =
    typeof emailData === 'string' && emailData.trim().length > 0
      ? emailData.trim()
      : null

  const parentEmails: string[] = Array.isArray(player?.parent_emails)
    ? (player?.parent_emails as string[]).filter(
        (e) => typeof e === 'string' && e.trim().length > 0
      )
    : []

  let schoolName: string | null = null
  if (params.school_id) {
    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('id', params.school_id)
      .single()
    schoolName = school?.name ?? null
  }

  if (playerEmail || parentEmails.length > 0) {
    const html = await render(
      <NewTaskEmail
        playerFirstName={player?.first_name ?? ''}
        agentName={agentName}
        title={title}
        description={params.description?.trim() || null}
        dueDateText={params.due_date_text?.trim() || null}
        schoolName={schoolName}
        dashboardUrl={TASKS_URL}
        logoUrl={LOGO_URL}
      />
    )

    const to = playerEmail ?? parentEmails[0]
    const cc =
      playerEmail && parentEmails.length > 0
        ? parentEmails
        : !playerEmail && parentEmails.length > 1
          ? parentEmails.slice(1)
          : undefined

    const sendResult = await sendEmail({
      to,
      cc,
      subject: `Nouvelle tâche USAP : ${title}`,
      html,
      playerId,
      templateKey: 'player_task_assigned',
      payload: {
        taskId: task.id,
        title,
        dueDateText: params.due_date_text ?? null,
        schoolId: params.school_id ?? null,
        recipientCount: 1 + (cc ? (Array.isArray(cc) ? cc.length : 1) : 0),
      },
    })

    if (sendResult.ok) {
      await supabase
        .from('player_tasks')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', task.id)
    }
  }

  revalidatePath(`/admin/players/${playerId}`)
  return task.id
}

export async function toggleTaskDone(taskId: string, done: boolean) {
  const { supabase, agent, user } = await ensureAgent()
  const a = agent as { role?: string; first_name?: string; last_name?: string }
  const role = a.role === 'founder' ? 'founder' : 'agent'
  const name = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()

  const { data: task, error } = await supabase
    .from('player_tasks')
    .update({
      status: done ? 'done' : 'pending',
      done_at: done ? new Date().toISOString() : null,
      done_by_user_id: done ? user.id : null,
      done_by_name: done ? name : null,
      done_by_role: done ? role : null,
    })
    .eq('id', taskId)
    .select('player_id')
    .single()
  if (error) throw error

  if (task) revalidatePath(`/admin/players/${task.player_id}`)
}

export async function deleteTask(taskId: string) {
  const { supabase } = await ensureAgent()
  const { data: task, error } = await supabase
    .from('player_tasks')
    .delete()
    .eq('id', taskId)
    .select('player_id')
    .single()
  if (error) throw error
  if (task) revalidatePath(`/admin/players/${task.player_id}`)
}
