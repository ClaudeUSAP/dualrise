'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
  return { supabase, agent }
}

export async function toggleHideDefault(
  playerId: string,
  templateId: string,
  hidden: boolean
) {
  const { supabase } = await ensureAgent()

  // Upsert override
  const { error } = await supabase
    .from('checklist_player_overrides')
    .upsert(
      {
        player_id: playerId,
        template_id: templateId,
        hidden,
      },
      { onConflict: 'player_id,template_id' }
    )
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/checklist')
}

export async function addCustomItem(
  playerId: string,
  data: {
    label: string
    url: string | null
    tooltip: string | null
    due_hint: string | null
    section_label: string
    section_order: number
  }
) {
  const trimmed = data.label.trim()
  if (!trimmed) throw new Error('label required')
  const { supabase } = await ensureAgent()
  const { error } = await supabase.from('checklist_player_overrides').insert({
    player_id: playerId,
    template_id: null,
    custom_label_fr: trimmed,
    custom_url_link: data.url || null,
    custom_tooltip_fr: data.tooltip || null,
    custom_due_hint_fr: data.due_hint || null,
    custom_section_key: data.section_label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    custom_section_label: data.section_label,
    custom_section_order: data.section_order,
    custom_position: 99,
  })
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/checklist')
}

export async function deleteCustomItem(playerId: string, overrideId: string) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('checklist_player_overrides')
    .delete()
    .eq('id', overrideId)
    .eq('player_id', playerId)
    .is('template_id', null)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/checklist')
}

export async function updateDefaultOverride(
  playerId: string,
  templateId: string,
  data: {
    label: string | null
    url: string | null
    tooltip: string | null
    due_hint: string | null
  }
) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('checklist_player_overrides')
    .upsert(
      {
        player_id: playerId,
        template_id: templateId,
        custom_label_fr: data.label || null,
        custom_url_link: data.url || null,
        custom_tooltip_fr: data.tooltip || null,
        custom_due_hint_fr: data.due_hint || null,
      },
      { onConflict: 'player_id,template_id' }
    )
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/checklist')
}

export async function updateCustomItem(
  playerId: string,
  overrideId: string,
  data: {
    label: string
    url: string | null
    tooltip: string | null
    due_hint: string | null
  }
) {
  const trimmed = data.label.trim()
  if (!trimmed) throw new Error('label required')
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('checklist_player_overrides')
    .update({
      custom_label_fr: trimmed,
      custom_url_link: data.url || null,
      custom_tooltip_fr: data.tooltip || null,
      custom_due_hint_fr: data.due_hint || null,
    })
    .eq('id', overrideId)
    .eq('player_id', playerId)
    .is('template_id', null)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/checklist')
}


