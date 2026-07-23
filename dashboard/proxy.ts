import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PLAYER_LANDING = '/schools'
const AGENT_LANDING = '/admin/players'

const PLAYER_ROUTES = [
  '/schools',
  '/checklist',
  '/tasks',
  '/notes',
  '/calendar',
  '/profile',
  '/resources',
  '/performances',
  '/parcours',
  '/glossary',
]

function isPlayerRoute(pathname: string): boolean {
  return PLAYER_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  )
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const pathname = request.nextUrl.pathname

  const isAgentDomain = host.startsWith('agent.')
  const isPlayerDomain = host.startsWith('player.')

  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/privacy' ||
    pathname === '/en/privacy' ||
    pathname === '/terms' ||
    pathname === '/legal'

  if (!isPublic) {
    if (isAgentDomain && (pathname === '/' || isPlayerRoute(pathname))) {
      const url = request.nextUrl.clone()
      url.pathname = AGENT_LANDING
      return NextResponse.redirect(url)
    }
    if (isPlayerDomain && (pathname === '/' || pathname.startsWith('/admin'))) {
      const url = request.nextUrl.clone()
      url.pathname = PLAYER_LANDING
      return NextResponse.redirect(url)
    }
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Rafraîchit la session si besoin ; les cookies mis à jour passent par setAll ci-dessus.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
