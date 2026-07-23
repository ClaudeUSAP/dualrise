'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState, useTransition } from 'react'
import { createEvent, deleteEvent, updateEvent } from './actions'
import type { CalendarEvent, EventType } from './CalendarView'

const TYPE_VALUES: EventType[] = ['call', 'tournament', 'deadline', 'admin']

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0')
)
const MINUTE_OPTIONS = ['00', '15', '30', '45']

const TZ_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/London', label: 'Londres (GMT/BST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'Denver (MST/MDT)' },
  { value: 'America/Phoenix', label: 'Phoenix (MST, no DST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Anchorage', label: 'Anchorage (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (HST)' },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST/CDT)' },
]

const TZ_VALUES = new Set(TZ_OPTIONS.map((t) => t.value))

function detectBrowserTz(): string {
  if (typeof Intl === 'undefined') return 'Europe/Paris'
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TZ_VALUES.has(tz) ? tz : 'Europe/Paris'
  } catch {
    return 'Europe/Paris'
  }
}

export function EventModal({
  mode,
  initialDate,
  event,
  onClose,
}: {
  mode: 'add' | 'edit'
  initialDate: string
  event?: CalendarEvent
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pending, startTransition] = useTransition()
  const t = useTranslations('calendar.modal')
  const tType = useTranslations('calendar.type')

  const initialHour = event?.event_time?.slice(0, 2) ?? ''
  const initialMinuteRaw = event?.event_time?.slice(3, 5) ?? ''
  const initialMinute = MINUTE_OPTIONS.includes(initialMinuteRaw)
    ? initialMinuteRaw
    : initialMinuteRaw
    ? '00'
    : ''
  const initialTz = event?.timezone ?? detectBrowserTz()

  const [hour, setHour] = useState(initialHour)
  const [minute, setMinute] = useState(initialMinute)
  const [timezone, setTimezone] = useState(initialTz)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function handleSubmit(formData: FormData) {
    const title = (formData.get('title')?.toString() ?? '').trim()
    const event_type = formData.get('event_type')?.toString() ?? 'call'
    const event_date = formData.get('event_date')?.toString() ?? ''
    const description = formData.get('description')?.toString() ?? ''
    const event_time = hour && minute ? `${hour}:${minute}` : ''
    if (!title || !event_date) return

    startTransition(async () => {
      try {
        if (mode === 'edit' && event) {
          await updateEvent({
            id: event.id,
            title,
            event_type,
            event_date,
            event_time,
            timezone: event_time ? timezone : null,
            description,
          })
        } else {
          await createEvent({
            title,
            event_type,
            event_date,
            event_time,
            timezone: event_time ? timezone : null,
            description,
          })
        }
        dialogRef.current?.close()
        onClose()
      } catch (err) {
        console.error(err)
      }
    })
  }

  function handleDelete() {
    if (!event) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(t('deleteConfirm', { title: event.title }))
    ) {
      return
    }
    startTransition(async () => {
      try {
        await deleteEvent(event.id)
        dialogRef.current?.close()
        onClose()
      } catch (err) {
        console.error(err)
      }
    })
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          dialogRef.current?.close()
          onClose()
        }
      }}
      className="rounded-md p-0 backdrop:bg-black/40"
    >
      <form action={handleSubmit} className="w-[480px] max-w-[90vw] p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-navy">
              {mode === 'edit' ? t('editTitle') : t('addTitle')}
            </h2>
            {mode === 'edit' && event?.event_type === 'call' && (
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-orange">
                {t('syncedNotice')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              dialogRef.current?.close()
              onClose()
            }}
            aria-label="Fermer"
            className="text-muted hover:text-navy"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              {t('fieldTitle')}
            </span>
            <input
              type="text"
              name="title"
              defaultValue={event?.title ?? ''}
              required
              autoFocus
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              {t('fieldType')}
            </span>
            <select
              name="event_type"
              defaultValue={event?.event_type ?? 'call'}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange"
            >
              {TYPE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {v === 'call' ? tType('callLong') : tType(v)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              {t('fieldDate')}
            </span>
            <input
              type="date"
              name="event_date"
              defaultValue={event?.event_date ?? initialDate}
              required
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              {t('fieldTime')}
            </span>
            <div className="grid grid-cols-[1fr_1fr_2fr] gap-2">
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                aria-label="Heure"
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange"
              >
                <option value="">— h</option>
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h} h
                  </option>
                ))}
              </select>
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                aria-label="Minutes"
                disabled={!hour}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange disabled:opacity-50"
              >
                <option value="">— min</option>
                {MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                aria-label="Fuseau horaire"
                disabled={!hour || !minute}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange disabled:opacity-50"
              >
                {TZ_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              {t('fieldDescription')}
            </span>
            <textarea
              name="description"
              rows={3}
              defaultValue={event?.description ?? ''}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="rounded-md bg-red px-3 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {t('delete')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close()
                onClose()
              }}
              className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-navy"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-orange px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
            >
              {t('save')}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
