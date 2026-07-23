import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditArticleForm } from '../EditArticleForm'

export const dynamic = 'force-dynamic'

export default async function NewArticlePage() {
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

  const { data: top } = await supabase
    .from('knowledge_articles')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const defaultPosition = (top?.position ?? 0) + 1

  return <EditArticleForm mode={{ kind: 'new', defaultPosition }} />
}
