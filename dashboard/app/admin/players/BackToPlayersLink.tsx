'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const KEY = 'usap.last_players_url'

export function BackToPlayersLink({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const [href, setHref] = useState('/admin/players')

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY)
      if (saved && saved.startsWith('/admin/players?')) setHref(saved)
    } catch {}
  }, [])

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

export function RememberListingUrl() {
  const pathname = usePathname()
  const sp = useSearchParams()

  useEffect(() => {
    if (pathname !== '/admin/players') return
    const qs = sp.toString()
    try {
      sessionStorage.setItem(KEY, qs ? `${pathname}?${qs}` : pathname)
    } catch {}
  }, [pathname, sp])

  return null
}
