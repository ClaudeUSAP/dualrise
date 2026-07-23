'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type TabDef = {
  href: string
  i18nKey: string
  key: 'schools' | 'checklist' | 'calendar' | 'tasks' | 'notes' | null
}

const TABS: TabDef[] = [
  { href: '/schools', i18nKey: 'schools', key: 'schools' },
  { href: '/checklist', i18nKey: 'checklist', key: 'checklist' },
  { href: '/tasks', i18nKey: 'tasks', key: 'tasks' },
  { href: '/notes', i18nKey: 'notes', key: 'notes' },
  { href: '/calendar', i18nKey: 'calendar', key: 'calendar' },
  { href: '/resources', i18nKey: 'resources', key: null },
  { href: '/profile', i18nKey: 'profile', key: null },
]

const STORAGE_KEY = 'usap_last_visits'

function getLastVisits(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function setLastVisit(key: string) {
  if (typeof window === 'undefined') return
  const existing = getLastVisits()
  existing[key] = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
}

export function HeaderTabs() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchCounts() {
      const lv = getLastVisits()
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const lastVisits = {
        schools: lv.schools ?? sevenDaysAgo,
        checklist: lv.checklist ?? sevenDaysAgo,
        calendar: lv.calendar ?? sevenDaysAgo,
        tasks: lv.tasks ?? sevenDaysAgo,
        notes: lv.notes ?? sevenDaysAgo,
      }
      try {
        const res = await fetch('/api/notifications/counts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastVisits }),
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          setCounts(data)
        }
      } catch {
        // silent
      }
    }
    fetchCounts()
    return () => {
      cancelled = true
    }
  }, [pathname])

  useEffect(() => {
    const tab = TABS.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )
    if (tab?.key) {
      setLastVisit(tab.key)
      setCounts((c) => ({ ...c, [tab.key!]: 0 }))
    }
  }, [pathname])

  // Lock body scroll + allow Escape to close while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Desktop: horizontal tab bar. Scroll stays functional, scrollbar hidden. */}
      <nav className="no-scrollbar hidden items-center gap-1 overflow-x-auto whitespace-nowrap sm:flex">
        {TABS.map((tab) => {
          const active = isActive(tab.href)
          const count = tab.key ? counts[tab.key] ?? 0 : 0
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative rounded-sm px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-navy-bright text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{t(tab.i18nKey)}</span>
              {count > 0 && !active && (
                <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
              {active && (
                <span className="pointer-events-none absolute inset-x-0 -bottom-[17px] h-[3px] bg-orange" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mobile: hamburger button. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={mobileOpen}
        className="flex h-10 w-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 sm:hidden"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          aria-hidden
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile drawer. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute right-0 top-0 flex h-full w-72 max-w-[80vw] flex-col bg-navy shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <span className="text-sm font-bold uppercase tracking-wide text-white/70">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fermer le menu"
                className="flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto p-3">
              {TABS.map((tab) => {
                const active = isActive(tab.href)
                const count = tab.key ? counts[tab.key] ?? 0 : 0
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between rounded-md px-4 py-3 text-base font-semibold transition-colors ${
                      active
                        ? 'bg-navy-bright text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{t(tab.i18nKey)}</span>
                    {count > 0 && !active && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange px-1.5 text-xs font-bold text-white">
                        {count}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