export async function updateParentEmails(playerId: string, emails: string[]) {
  const cleaned = emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('players')
    .update({ parent_emails: cleaned })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

// Contact/source email of the player (players.player_email). This is NOT the
// login email (auth.users.email) — see changePlayerAccessEmail for that.
// Empty input clears the column. Used to pre-fill the invitation form.
export async function updatePlayerEmail(playerId: string, email: string) {
  const trimmed = email.trim().toLowerCase()
  if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('Email invalide')
  }
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('players')
    .update({ player_email: trimmed || null })
    .eq('id', playerId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function addInternalNote(playerId: string, body: string) {
  const trimmed = body.trim()
  if (!trimmed) throw new Error('body required')
  const { supabase, agent } = await ensureAgent()
  const authorName = `${(agent as { first_name?: string }).first_name ?? ''} ${(agent as { last_name?: string }).last_name ?? ''}`.trim()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error } = await supabase.from('internal_notes').insert({
    player_id: playerId,
    body: trimmed,
    author_id: user?.id ?? null,
    author_name: authorName,
  })
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function deleteInternalNote(noteId: string, playerId: string) {
  const { supabase } = await ensureAgent()
  const { error } = await supabase.from('internal_notes').delete().eq('id', noteId)
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function updatePlayerStatus(playerId: string, status: string) {
  const allowed = ['en_cours', 'committed', 'signed', 'prospect']
  if (!allowed.includes(status)) throw new Error('invalid status')
  const { supabase } = await ensureAgent()
  const { error } = await supabase
    .from('player_crm_data')
    .upsert({ player_id: playerId, status }, { onConflict: 'player_id' })
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/admin/players')
}

export async function updateAgentPayment(
  playerId: string,
  which: 1 | 2,
  params: { amount?: number; paid?: boolean }
) {
  if (which !== 1 && which !== 2) throw new Error('invalid payment slot')
  const { supabase, agent } = await ensureAgent()
  const role = (agent as { role?: string }).role

  // Founder + agent of player can edit agent payments
  if (role !== 'founder') {
    const { data: player } = await supabase
      .from('players')
      .select('agent_id')
      .eq('id', playerId)
      .single()
    if (!player || player.agent_id !== (agent as { id: string }).id) {
      throw new Error('not allowed')
    }
  }

  const patch: Record<string, number | boolean | string | null> = {
    player_id: playerId,
  }
  if (typeof params.amount === 'number') {
    if (!Number.isFinite(params.amount) || params.amount < 0) {
      throw new Error('invalid amount')
    }
    patch[`agent_payment_${which}_amount`] = params.amount
  }
  if (typeof params.paid === 'boolean') {
    patch[`agent_payment_${which}_paid`] = params.paid
    patch[`agent_payment_${which}_paid_at`] = params.paid
      ? new Date().toISOString()
      : null
  }

  const { error } = await supabase
    .from('player_crm_data')
    .upsert(patch, { onConflict: 'player_id' })
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
}

export async function updateFamilyVirement(
  playerId: string,
  which: 1 | 2,
  params: { amount?: number | null; paid?: boolean }
) {
  if (which !== 1 && which !== 2) throw new Error('invalid virement slot')
  const { supabase, agent } = await ensureAgent()
  const role = (agent as { role?: string }).role
  if (role !== 'founder') throw new Error('founder only')

  const patch: Record<string, number | boolean | string | null> = {
    player_id: playerId,
  }
  if (params.amount !== undefined) {
    if (params.amount === null) {
      patch[`virement_${which}_amount`] = null
    } else {
      if (!Number.isFinite(params.amount) || params.amount < 0) {
        throw new Error('invalid amount')
      }
      patch[`virement_${which}_amount`] = params.amount
    }
  }
  if (typeof params.paid === 'boolean') {
    patch[`virement_${which}_paid`] = params.paid
  }

  const { error } = await supabase
    .from('player_crm_data')
    .upsert(patch, { onConflict: 'player_id' })
  if (error) throw error
  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/admin/players')
}

export async function updateChecklistItemsOrder(
  playerId: string,
  items: Array<{ kind: 'default' | 'custom'; id: string; position: number }>
) {
  if (!items.length) return
  const { supabase } = await ensureAgent()

  const defaultRows = items
    .filter((i) => i.kind === 'default')
    .map((i) => ({
      player_id: playerId,
      template_id: i.id,
      custom_position: i.position,
    }))

  if (defaultRows.length > 0) {
    const { error } = await supabase
      .from('checklist_player_overrides')
      .upsert(defaultRows, { onConflict: 'player_id,template_id' })
    if (error) throw error
  }

  const customItems = items.filter((i) => i.kind === 'custom')
  for (const c of customItems) {
    const { error } = await supabase
      .from('checklist_player_overrides')
      .update({ custom_position: c.position })
      .eq('id', c.id)
      .eq('player_id', playerId)
      .is('template_id', null)
    if (error) throw error
  }

  revalidatePath(`/admin/players/${playerId}`)
  revalidatePath('/checklist')
}

export async function toggleChecklistItemAsAgent(
  playerId: string,
  itemKey: string,
  checked: boolean
) {
  const { supabase, agent } = await ensureAgent()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const a = agent as { role?: string; first_name?: string; last_name?: string }
  const role = a.role === 'founder' ? 'founder' : 'agent'
  const authorName = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()

  const { error } = await supabase.from('checklist_progress').upsert(
    {
      player_id: playerId,
      item_key: itemKey,
      checked,
      checked_at: checked ? new Date().toISOString() : null,
      checked_by_user_id: checked ? user?.id ?? null : null,
      checked_by_name: checked ? authorName : null,
      checked_by_role: checked ? role : null,
    },
    { onConflict: 'player_id,item_key' }
  )
  if (error) throw error
  // Pas de revalidatePath ici — l'UI est optimistic côté client.
  // La page sera rafraîchie au prochain navigate naturel.
}
