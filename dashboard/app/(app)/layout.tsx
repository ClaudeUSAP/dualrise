import { NextIntlClientProvider } from 'next-intl'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getMessages, getViewerLocale } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { HeaderTabs } from './HeaderTabs'
import { LogoutButton } from './schools/logout-button'
import { WelcomeModal } from './WelcomeModal'

// Every page under (app) is per-user (auth, RLS-bound queries). Force-dynamic
// at the layout level so the Next 16 Router Cache cannot serve another
// session's response — same fix already applied on /admin/players/[id].
export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const locale = await getViewerLocale(supabase)
  const messages = getMessages(locale)

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select('first_name, last_name, welcome_seen_at')
        .eq('id', member.player_id)
        .single()
    : { data: null }

  const showWelcome =
    !!member &&
    !!player &&
    !player.welcome_seen_at &&
    (member.role === 'player' || member.role === 'parent')

  const fullName = player
    ? `${player.first_name} ${player.last_name}`
    : (user.email ?? 'Joueur')
  const initials = player
    ? `${player.first_name.charAt(0)}${player.last_name.charAt(0)}`.toUpperCase()
    : '?'

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <header className="sticky top-0 z-20 border-b-[3px] border-orange bg-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-3 py-[14px] sm:px-7">
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

          <HeaderTabs />

          <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 py-1 pr-1 pl-2 sm:gap-3 sm:pl-4">
            <span className="hidden text-sm font-semibold sm:inline">{fullName}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange text-sm font-bold text-white">
              {initials}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-7 sm:py-8">{children}</main>
      {showWelcome && player && (
        <WelcomeModal firstName={player.first_name} />
      )}
    </NextIntlClientProvider>
  )
}
