import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminArticleRow } from './AdminArticleRow'

export const dynamic = 'force-dynamic'

type AdminArticle = {
  slug: string
  title_fr: string
  emoji: string | null
  position: number
  active: boolean
  updated_at: string | null
  updated_by_name: string | null
}

export default async function AdminResourcesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) redirect('/login')
  const isFounder = (agent as { role?: string }).role === 'founder'

  const { data } = await supabase
    .from('knowledge_articles')
    .select('slug, title_fr, emoji, position, active, updated_at, updated_by_name')
    .order('position', { ascending: true })

  const articles = (data ?? []) as AdminArticle[]

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl text-navy sm:text-3xl">
            Ressources — Knowledge base
          </h1>
          <p className="mt-1 text-sm text-muted">
            {articles.length} article{articles.length > 1 ? 's' : ''} (actif &amp;
            inactif).{' '}
            {isFounder
              ? "Tu peux éditer en tant que founder."
              : 'Lecture seule — seul le founder peut éditer.'}
          </p>
        </div>
        {isFounder && (
          <Link
            href="/admin/resources/new"
            className="rounded-md bg-orange px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#C11722]"
          >
            + Nouvel article
          </Link>
        )}
      </header>

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Pos.</th>
              <th className="px-3 py-2">Article</th>
              <th className="px-3 py-2">Actif</th>
              <th className="px-3 py-2">Mis à jour</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-muted"
                >
                  Aucun article. Crée le premier ↑
                </td>
              </tr>
            ) : (
              articles.map((a) => (
                <AdminArticleRow
                  key={a.slug}
                  article={a}
                  canEdit={isFounder}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
