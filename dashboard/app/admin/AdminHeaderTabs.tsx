'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Ressources is visible to every authenticated agent (read-only lookups).
// Edition is still gated to founders via RLS + the server action.
const TABS = [
  { href: '/admin/players', label: 'Mes joueurs' },
  { href: '/admin/planning', label: 'Planning' },
  { href: '/admin/pending-invitations', label: 'Invitations' },
  { href: '/admin/resources', label: 'Ressources' },
]

export function AdminHeaderTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative rounded-sm px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-navy-bright text-white'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            {t.label}
            {active && (
              <span className="pointer-events-none absolute inset-x-0 -bottom-[17px] h-[3px] bg-orange" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
