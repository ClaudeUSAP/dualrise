'use client'

import { useState, useTransition } from 'react'
import { suggestCorrection } from './actions'

type Athlete = Record<string, unknown>
type Result = Record<string, unknown>

const PERF_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'best_recent_scoring_avg', label: 'Best recent scoring avg (avec période)' },
  { key: 'scoring_avg_vs_par_last_3', label: 'Scoring vs par — last 3' },
  { key: 'scoring_avg_vs_par_last_5', label: 'Scoring vs par — last 5' },
  { key: 'scoring_avg_vs_par_last_7', label: 'Scoring vs par — last 7' },
  { key: 'scoring_avg_vs_par_last_10', label: 'Scoring vs par — last 10' },
  { key: 'scoring_avg_vs_cr_last_3', label: 'Scoring vs CR — last 3' },
  { key: 'scoring_avg_vs_cr_last_5', label: 'Scoring vs CR — last 5' },
  { key: 'scoring_avg_vs_cr_last_7', label: 'Scoring vs CR — last 7' },
  { key: 'scoring_avg_vs_cr_last_10', label: 'Scoring vs CR — last 10' },
  { key: 'drive_distance_carry', label: 'Drive distance (carry)' },
  { key: 'seven_iron_distance_carry', label: 'Iron 7 distance (carry)' },
  { key: 'max_club_head_speed', label: 'Max club head speed (mph)' },
  { key: 'wagr_ranking', label: 'WAGR ranking' },
  { key: 'french_adult_ranking', label: 'French adult ranking' },
  { key: 'french_ranking_in_their_class', label: 'French ranking dans la classe' },
]

const PROFILE_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'strengths', label: 'Strengths' },
  { key: 'areas_of_improvement', label: 'Areas of improvement' },
  { key: 'why_good_recruit', label: 'Why I would be a great recruit' },
  { key: 'golf_club_team', label: 'Golf club / team' },
  { key: 'swing_coach', label: 'Swing coach' },
]

const ACADEMIC_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'academic_gpa', label: 'GPA' },
  { key: 'intended_majors', label: 'Intended majors' },
]

export function PerformancesView({
  athlete,
  results,
}: {
  athlete: Athlete
  results: Result[]
}) {
  return (
    <div>
      <h1 className="display mb-2 text-2xl text-navy sm:text-3xl">Mes performances</h1>
      <p className="mb-6 text-xs text-muted">
        Ce que les coachs US voient sur ton profil. Si une info est inexacte, clique « Suggérer correction » — Nicolas reçoit un email et corrige.
      </p>

      <div className="flex flex-col gap-8">
        <Section title="📈 Performances golf" fields={PERF_FIELDS} athlete={athlete} />
        <Section title="💪 Profil & jeu" fields={PROFILE_FIELDS} athlete={athlete} />
        <Section title="🎓 Académique" fields={ACADEMIC_FIELDS} athlete={athlete} />

        <section>
          <h2 className="display mb-4 text-xl text-navy">🏆 Mes 10 derniers tournois</h2>
          {results.length === 0 ? (
            <p className="rounded-md border border-line bg-white p-6 text-center text-sm text-muted">
              Aucun tournoi enregistré pour l'instant.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {results.map((r) => (
                <ResultRow key={r.id as string} result={r} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Section({
  title,
  fields,
  athlete,
}: {
  title: string
  fields: Array<{ key: string; label: string }>
  athlete: Athlete
}) {
  return (
    <section>
      <h2 className="display mb-4 text-xl text-navy">{title}</h2>
      <div className="flex flex-col gap-2">
        {fields.map((f) => (
          <FieldRow key={f.key} fieldKey={f.key} label={f.label} value={athlete[f.key]} />
        ))}
      </div>
    </section>
  )
}

function FieldRow({
  fieldKey,
  label,
  value,
}: {
  fieldKey: string
  label: string
  value: unknown
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const display =
    value === null || value === undefined || value === '' ? '—' : String(value)

  function handleSubmit(formData: FormData) {
    const suggestion = formData.get('suggestion')?.toString() || ''
    if (!suggestion.trim()) return
    startTransition(async () => {
      try {
        await suggestCorrection(fieldKey, label, display, suggestion)
        setEditing(false)
        setDone(true)
        setTimeout(() => setDone(false), 3000)
      } catch (err) {
        console.error(err)
      }
    })
  }

  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
          <p className="text-sm text-navy break-words">{display}</p>
        </div>
        {!editing && !done && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 text-[10px] uppercase tracking-wide text-orange hover:underline"
          >
            Suggérer correction
          </button>
        )}
        {done && <span className="shrink-0 text-[10px] uppercase text-green-600">✓ Envoyé</span>}
      </div>
      {editing && (
        <form action={handleSubmit} className="mt-3 flex flex-col gap-2">
          <textarea
            name="suggestion"
            placeholder="Décris ce qui ne va pas et la valeur correcte"
            rows={2}
            required
            className="w-full rounded-md border border-line bg-white px-2 py-1 text-sm text-navy outline-none focus:border-orange"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1 text-xs text-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-orange px-3 py-1 text-xs font-bold text-white disabled:opacity-60"
            >
              {pending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function ResultRow({ result }: { result: Result }) {
  const t = (result.tournaments ?? null) as Record<string, unknown> | null
  const name = (t?.name as string) ?? '—'
  const date = (t?.start_date as string) ?? ''
  const location = (t?.location as string) ?? ''
  const country = (t?.country as string) ?? ''
  const par = (t?.course_par as string) ?? ''
  const cr = (t?.course_rating as string) ?? ''
  const pos = (result.position_text as string) ?? (result.position as number)?.toString() ?? '—'
  const score = result.total_score as number | null
  const rounds = (result.rounds as string) ?? ''
  const fieldSize = result.field_size as number | null

  return (
    <li className="rounded-md border border-line bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="display text-sm text-navy">{name}</h3>
        <span className="text-[10px] uppercase tracking-wide text-muted">
          {date} {location && `· ${location}`} {country && `· ${country}`}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-navy">
        <span><strong className="text-orange">{pos}</strong>{fieldSize ? ` / ${fieldSize}` : ''}</span>
        {score != null && <span>Score : <strong>{score}</strong></span>}
        {rounds && <span>Rounds : {rounds}</span>}
        {par && <span>Par : {par}</span>}
        {cr && <span>CR : {cr}</span>}
      </div>
    </li>
  )
}
