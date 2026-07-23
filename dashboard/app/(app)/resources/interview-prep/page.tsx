import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'
import { ArticleMarkdown } from '../ArticleMarkdown'

export const dynamic = 'force-dynamic'

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export default async function InterviewPrepPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getViewerLocale(supabase)
  const member = await getViewerMember(supabase)
  if (!member) {
    // Agent/founder viewing their own page → no associated player; bounce back.
    redirect('/resources')
  }

  // Bail out if the agent has hidden the prep for this player.
  const { data: playerFlags } = await supabase
    .from('players')
    .select('show_interview_prep')
    .eq('id', member.player_id)
    .maybeSingle()
  const visible =
    (playerFlags as { show_interview_prep?: boolean | null } | null)
      ?.show_interview_prep ?? true
  if (!visible) redirect('/resources')

  const { data } = await supabase
    .from('player_interview_prep')
    .select('content_markdown, updated_at, updated_by_name')
    .eq('player_id', member.player_id)
    .maybeSingle()

  const content = data?.content_markdown?.trim() ?? ''

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
          🎯
        </span>
        <div>
          <h1 className="display text-3xl font-bold text-navy sm:text-4xl">
            {serverT(locale, 'resources.interviewPrep.title')}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {serverT(locale, 'resources.interviewPrep.subtitle')}
          </p>
        </div>
      </header>

      {content ? (
        <article>
          <ArticleMarkdown source={content} />
        </article>
      ) : (
        <div className="rounded-md border border-dashed border-line bg-white py-10 px-6 text-center">
          <p className="text-sm text-muted">
            {serverT(locale, 'resources.interviewPrep.empty')}
          </p>
          <p className="mt-1 text-xs text-muted">
            {serverT(locale, 'resources.interviewPrep.emptyHint')}
          </p>
          <Link
            href="/resources/communication-coachs"
            className="mt-4 inline-block text-xs font-bold uppercase tracking-wide text-orange hover:text-[#C11722]"
          >
            {serverT(locale, 'resources.interviewPrep.readGuide')}
          </Link>
        </div>
      )}

      {data?.updated_at && (
        <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">
          {serverT(locale, 'resources.lastUpdated')} :{' '}
          {DATE_FMT.format(new Date(data.updated_at))}
          {data?.updated_by_name
            ? ` ${serverT(locale, 'resources.by')} ${data.updated_by_name}`
            : ''}
        </footer>
      )}
    </div>
  )
}
