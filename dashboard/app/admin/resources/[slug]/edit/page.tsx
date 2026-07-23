import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditArticleForm } from '../../EditArticleForm'

export const dynamic = 'force-dynamic'

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent || (agent as { role?: string }).role !== 'founder') {
    redirect('/admin/players')
  }

  const { data } = await supabase
    .from('knowledge_articles')
    .select(
      'slug, title_fr, title_en, emoji, excerpt_fr, excerpt_en, content_markdown, content_markdown_en, position, active'
    )
    .eq('slug', slug)
    .maybeSingle()

  if (!data) notFound()

  return (
    <EditArticleForm
      mode={{
        kind: 'edit',
        slug: data.slug,
        initial: {
          title_fr: data.title_fr ?? '',
          title_en:
            (data as { title_en?: string | null }).title_en ?? '',
          emoji: data.emoji ?? '',
          excerpt_fr: data.excerpt_fr ?? '',
          excerpt_en:
            (data as { excerpt_en?: string | null }).excerpt_en ?? '',
          content_markdown: data.content_markdown ?? '',
          content_markdown_en:
            (data as { content_markdown_en?: string | null })
              .content_markdown_en ?? '',
          position: data.position ?? 0,
          active: data.active ?? true,
        },
      }}
    />
  )
}
