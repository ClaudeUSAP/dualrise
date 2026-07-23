'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createCallEvent } from './actions'

type PlayerOption = {
  id: string
  first_name: string
  last_name: string
  schools: Array<{ school_id: string; school_name: string }>
}

const TZ_OPTIONS = [
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'America/New_York', label: 'US Eastern' },
  { value: 'America/Chicago', label: 'US Central' },
  { value: 'America/Denver', label: 'US Mountain' },
  { value: 'America/Los_Angeles', label: 'US Pacific' },
  { value: 'America/Phoenix', label: 'US Arizona' },
  { value: 'Pacific/Honolulu', label: 'US Hawaii' },
]

export function NewCallButton({ players }: { players: PlayerOption[] }) {
  const [open, setOpen] = useState(false)
  const [playerId, setPlayerId] = useState<string>('')
  const [schoolId, setSchoolId] = useState<string>('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('15:00')
  const [tz, setTz] = useState('Europe/Paris')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDivElement>(null)

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [players, playerId]
  )
  const schoolOptions = selectedPlayer?.schools ?? []

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function reset() {
    setPlayerId('')
    setSchoolId('')
    setDate('')
    setTime('15:00')
    setTz('Europe/Paris')
    setDescription('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!playerId) return setError('Choisis un joueur')
    if (!date) return setError('Date requise')
    if (!time) return setError('Heure requise')
    startTransition(async () => {
      try {
        await createCallEvent({
          player_id: playerId,
          school_id: schoolId || null,
          event_date: date,
          event_time: time,
          timezone: tz,
          description: description || null,
        })
        setOpen(false)
        reset()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#C11722]"
      >
        + Nouveau call
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-navy/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-label="Nouveau call coach"
            className="w-full max-w-md rounded-md bg-white p-5 shadow-2xl"
          >
            <h2 className="display mb-3 text-lg text-navy">
              Nouveau call coach
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Field label="Joueur">
                <select
                  value={playerId}
                  onChange={(e) => {
                    setPlayerId(e.target.value)
                    setSchoolId('')
                  }}
                  required
                  className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="École">
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  disabled={!selectedPlayer}
                  className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm disabled:opacity-50"
                >
                  <option value="">— Pas d&apos;école liée —</option>
                  {schoolOptions.map((s) => (
                    <option key={s.school_id} value={s.school_id}>
                      {s.school_name}
                    </option>
                  ))}
                </select>
                {selectedPlayer && schoolOptions.length === 0 && (
                  <p className="mt-1 text-[11px] italic text-muted">
                    Aucune école dans la pipeline du joueur.
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                  />
                </Field>
                <Field label="Heure">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                  />
                </Field>
              </div>

              <Field label="Fuseau">
                <select
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                >
                  {TZ_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Description (optionnel)">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
                />
              </Field>

              {error && (
                <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                  {error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:text-navy"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {pending ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}
