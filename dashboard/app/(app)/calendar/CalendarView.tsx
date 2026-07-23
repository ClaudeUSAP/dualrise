'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'
import { EventModal } from './EventModal'
import { SyncCard } from './SyncCard'

export type EventType = 'call' | 'tournament' | 'deadline' | 'admin'

export type CalendarEvent = {
  id: string
  title: string
  event_date: string
  event_time: string | null
  event_type: EventType
  description: string | null
  timezone: string | null
}

const TYPE_BADGE: Record<EventType, string> = {
  call: 'bg-navy text-white',
  tournament: 'bg-orange text-white',
  deadline: 'bg-red text-white',
  admin: 'bg-navy-bright text-white',
}

// Type label is read from the translations file at render time.

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const SHORT_MONTHS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
]
const SHORT_MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const DAY_HEADERS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const DAY_HEADERS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type ModalState =
  | { kind: 'closed' }
  | { kind: 'add'; date: string }
  | { kind: 'edit'; event: CalendarEvent }

export function CalendarView({
  year,
  month,
  events,
  upcoming,
  icalUrl,
  locale,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  upcoming: CalendarEvent[]
  icalUrl: string
  locale: 'fr' | 'en'
}) {
  const t = useTranslations('calendar')
  const tType = useTranslations('calendar.type')
  const monthNames = locale === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_FR
  const shortMonths = locale === 'en' ? SHORT_MONTHS_EN : SHORT_MONTHS_FR
  const dayHeaders = locale === 'en' ? DAY_HEADERS_EN : DAY_HEADERS_FR
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' })

  const today = new Date()
  const todayStr = fmt(today)

  const firstOfMonth = new Date(year, month, 1)
  const dow = firstOfMonth.getDay() === 0 ? 7 : firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - (dow - 1))

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    const dateStr = fmt(d)
    return {
      date: d,
      dateStr,
      inMonth: d.getMonth() === month,
      isToday: dateStr === todayStr,
      events: events.filter((e) => e.event_date === dateStr),
    }
  })

  const prevMonth =
    month === 0
      ? `${year - 1}-12`
      : `${year}-${String(month).padStart(2, '0')}`
  const nextMonth =
    month === 11
      ? `${year + 1}-01`
      : `${year}-${String(month + 2).padStart(2, '0')}`

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/calendar?month=${prevMonth}`}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-orange hover:text-orange"
          >
            {t('prevMonth')}
          </Link>
          <h1 className="display text-2xl text-navy sm:text-3xl">
            {monthNames[month]} {year}
          </h1>
          <Link
            href={`/calendar?month=${nextMonth}`}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-orange hover:text-orange"
          >
            {t('nextMonth')}
          </Link>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {dayHeaders.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-bold uppercase tracking-wide text-muted"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => (
            <div
              key={i}
              onClick={() => setModal({ kind: 'add', date: cell.dateStr })}
              className={`flex min-h-[88px] cursor-pointer flex-col rounded-md border p-1 transition-colors ${
                cell.isToday
                  ? 'border-orange bg-cream'
                  : cell.inMonth
                  ? 'border-line bg-white hover:bg-cream-2'
                  : 'border-line/40 bg-cream-2/40 text-muted/60'
              }`}
            >
              <span
                className={`mb-1 px-1 text-xs font-bold ${
                  cell.isToday ? 'text-orange' : cell.inMonth ? 'text-navy' : ''
                }`}
              >
                {cell.date.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {cell.events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setModal({ kind: 'edit', event: ev })
                    }}
                    className={`truncate rounded px-1 py-0.5 text-left text-[10px] font-bold transition-opacity hover:opacity-80 ${TYPE_BADGE[ev.event_type]}`}
                  >
                    {ev.event_time && (
                      <span className="opacity-80">
                        {ev.event_time.slice(0, 5)}{' '}
                      </span>
                    )}
                    {ev.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-[100px]">
        <UpcomingCard
          events={upcoming}
          shortMonths={shortMonths}
          onSelect={(ev) => setModal({ kind: 'edit', event: ev })}
        />
        <SyncCard icalUrl={icalUrl} />
      </aside>

      {modal.kind !== 'closed' && (
        <EventModal
          mode={modal.kind}
          initialDate={
            modal.kind === 'add' ? modal.date : modal.event.event_date
          }
          event={modal.kind === 'edit' ? modal.event : undefined}
          onClose={() => setModal({ kind: 'closed' })}
        />
      )}
    </div>
  )
}

function UpcomingCard({
  events,
  shortMonths,
  onSelect,
}: {
  events: CalendarEvent[]
  shortMonths: string[]
  onSelect: (ev: CalendarEvent) => void
}) {
  const t = useTranslations('calendar')
  const tType = useTranslations('calendar.type')
  return (
    <section className="rounded-md border border-line bg-white p-4">
      <h3 className="display mb-3 text-sm text-navy">{t('upcoming')}</h3>
      {events.length === 0 ? (
        <p className="rounded-md border border-dashed border-line py-6 text-center text-xs text-muted">
          {t('empty')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {events.map((ev) => {
            const d = new Date(`${ev.event_date}T00:00:00`)
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onSelect(ev)}
                  className="flex w-full items-center gap-3 py-2 text-left transition-colors hover:bg-cream-2"
                >
                  <div className="flex w-12 flex-col items-center text-center leading-none">
                    <span className="display text-2xl text-navy">
                      {d.getDate()}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-orange">
                      {shortMonths[d.getMonth()]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-navy">
                      {ev.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <span>{tType(ev.event_type)}</span>
                      {ev.event_time && <span>· {ev.event_time.slice(0, 5)}</span>}
                      {ev.event_type === 'call' && (
                        <span className="rounded-full bg-orange/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange">
                          {t('synced')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
