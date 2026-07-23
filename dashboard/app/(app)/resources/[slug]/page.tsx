import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'
import { ArticleMarkdown } from '../ArticleMarkdown'

// Player-specific interview-prep banner means we can't statically cache.
export const dynamic = 'force-dynamic'

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export default async function ResourceArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const locale = await getViewerLocale(supabase)
  const { data } = await supabase
    .from('knowledge_articles')
    .select(
      'slug, title_fr, title_en, emoji, content_markdown, content_markdown_en, updated_at, updated_by_name'
    )
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (!data) notFound()

  const title =
    locale === 'en' && (data as { title_en?: string | null }).title_en
      ? (data as { title_en: string }).title_en
      : data.title_fr
  const content =
    locale === 'en' &&
    (data as { content_markdown_en?: string | null }).content_markdown_en
      ? (data as { content_markdown_en: string }).content_markdown_en
      : (data.content_markdown ?? '')

  // On the communication-coachs article, show a banner pointing to the
  // viewer's personal interview prep when it exists *and* the player's
  // show_interview_prep flag hasn't been turned off by their agent.
  let showPrepBanner = false
  if (slug === 'communication-coachs') {
    const member = await getViewerMember(supabase)
    if (member) {
      const [{ data: prep }, { data: playerFlags }] = await Promise.all([
        supabase
          .from('player_interview_prep')
          .select('content_markdown')
          .eq('player_id', member.player_id)
          .maybeSingle(),
        supabase
          .from('players')
          .select('show_interview_prep')
          .eq('id', member.player_id)
          .maybeSingle(),
      ])
      const visible =
        (playerFlags as { show_interview_prep?: boolean | null } | null)
          ?.show_interview_prep ?? true
      showPrepBanner = visible && !!prep?.content_markdown?.trim()
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/resources"
        className="inline-block text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:text-orange"
      >
        {serverT(locale, 'resources.back')}
      </Link>

      <header className="mt-3 mb-8 flex items-start gap-4 border-b border-line pb-6">
        <span className="text-5xl leading-none" aria-hidden>
          {data.emoji ?? '📄'}
        </span>
        <h1 className="display text-3xl font-bold text-navy sm:text-4xl">
          {title}
        </h1>
      </header>

      {showPrepBanner && (
        <Link
          href="/resources/interview-prep"
          className="mb-6 flex items-center gap-3 rounded-md border-l-4 border-orange bg-orange/10 px-4 py-3 transition-colors hover:bg-orange/15"
        >
          <span className="text-2xl leading-none" aria-hidden>
            🎯
          </span>
          <span className="flex-1 text-sm text-navy">
            {serverT(locale, 'resources.commsCoachBanner')}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-orange">
            {serverT(locale, 'resources.seePrep')}
          </span>
        </Link>
      )}

      <article>
        <ArticleMarkdown source={content} />
      </article>

      <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">
        {serverT(locale, 'resources.lastUpdated')} :{' '}
        {data.updated_at ? DATE_FMT.format(new Date(data.updated_at)) : '—'}
        {data.updated_by_name
          ? ` ${serverT(locale, 'resources.by')} ${data.updated_by_name}`
          : ''}
      </footer>
    </div>
  )
}
