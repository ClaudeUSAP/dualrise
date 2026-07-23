import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewerMember } from '@/lib/get-viewer-player'
import { createClient } from '@/lib/supabase/server'
import { SelectClient } from './SelectClient'

export const dynamic = 'force-dynamic'

export default async function CompareSelectPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await getViewerMember(supabase)
  if (!member) redirect('/schools')

  const { data: rows } = await supabase
    .from('school_assignments')
    .select('stage, schools:school_id(id, name, division)')
    .eq('player_id', member.player_id)

  const assignments = ((rows ?? []) as Array<{
    stage: string
    schools:
      | { id: string; name: string; division: string | null }
      | { id: string; name: string; division: string | null }[]
      | null
  }>)
    .map((r) => {
      const s = Array.isArray(r.schools) ? r.schools[0] : r.schools
      if (!s) return null
      return {
        schoolId: s.id,
        schoolName: s.name,
        division: s.division,
        stage: r.stage,
      }
    })
    .filter(
      (a): a is { schoolId: string; schoolName: string; division: string | null; stage: string } => !!a
    )
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName))

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/schools"
        className="inline-block text-xs font-bold uppercase tracking-wide text-muted hover:text-orange"
      >
        ← Mes écoles
      </Link>

      <header className="mt-3 mb-6">
        <h1 className="display text-2xl text-navy sm:text-3xl">
          Comparer mes facs
        </h1>
        <p className="mt-1 text-sm text-muted">
          Choisis 2 ou 3 facs de ta pipeline pour les mettre côte à côte.
        </p>
      </header>

      <SelectClient assignments={assignments} />
    </div>
  )
}
