import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'

export default async function PlayerNotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select('id')
        .eq('id', member.player_id)
        .single()
    : { data: null }

  const locale = await getViewerLocale(supabase)
  const DATE_FMT = new Intl.DateTimeFormat(
    locale === 'en' ? 'en-US' : 'fr-FR',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  )

  if (!player) {
    return (
      <div className="rounded-md border border-line bg-white p-6 text-muted">
        {serverT(locale, 'common.playerNotFound')}{' '}
        <Link href="/schools" className="font-bold text-orange">
          {serverT(locale, 'common.returnHome')}
        </Link>
      </div>
    )
  }

  const { data: notes } = await supabase
    .from('player_notes')
    .select('id, body, author_name, author_role, created_at')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })

  const list = (notes ?? []) as Array<{
    id: string
    body: string
    author_name: string | null
    author_role: string | null
    created_at: string
  }>

  return (
    <div>
      <h1 className="display mb-3 text-2xl text-navy sm:text-3xl">
        {serverT(locale, 'notes.title')}
      </h1>
      <p className="mb-6 rounded-md border border-orange/20 bg-orange/5 p-3 text-xs text-navy">
        {serverT(locale, 'notes.helper')}
      </p>

      {list.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          {serverT(locale, 'notes.empty')}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((n) => (
            <li
              key={n.id}
              className="rounded-md border border-line bg-white p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="display text-sm text-navy">
                  {n.author_name ?? 'Dual Rise'}
                </span>
                <span className="text-xs text-muted">
                  {DATE_FMT.format(new Date(n.created_at))}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-navy">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
