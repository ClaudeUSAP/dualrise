'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

async function requireFounder() {
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
  if (!agent || agent.role !== 'founder') throw new Error('founder only')
  const fullName =
    `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim() ||
    user.email ||
    'Founder'
  return { supabase, user, fullName }
}

function revalidateAll(slug?: string) {
  revalidatePath('/resources')
  revalidatePath('/admin/resources')
  if (slug) revalidatePath(`/resources/${slug}`)
}

export type ArticlePayload = {
  title_fr: string
  title_en: string
  emoji: string
  excerpt_fr: string
  excerpt_en: string
  content_markdown: string
  content_markdown_en: string
  position: number
  active: boolean
}

export async function updateArticle(slug: string, payload: ArticlePayload) {
  if (!SLUG_RE.test(slug)) throw new Error('invalid slug')
  if (!payload.title_fr.trim()) throw new Error('title required')
  if (!payload.content_markdown.trim()) throw new Error('content required')
  if (!Number.isInteger(payload.position)) throw new Error('invalid position')

  const { supabase, user, fullName } = await requireFounder()
  const { error } = await supabase
    .from('knowledge_articles')
    .update({
      title_fr: payload.title_fr.trim(),
      title_en: payload.title_en.trim() || null,
      emoji: payload.emoji.trim() || null,
      excerpt_fr: payload.excerpt_fr.trim() || null,
      excerpt_en: payload.excerpt_en.trim() || null,
      content_markdown: payload.content_markdown,
      content_markdown_en: payload.content_markdown_en.trim() || null,
      position: payload.position,
      active: payload.active,
      updated_at: new Date().toISOString(),
      updated_by_user_id: user.id,
      updated_by_name: fullName,
    })
    .eq('slug', slug)
  if (error) throw error
  revalidateAll(slug)
}

export async function createArticle(
  payload: ArticlePayload & { slug: string }
) {
  if (!SLUG_RE.test(payload.slug)) throw new Error('invalid slug')
  if (!payload.title_fr.trim()) throw new Error('title required')
  if (!payload.content_markdown.trim()) throw new Error('content required')
  if (!Number.isInteger(payload.position)) throw new Error('invalid position')

  const { supabase, user, fullName } = await requireFounder()
  const { error } = await supabase.from('knowledge_articles').insert({
    slug: payload.slug,
    title_fr: payload.title_fr.trim(),
    title_en: payload.title_en.trim() || null,
    emoji: payload.emoji.trim() || null,
    excerpt_fr: payload.excerpt_fr.trim() || null,
    excerpt_en: payload.excerpt_en.trim() || null,
    content_markdown: payload.content_markdown,
    content_markdown_en: payload.content_markdown_en.trim() || null,
    position: payload.position,
    active: payload.active,
    updated_by_user_id: user.id,
    updated_by_name: fullName,
  })
  if (error) throw error
  revalidateAll(payload.slug)
  redirect(`/admin/resources/${payload.slug}/edit`)
}

export async function deleteArticle(slug: string) {
  if (!SLUG_RE.test(slug)) throw new Error('invalid slug')
  const { supabase } = await requireFounder()
  const { error } = await supabase
    .from('knowledge_articles')
    .delete()
    .eq('slug', slug)
  if (error) throw error
  revalidateAll(slug)
}

export async function setActive(slug: string, active: boolean) {
  if (!SLUG_RE.test(slug)) throw new Error('invalid slug')
  const { supabase, user, fullName } = await requireFounder()
  const { error } = await supabase
    .from('knowledge_articles')
    .update({
      active,
      updated_at: new Date().toISOString(),
      updated_by_user_id: user.id,
      updated_by_name: fullName,
    })
    .eq('slug', slug)
  if (error) throw error
  revalidateAll(slug)
}

export async function setPosition(slug: string, position: number) {
  if (!SLUG_RE.test(slug)) throw new Error('invalid slug')
  if (!Number.isInteger(position) || position < 0) {
    throw new Error('invalid position')
  }
  const { supabase, user, fullName } = await requireFounder()
  const { error } = await supabase
    .from('knowledge_articles')
    .update({
      position,
      updated_at: new Date().toISOString(),
      updated_by_user_id: user.id,
      updated_by_name: fullName,
    })
    .eq('slug', slug)
  if (error) throw error
  revalidateAll(slug)
}
