import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

type ArticleCard = {
  slug: string
  title_fr: string
  title_en: string | null
  emoji: string | null
  excerpt_fr: string | null
  excerpt_en: string | null
  position: number
}

export default async function ResourcesPage() {
  const supabase = await createClient()
  const locale = await getViewerLocale(supabase)
  const { data } = await supabase
    .from('knowledge_articles')
    .select('slug, title_fr, title_en, emoji, excerpt_fr, excerpt_en, position')
    .eq('active', true)
    .order('position', { ascending: true })

  const articles = (data ?? []) as ArticleCard[]

  // If the viewer is a player or parent and an interview prep exists, surface it.
  // Hidden when their player.show_interview_prep is false (agent has archived it).
  let hasInterviewPrep = false
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
    hasInterviewPrep = visible && !!prep?.content_markdown?.trim()
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="display text-3xl text-navy sm:text-4xl">
          {serverT(locale, 'resources.title')}
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          {serverT(locale, 'resources.subtitle')}
        </p>
      </header>

      {hasInterviewPrep && (
        <Link
          href="/resources/interview-prep"
          className="mb-6 flex items-center gap-4 rounded-md border border-orange/40 bg-orange/10 p-4 transition-all hover:border-orange hover:shadow-md"
        >
          <span className="text-3xl leading-none" aria-hidden>
            🎯
          </span>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-navy">
              {serverT(locale, 'resources.interviewPrep.title')}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {serverT(locale, 'resources.interviewPrep.subtitle')}
            </p>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wide text-orange">
            {serverT(locale, 'schools.briefingBanner.open')}
          </span>
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* External resource — Ranking & Impact Table (story.usathleticperformance.com) */}
        <a
          href="https://story.usathleticperformance.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col rounded-md border border-line bg-white p-5 transition-all hover:scale-[1.02] hover:border-orange hover:shadow-lg"
        >
          <div className="mb-3 text-3xl leading-none" aria-hidden>
            📊
          </div>
          <h2 className="text-lg font-semibold text-navy transition-colors group-hover:text-orange">
            {serverT(locale, 'resources.rankingImpact.title')}
          </h2>
          <p className="mt-1 text-sm text-muted line-clamp-3">
            {serverT(locale, 'resources.rankingImpact.description')}
          </p>
          <span className="mt-auto pt-3 text-[11px] font-bold uppercase tracking-wide text-orange">
            {serverT(locale, 'resources.rankingImpact.open')}
          </span>
        </a>

        {articles.length > 0 &&
          articles.map((a) => {
            const title =
              locale === 'en' && a.title_en ? a.title_en : a.title_fr
            const excerpt =
              locale === 'en' && a.excerpt_en ? a.excerpt_en : a.excerpt_fr
            return (
              <Link
                key={a.slug}
                href={`/resources/${a.slug}`}
                className="group flex flex-col rounded-md border border-line bg-white p-5 transition-all hover:scale-[1.02] hover:border-orange hover:shadow-lg"
              >
                <div className="mb-3 text-3xl leading-none" aria-hidden>
                  {a.emoji ?? '📄'}
                </div>
                <h2 className="text-lg font-semibold text-navy transition-colors group-hover:text-orange">
                  {title}
                </h2>
                {excerpt && (
                  <p className="mt-1 text-sm text-muted line-clamp-3">
                    {excerpt}
                  </p>
                )}
                <span className="mt-auto pt-3 text-[11px] font-bold uppercase tracking-wide text-orange">
                  {serverT(locale, 'resources.readArticle')}
                </span>
              </Link>
            )
          })}
      </div>
    </div>
  )
}
