import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '../(app)/schools/logout-button'
import { AdminHeaderTabs } from './AdminHeaderTabs'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agents')
    .select('id, first_name, last_name, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!agent) redirect('/login')

  const fullName = `${agent.first_name} ${agent.last_name}`
  const initials =
    `${agent.first_name.charAt(0)}${agent.last_name.charAt(0)}`.toUpperCase()

  return (
    <>
      <header className="sticky top-0 z-20 border-b-[3px] border-orange bg-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-3 py-[14px] sm:px-7">
          <div className="flex items-center gap-3">
            <div className="relative h-[50px] w-[144px] shrink-0 overflow-hidden">
              <Image
                src="/dualrise-logo-white.svg"
                alt="Dual Rise Performance"
                width={213}
                height={379}
                className="absolute max-w-none"
                style={{ left: '-35px', top: '-164px' }}
                priority
                unoptimized
              />
            </div>
            <span className="rounded bg-orange px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
              ADMIN
            </span>
          </div>

          <AdminHeaderTabs />

          <div className="flex shrink-0 items-center gap-3 rounded-full bg-white/10 py-1 pr-1 pl-4">
            <span className="text-sm font-semibold">{fullName}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange text-sm font-bold text-white">
              {initials}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-7 sm:py-8">
        {children}
      </main>
    </>
  )
}
