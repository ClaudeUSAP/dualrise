import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getScoutClient } from '@/lib/scout'
import { PerformancesView } from './PerformancesView'

export default async function PerformancesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let athlete: Record<string, unknown> | null = null
  let results: Array<Record<string, unknown>> = []
  let error: string | null = null

  try {
    const scout = getScoutClient()
    const { data: a, error: aerr } = await scout
      .from('athletes')
      .select('*')
      .eq('email', user.email!)
      .maybeSingle()
    if (aerr) throw aerr
    athlete = a as Record<string, unknown> | null

    if (athlete) {
      const { data: r, error: rerr } = await scout
        .from('tournament_results')
        .select(
          'id, position, position_text, total_score, rounds, field_size, notes, tournaments(id, name, start_date, end_date, location, country, course_par, course_rating, yardage)'
        )
        .eq('athlete_id', athlete.id as string)
        .order('id', { ascending: false })
        .limit(10)
      if (rerr) throw rerr
      results = (r ?? []) as Array<Record<string, unknown>>
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erreur SCOUT'
    console.error('SCOUT fetch error:', err)
  }

  if (error) {
    return (
      <div>
        <h1 className="display mb-4 text-2xl text-navy">Performances</h1>
        <p className="rounded-md border border-red/20 bg-red/5 p-4 text-sm text-red">
          Erreur de connexion à SCOUT : {error}
        </p>
      </div>
    )
  }

  if (!athlete) {
    return (
      <div>
        <h1 className="display mb-4 text-2xl text-navy">Performances</h1>
        <p className="rounded-md border border-line bg-white p-6 text-center text-muted">
          Ton profil SCOUT n'est pas encore synchronisé. Contacte Nicolas pour qu'il fasse le lien.
        </p>
      </div>
    )
  }

  return <PerformancesView athlete={athlete} results={results} />
}
