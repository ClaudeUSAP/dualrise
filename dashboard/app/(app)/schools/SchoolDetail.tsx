'use client'

import { useEffect, useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import {
  addCustomCriterion,
  addNote,
  addNoteAsAgent,
  deleteNote,
  removeCustomCriterion,
  updateCoachInterest,
  updateCriterionLabel,
  updateNote,
} from './actions'
import { EditSchoolInfo } from './EditSchoolInfo'
import { saveRatingSession } from './rating-actions'
import {
  getInstagramUrl,
  getNicheUrl,
  getScoreboardUrl,
  getWebsiteUrl,
} from '@/lib/school-urls'
import type {
  AdminContext,
  Assignment,
  Division,
  Note,
  PlayerCriterion,
  RatingSession,
} from './Pipeline'

const DIVISION_BADGE: Record<Division, string> = {
  D1: 'bg-orange text-white',
  D2: 'bg-orange text-white',
  D3: 'bg-orange text-white',
  NAIA: 'bg-orange text-white',
  JUCO: 'bg-zinc-500 text-white',
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function formatDate(iso: string) {
  return DATE_FMT.format(new Date(iso))
}

const TRANSITION_MS = 250

export function SchoolDetail({
  assignment,
  playerCriteria,
  adminContext,
  viewerRole = 'player',
  onClose,
}: {
  assignment: Assignment
  playerCriteria: PlayerCriterion[]
  adminContext?: AdminContext
  viewerRole?: 'player' | 'parent'
  onClose: () => void
}) {
  const school = assignment.schools
  const [open, setOpen] = useState(false)
  const isAdmin = !!adminContext

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClose = () => {
    setOpen(false)
    setTimeout(onClose, TRANSITION_MS)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!school) return null

  const sessions = assignment.rating_sessions ?? []
  const playerLatest = latestRatingByCriterion(sessions, 'player')
  const parentLatest = latestRatingByCriterion(sessions, 'parent')
  const rows: RatingRow[] = [...playerCriteria]
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      key: c.criterion_key,
      label: c.label,
      isCustom: !c.is_default,
      playerRating: playerLatest.get(c.criterion_key)?.rating ?? null,
      playerEvaluatedAt: playerLatest.get(c.criterion_key)?.evaluated_at ?? null,
      parentRating: parentLatest.get(c.criterion_key)?.rating ?? null,
      parentEvaluatedAt: parentLatest.get(c.criterion_key)?.evaluated_at ?? null,
    }))

  const notesSorted = [...assignment.school_call_notes].sort((a, b) =>
    b.note_date.localeCompare(a.note_date)
  )

  const tuition =
    school.tuition_min_usd != null && school.tuition_max_usd != null
      ? `${Math.round(school.tuition_min_usd / 1000)}–${Math.round(
          school.tuition_max_usd / 1000
        )} k$`
      : '—'

  const scoreboardUrl = school.scoreboard_url ?? null

  return (
    <>
      <button
        type="button"
        aria-label="Fermer le panneau"
        onClick={handleClose}
        className={`fixed inset-0 z-30 cursor-default transition-opacity duration-[${TRANSITION_MS}ms] ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundColor: 'rgba(11, 29, 88, 0.4)' }}
      />
      <aside
        role="dialog"
        aria-label={school.name}
        className={`fixed inset-y-0 right-0 z-40 flex w-[680px] max-w-full flex-col overflow-hidden bg-cream shadow-2xl transition-transform duration-[${TRANSITION_MS}ms] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="bg-navy px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${DIVISION_BADGE[school.division]}`}
                >
                  {school.division}
                </span>
                {school.ranking != null && school.ranking < 1000 && (
                  <span className="inline-flex items-center gap-1 rounded bg-orange/20 px-2 py-0.5 text-[11px] font-bold text-orange">
                    🏆 #{school.ranking}
                    {school.governing_body ? ` ${school.governing_body}` : ''}{' '}
                    {school.division}
                  </span>
                )}
              </div>
              <h2 className="display text-3xl">{school.name}</h2>
              {isAdmin && (
                <div className="mt-2">
                  <EditSchoolInfo
                    school={{
                      id: school.id,
                      name: school.name,
                      coach_name: school.coach_name ?? null,
                      coach_email: school.coach_email ?? null,
                      coach_bio: school.coach_bio ?? null,
                      niche_url: school.niche_url ?? null,
                      website_url: school.website_url ?? null,
                      instagram_url: (school as { instagram_url?: string | null }).instagram_url ?? null,
                      scoreboard_url: school.scoreboard_url ?? null,
                    }}
                  />
                </div>
              )}
              <p className="mt-1 text-sm text-white/70">
                {[school.city, school.state_code].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fermer"
              className="shrink-0 rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <LinkPill {...getNicheUrl({ name: school.name, gender: school.gender ?? null, niche_url: school.niche_url ?? null, website_url: school.website_url ?? null, instagram_url: (school as { instagram_url?: string | null }).instagram_url ?? null, scoreboard_url: school.scoreboard_url ?? null })} label="Niche" />
            <LinkPill {...getWebsiteUrl({ name: school.name, gender: school.gender ?? null, niche_url: school.niche_url ?? null, website_url: school.website_url ?? null, instagram_url: (school as { instagram_url?: string | null }).instagram_url ?? null, scoreboard_url: school.scoreboard_url ?? null })} label="Team site" />
            <LinkPill {...getInstagramUrl({ name: school.name, gender: school.gender ?? null, niche_url: school.niche_url ?? null, website_url: school.website_url ?? null, instagram_url: (school as { instagram_url?: string | null }).instagram_url ?? null, scoreboard_url: school.scoreboard_url ?? null })} label="Instagram" />
            <LinkPill {...getScoreboardUrl({ name: school.name, gender: school.gender ?? null, niche_url: school.niche_url ?? null, website_url: school.website_url ?? null, instagram_url: (school as { instagram_url?: string | null }).instagram_url ?? null, scoreboard_url: school.scoreboard_url ?? null })} label="Scoreboard" />
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <StatsSection
            ranking={school.ranking}
            division={school.division}
            rosterSize={school.roster_size}
            graduates={school.graduates_count}
            tuition={tuition}
            coachInterest={assignment.coach_interest}
            assignmentId={assignment.id}
            isAdmin={isAdmin}
          />

          <CoachSection
            name={school.coach_name}
            initials={school.coach_initials}
            bio={school.coach_bio}
          />

          <RatingsSection
            assignmentId={assignment.id}
            schoolName={school.name}
            rows={rows}
            sessions={sessions}
            isAdmin={isAdmin}
            viewerRole={viewerRole}
          />

          <NotesSection
            assignmentId={assignment.id}
            notes={notesSorted}
            isAdmin={isAdmin}
            currentAgentUserId={adminContext?.agentUserId ?? null}
            isFounder={!!adminContext?.isFounder}
          />
        </div>
      </aside>
    </>
  )
}

function LinkPill({ url, isDirect, label }: { url: string; isDirect: boolean; label: string }) {
  return (
    <a
      href={url}
      title={isDirect ? label : `Rechercher ${label} sur Google`}
      target="_blank"
      rel="noreferrer"
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        isDirect
          ? 'bg-white/10 hover:bg-white/20'
          : 'bg-white/5 text-white/70 hover:bg-white/15'
      }`}
    >
      {isDirect ? label : `🔍 ${label}`} ↗
    </a>
  )
}

function StatsSection({
  ranking,
  division,
  rosterSize,
  graduates,
  tuition,
  coachInterest,
  assignmentId,
  isAdmin,
}: {
  ranking: number | null
  division: Division
  rosterSize: number | null
  graduates: number | null
  tuition: string
  coachInterest: number | null
  assignmentId: string
  isAdmin: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [optimisticInterest, setOptimisticInterest] = useState<number | null>(coachInterest)

  function setCoachInterestHandler(level: number) {
    setOptimisticInterest(level)
    startTransition(async () => {
      try {
        await updateCoachInterest(assignmentId, level)
        toast.success('Intérêt coach mis à jour')
      } catch (err) {
        console.error(err)
        setOptimisticInterest(coachInterest)
      }
    })
  }

  return (
    <section>
      <h3 className="display mb-3 text-sm text-navy">L&apos;équipe en chiffres</h3>
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Ranking">
          <span className="display text-2xl text-navy">
            {ranking != null && ranking < 1000 ? `#${ranking}` : '—'}
          </span>
          <span className="ml-1 text-xs text-muted">{division}</span>
        </Tile>


        <Tile label="Intérêt coach">
          {isAdmin ? (
            <div className="flex gap-1">
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={pending}
                  onClick={() => setCoachInterestHandler(level)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm font-bold transition-colors disabled:opacity-50 ${
                    optimisticInterest === level
                      ? 'border-orange bg-orange text-white'
                      : 'border-line bg-white text-muted hover:border-orange hover:text-orange'
                  }`}
                  aria-label={`Définir intérêt coach à ${level}/3`}
                >
                  {level}
                </button>
              ))}
            </div>
          ) : (
            <span className="display text-2xl text-navy">
              {coachInterest != null ? `${coachInterest}/3` : '—'}
            </span>
          )}
        </Tile>
      </div>
    </section>
  )
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function CoachSection({
  name,
  initials,
  bio,
}: {
  name: string | null
  initials: string | null
  bio: string | null
}) {
  if (!name) return null
  return (
    <section>
      <h3 className="display mb-3 text-sm text-navy">Coach principal</h3>
      <div className="flex gap-4 rounded-md border border-line bg-white p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-bright text-sm font-bold text-white">
          {initials || name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col">
            <span className="text-base font-bold text-navy">{name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-orange">
              Head Coach
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

type RatingRow = {
  key: string
  label: string
  isCustom: boolean
  playerRating: number | null
  playerEvaluatedAt: string | null
  parentRating: number | null
  parentEvaluatedAt: string | null
}

function latestRatingByCriterion(
  sessions: RatingSession[],
  authorType: 'player' | 'parent'
): Map<string, { rating: number; evaluated_at: string }> {
  const map = new Map<string, { rating: number; evaluated_at: string }>()
  for (const s of sessions) {
    if (s.author_type !== authorType) continue
    for (const it of s.rating_session_items ?? []) {
      const existing = map.get(it.criterion_key)
      if (!existing || s.evaluated_at > existing.evaluated_at) {
        map.set(it.criterion_key, {
          rating: it.rating,
          evaluated_at: s.evaluated_at,
        })
      }
    }
  }
  return map
}

const SHORT_DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function RatingsSection({
  assignmentId,
  schoolName,
  rows,
  sessions,
  isAdmin,
  viewerRole = 'player',
}: {
  assignmentId: string
  schoolName: string
  rows: RatingRow[]
  sessions: RatingSession[]
  isAdmin: boolean
  viewerRole?: 'player' | 'parent'
}) {
  const [pending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    startTransition(async () => {
      try {
        await addCustomCriterion(label)
        setNewLabel('')
        setAdding(false)
      } catch (err) {
        console.error(err)
      }
    })
  }

  function handleRemove(key: string) {
    startTransition(async () => {
      try {
        await removeCustomCriterion(key)
      } catch (err) {
        console.error(err)
      }
    })
  }

  function handleRename(key: string, newName: string) {
    startTransition(async () => {
      try {
        await updateCriterionLabel(key, newName)
      } catch (err) {
        console.error(err)
      }
    })
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="display text-sm text-navy">
          {isAdmin ? "Avis du joueur" : 'Ton avis sur cette école'}
        </h3>
        {!isAdmin && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="text-xs font-bold uppercase tracking-wide text-orange transition-colors hover:underline"
          >
            + Ajouter critère
          </button>
        )}
      </div>

      {adding && !isAdmin && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') {
                setAdding(false)
                setNewLabel('')
              }
            }}
            placeholder="Ex: Météo"
            autoFocus
            className="flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-orange"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending || !newLabel.trim()}
            className="rounded-md bg-orange px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
          >
            OK
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-line bg-white">
        <div className="grid grid-cols-[1fr_120px_120px_24px] gap-2 border-b border-line bg-cream-2/50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted">
          <span>Critère</span>
          <span className="text-center">👤 Joueur</span>
          <span className="text-center">👥 Parent</span>
          <span />
        </div>
        <ul>
          {rows.map((row) => (
            <CriterionRow
              key={row.key}
              row={row}
              pending={pending}
              isAdmin={isAdmin}
              onRemove={() => handleRemove(row.key)}
              onRename={(newName) => handleRename(row.key, newName)}
            />
          ))}
          {rows.length === 0 && (
            <li className="px-3 py-4 text-center text-xs text-muted">
              Aucun critère défini.
            </li>
          )}
        </ul>
      </div>

      {!isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEvaluating(true)}
            disabled={pending || rows.length === 0}
            className="rounded-md bg-orange px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
          >
            📊 Évaluer cette école
          </button>
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-navy transition-colors hover:border-orange"
            >
              {showHistory ? '⬆ Masquer historique' : `📈 Historique (${sessions.length})`}
            </button>
          )}
        </div>
      )}

      {isAdmin && sessions.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="mt-3 rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-navy transition-colors hover:border-orange"
        >
          {showHistory ? '⬆ Masquer historique' : `📈 Historique (${sessions.length} évaluation${sessions.length > 1 ? 's' : ''})`}
        </button>
      )}

      {showHistory && (
        <RatingHistoryView sessions={sessions} criteria={rows} />
      )}

      {evaluating && (
        <RateSchoolModal
          schoolName={schoolName}
          rows={rows}
          viewerRole={viewerRole}
          onClose={() => setEvaluating(false)}
          onSave={(items) => {
            const today = new Date().toISOString().slice(0, 10)
            startTransition(async () => {
              try {
                await saveRatingSession(assignmentId, today, items)
                toast.success('Évaluation enregistrée')
                setEvaluating(false)
              } catch (err) {
                console.error(err)
                toast.error('Erreur lors de l’enregistrement')
              }
            })
          }}
          pending={pending}
        />
      )}
    </section>
  )
}

function CriterionRow({
  row,
  pending,
  isAdmin,
  onRemove,
  onRename,
}: {
  row: RatingRow
  pending: boolean
  isAdmin: boolean
  onRemove: () => void
  onRename: (newName: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row.label)

  function commitRename() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === row.label) {
      setDraft(row.label)
      setEditing(false)
      return
    }
    onRename(trimmed)
    setEditing(false)
  }

  function cancelRename() {
    setDraft(row.label)
    setEditing(false)
  }

  return (
    <li className="grid grid-cols-[1fr_120px_120px_24px] items-center gap-2 border-t border-line px-3 py-2 first:border-t-0">
      <div className="flex items-center gap-1">
        {editing && !isAdmin ? (
          <>
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') cancelRename()
              }}
              disabled={pending}
              className="flex-1 rounded-md border border-orange bg-white px-2 py-1 text-sm text-navy outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitRename}
              disabled={pending || !draft.trim()}
              aria-label="Valider"
              className="rounded-md bg-orange px-2 py-1 text-xs font-bold text-white"
            >
              ✓
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={cancelRename}
              disabled={pending}
              aria-label="Annuler"
              className="rounded-md border border-line bg-white px-2 py-1 text-xs text-muted"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-navy">{row.label}</span>
            {!isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setDraft(row.label)
                  setEditing(true)
                }}
                disabled={pending}
                className="text-xs text-muted hover:text-orange disabled:opacity-60"
                aria-label={`Renommer ${row.label}`}
              >
                ✎
              </button>
            )}
          </>
        )}
      </div>
      <StarDisplay value={row.playerRating} />
      <StarDisplay value={row.parentRating} />
      {row.isCustom && !isAdmin ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label="Supprimer ce critère"
          className="text-muted hover:text-red-600 disabled:opacity-60"
        >
          ✕
        </button>
      ) : (
        <span />
      )}
    </li>
  )
}

function StarDisplay({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-center text-xs text-muted">—</span>
  }
  return (
    <span className="text-center text-sm leading-none">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= value ? 'text-orange' : 'text-zinc-300'}
        >
          {n <= value ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

function RateSchoolModal({
  schoolName,
  rows,
  viewerRole,
  onClose,
  onSave,
  pending,
}: {
  schoolName: string
  rows: RatingRow[]
  viewerRole: 'player' | 'parent'
  onClose: () => void
  onSave: (
    items: Array<{
      criterion_key: string
      criterion_label: string
      is_custom: boolean
      rating: number
    }>
  ) => void
  pending: boolean
}) {
  const initialRatings = new Map<string, number>()
  for (const r of rows) {
    const current = viewerRole === 'player' ? r.playerRating : r.parentRating
    if (current != null) initialRatings.set(r.key, current)
  }
  const [values, setValues] = useState<Map<string, number>>(initialRatings)

  useEffect(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      const cur = viewerRole === 'player' ? r.playerRating : r.parentRating
      if (cur != null) map.set(r.key, cur)
    }
    setValues(map)
  }, [viewerRole, rows])

  function setValue(key: string, v: number) {
    setValues((prev) => {
      const next = new Map(prev)
      next.set(key, v)
      return next
    })
  }

  function handleSave() {
    const items = rows
      .filter((r) => values.has(r.key))
      .map((r) => ({
        criterion_key: r.key,
        criterion_label: r.label,
        is_custom: r.isCustom,
        rating: values.get(r.key)!,
      }))
    if (items.length === 0) return
    onSave(items)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const today = SHORT_DATE_FMT.format(new Date())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-md bg-white shadow-xl">
        <header className="flex items-start justify-between gap-2 border-b border-line px-5 py-4">
          <div>
            <h3 className="display text-lg text-navy">Évaluer {schoolName}</h3>
            <p className="text-xs text-muted">Évaluation du {today}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 text-muted hover:bg-cream-2 hover:text-navy"
          >
            ✕
          </button>
        </header>

        <div className="px-5 py-4">
          <div className="mb-4 rounded-md bg-cream-2 px-3 py-2 text-xs text-navy">
            Tu évalues en tant que{' '}
            <strong>
              {viewerRole === 'player' ? '👤 Joueur' : '👥 Parent'}
            </strong>
          </div>

          <ul className="flex flex-col gap-2">
            {rows.map((row) => {
              const v = values.get(row.key)
              return (
                <li
                  key={row.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2"
                >
                  <span className="flex-1 truncate text-sm text-navy">
                    {row.label}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setValue(row.key, n)}
                        aria-label={`${n}/5`}
                        className="text-xl leading-none"
                      >
                        <span
                          className={
                            n <= (v ?? 0) ? 'text-orange' : 'text-zinc-300'
                          }
                        >
                          {n <= (v ?? 0) ? '★' : '☆'}
                        </span>
                      </button>
                    ))}
                    {v != null && (
                      <button
                        type="button"
                        onClick={() =>
                          setValues((p) => {
                            const next = new Map(p)
                            next.delete(row.key)
                            return next
                          })
                        }
                        className="ml-1 text-xs text-muted hover:text-red-600"
                        aria-label="Effacer"
                        title="Effacer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-navy"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || values.size === 0}
            className="rounded-md bg-orange px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer cette évaluation'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function RatingHistoryView({
  sessions,
  criteria,
}: {
  sessions: RatingSession[]
  criteria: RatingRow[]
}) {
  // sort all sessions ASC by evaluated_at for chart data, DESC for list
  const sortedAsc = [...sessions].sort((a, b) =>
    a.evaluated_at.localeCompare(b.evaluated_at)
  )

  // Build per-criterion series: { player: [{date, rating}], parent: [...] }
  type Series = { date: string; rating: number }
  type CritData = { player: Series[]; parent: Series[] }
  const byCriterion = new Map<string, CritData>()
  for (const c of criteria) {
    byCriterion.set(c.key, { player: [], parent: [] })
  }
  for (const sess of sortedAsc) {
    for (const it of sess.rating_session_items ?? []) {
      const entry = byCriterion.get(it.criterion_key)
      if (!entry) continue
      entry[sess.author_type].push({
        date: sess.evaluated_at,
        rating: it.rating,
      })
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed border-line bg-white p-4 text-center text-xs text-muted">
        Aucune évaluation enregistrée pour l’instant.
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-md border border-line bg-white p-4">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
        Évolution par critère
      </h4>
      <ul className="flex flex-col gap-3">
        {criteria.map((c) => {
          const data = byCriterion.get(c.key)
          if (!data || (data.player.length === 0 && data.parent.length === 0)) {
            return null
          }
          return (
            <li
              key={c.key}
              className="border-b border-line pb-3 last:border-b-0 last:pb-0"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-navy">{c.label}</span>
                <div className="flex gap-3 text-[10px] uppercase tracking-wide">
                  {data.player.length > 0 && (
                    <span className="text-orange">
                      👤 {data.player[data.player.length - 1].rating}/5
                    </span>
                  )}
                  {data.parent.length > 0 && (
                    <span className="text-blue-600">
                      👥 {data.parent[data.parent.length - 1].rating}/5
                    </span>
                  )}
                </div>
              </div>
              <Sparkline
                player={data.player}
                parent={data.parent}
              />
            </li>
          )
        })}
      </ul>

      <h4 className="mt-5 mb-2 text-xs font-bold uppercase tracking-wide text-muted">
        Sessions
      </h4>
      <ul className="flex flex-col gap-1 text-xs">
        {[...sessions]
          .sort((a, b) => b.evaluated_at.localeCompare(a.evaluated_at))
          .map((s) => {
            const items = s.rating_session_items ?? []
            const avg =
              items.length > 0
                ? (
                    items.reduce((acc, it) => acc + it.rating, 0) / items.length
                  ).toFixed(1)
                : '—'
            return (
              <li
                key={s.id}
                className="flex items-center justify-between rounded border border-line px-2 py-1.5"
              >
                <span className="text-navy">
                  {SHORT_DATE_FMT.format(new Date(s.evaluated_at))}{' '}
                  <span className={s.author_type === 'player' ? 'text-orange' : 'text-blue-600'}>
                    · {s.author_type === 'player' ? '👤 Joueur' : '👥 Parent'}
                  </span>
                </span>
                <span className="text-muted">
                  {items.length} critère{items.length > 1 ? 's' : ''} · moy {avg}/5
                </span>
              </li>
            )
          })}
      </ul>
    </div>
  )
}

function Sparkline({
  player,
  parent,
}: {
  player: Array<{ date: string; rating: number }>
  parent: Array<{ date: string; rating: number }>
}) {
  // Collect all unique dates from both series
  const allDates = Array.from(
    new Set([...player, ...parent].map((p) => p.date))
  ).sort()
  if (allDates.length === 0) return null

  const W = 280
  const H = 40
  const padX = 4
  const padY = 6

  const x = (date: string) => {
    if (allDates.length === 1) return W / 2
    const idx = allDates.indexOf(date)
    return padX + (idx * (W - 2 * padX)) / (allDates.length - 1)
  }
  const y = (rating: number) =>
    H - padY - ((rating - 1) * (H - 2 * padY)) / 4

  function path(series: Array<{ date: string; rating: number }>) {
    if (series.length === 0) return ''
    return series
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date)},${y(p.rating)}`)
      .join(' ')
  }

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="mt-1 w-full max-w-[280px]"
    >
      <line
        x1={padX}
        y1={H - padY}
        x2={W - padX}
        y2={H - padY}
        stroke="#E5E2D9"
        strokeWidth="1"
      />
      {player.length > 0 && (
        <>
          <path d={path(player)} fill="none" stroke="#E11D2A" strokeWidth="2" />
          {player.map((p) => (
            <circle
              key={`pl-${p.date}`}
              cx={x(p.date)}
              cy={y(p.rating)}
              r="3"
              fill="#E11D2A"
            />
          ))}
        </>
      )}
      {parent.length > 0 && (
        <>
          <path
            d={path(parent)}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2"
            strokeDasharray="3 2"
          />
          {parent.map((p) => (
            <circle
              key={`pa-${p.date}`}
              cx={x(p.date)}
              cy={y(p.rating)}
              r="3"
              fill="#2563EB"
            />
          ))}
        </>
      )}
    </svg>
  )
}

function NotesSection({
  assignmentId,
  notes,
  isAdmin,
  currentAgentUserId,
  isFounder,
}: {
  assignmentId: string
  notes: Note[]
  isAdmin: boolean
  currentAgentUserId: string | null
  isFounder: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [notesFilter, setNotesFilter] = useState<'all' | 'private' | 'shared'>('all')
  const today = new Date().toISOString().slice(0, 10)
  function handleSubmit(formData: FormData) {
    const noteDate = formData.get('note_date')?.toString() || today
    const body = formData.get('body')?.toString() || ''
    const authorRole = (formData.get('author_role')?.toString() || 'player') as
      | 'player'
      | 'parent'
      | 'other'
    const visibility = (formData.get('visibility')?.toString() || 'shared') as
      | 'shared'
      | 'private'
    if (!body.trim()) return
    startTransition(async () => {
      try {
        if (isAdmin) {
          await addNoteAsAgent(assignmentId, noteDate, body, visibility)
        } else {
          await addNote(assignmentId, noteDate, body, authorRole, visibility)
        }
        setAdding(false)
        toast.success('Note enregistrée')
      } catch (err) {
        console.error(err)
        toast.error('Impossible d’enregistrer la note.')
      }
    })
  }

  function handleDelete(noteId: string) {
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cette note ?')) return
    startTransition(async () => {
      try {
        await deleteNote(noteId)
        toast.success('Note supprimée')
      } catch (err) {
        console.error(err)
      }
    })
  }

  function beginEdit(note: Note) {
    setEditingNoteId(note.id)
    setEditingBody(note.body)
  }

  function cancelEdit() {
    setEditingNoteId(null)
    setEditingBody('')
  }

  function saveEdit(noteId: string) {
    const body = editingBody.trim()
    if (!body) return
    startTransition(async () => {
      try {
        await updateNote(noteId, body)
        toast.success('Note mise à jour')
        cancelEdit()
      } catch (err) {
        console.error(err)
        toast.error('Impossible de modifier — voir console.')
      }
    })
  }

  function canEditNote(note: Note): boolean {
    if (isAdmin) {
      // Founder edits any agent note; an agent can only edit their own.
      if (note.author_type === 'agent') {
        if (isFounder) return true
        return !!currentAgentUserId && note.author_user_id === currentAgentUserId
      }
      // Player/parent notes are not editable by agents — they own those.
      return false
    }
    // Player/parent side: edit own note only.
    return ['player', 'parent', 'other'].includes(note.author_type)
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="display text-sm text-navy">Notes de calls &amp; rencontres</h3>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="text-xs font-bold uppercase tracking-wide text-orange transition-colors hover:underline"
        >
          + Ajouter note
        </button>
      </div>

      <div className="mb-3 flex gap-1 rounded-md border border-line bg-white p-1">
        <button
          type="button"
          onClick={() => setNotesFilter('all')}
          className={`flex-1 rounded px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${notesFilter === 'all' ? 'bg-orange text-white' : 'text-muted hover:text-navy'}`}
        >
          Toutes ({notes.length})
        </button>
        <button
          type="button"
          onClick={() => setNotesFilter('shared')}
          className={`flex-1 rounded px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${notesFilter === 'shared' ? 'bg-orange text-white' : 'text-muted hover:text-navy'}`}
        >
          👁️ Partagées ({notes.filter((n) => n.visibility !== 'private').length})
        </button>
        <button
          type="button"
          onClick={() => setNotesFilter('private')}
          className={`flex-1 rounded px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors ${notesFilter === 'private' ? 'bg-orange text-white' : 'text-muted hover:text-navy'}`}
        >
          🔒 Privées ({notes.filter((n) => n.visibility === 'private').length})
        </button>
      </div>

      {adding && (
        <form
          action={handleSubmit}
          className="mb-3 flex flex-col gap-2 rounded-md border border-line bg-white p-3"
        >
          <input
            type="date"
            name="note_date"
            defaultValue={today}
            className="rounded-md border border-line bg-white px-2 py-1 text-sm outline-none focus:border-orange"
          />
          {!isAdmin && (
            <select
              name="author_role"
              defaultValue="player"
              className="rounded-md border border-line bg-white px-2 py-1 text-sm outline-none focus:border-orange"
            >
              <option value="player">🏌️ Joueur</option>
              <option value="parent">👨‍👩‍👦 Parent</option>
              <option value="other">📝 Autre</option>
            </select>
          )}
          <textarea
            name="body"
            placeholder="Ce qui s'est dit&hellip;"
            rows={4}
            required
            className="rounded-md border border-line bg-white px-2 py-1 text-sm outline-none focus:border-orange"
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 text-xs">
              <label
                className="flex items-center gap-1 cursor-pointer"
                title={isAdmin ? 'Visible par le joueur' : "Visible par l'agent"}
              >
                <input type="radio" name="visibility" value="shared" defaultChecked />
                <span>👁️ Partagée</span>
              </label>
              <label
                className="flex items-center gap-1 cursor-pointer"
                title="Visible uniquement par toi"
              >
                <input type="radio" name="visibility" value="private" />
                <span>🔒 Privée</span>
              </label>
            </div>
            <p className="text-[10px] text-muted">
              {isAdmin
                ? 'Partagée : visible par le joueur. Privée : seulement toi.'
                : "Partagée : visible par l'agent USAP. Privée : visible par toi et l'admin USAP."}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md px-3 py-1 text-xs text-muted transition-colors hover:text-navy"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-orange px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <p className="rounded-md border border-dashed border-line py-6 text-center text-xs text-muted">
          Aucune note pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes
            .filter((n) =>
              notesFilter === 'all'
                ? true
                : notesFilter === 'private'
                ? n.visibility === 'private'
                : n.visibility !== 'private'
            )
            .map((note) => {
              const wasEdited =
                !!note.updated_at && note.updated_at !== note.created_at
              const isEditing = editingNoteId === note.id
              const editable = canEditNote(note)
              const deletable =
                !isAdmin &&
                ['player', 'parent', 'other'].includes(note.author_type)
              return (
                <li
                  key={note.id}
                  className="rounded-md border border-line bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted">
                      {formatDate(note.note_date)}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        note.author_type === 'agent'
                          ? 'text-navy-bright'
                          : 'text-orange'
                      }`}
                    >
                      {note.author_name}
                      {note.author_type === 'parent' && ' (parent)'}
                      {note.author_type === 'other' && ' (autre)'}
                      {note.visibility === 'private' && ' 🔒'}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        rows={Math.max(3, editingBody.split('\n').length + 1)}
                        className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm text-navy focus:border-orange focus:outline-none"
                      />
                      <div className="flex justify-end gap-2 text-[11px] font-bold uppercase">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={pending}
                          className="text-muted hover:text-navy"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(note.id)}
                          disabled={pending || !editingBody.trim()}
                          className="rounded-md bg-orange px-3 py-1 text-white hover:bg-[#C11722] disabled:opacity-50"
                        >
                          Sauver
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-navy">
                        {note.body}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-muted">
                        <span>
                          Écrite le {formatDate(note.created_at)}
                          {wasEdited && note.updated_at && (
                            <> · Modifiée le {formatDate(note.updated_at)}</>
                          )}
                        </span>
                        <div className="flex gap-2">
                          {editable && (
                            <button
                              type="button"
                              onClick={() => beginEdit(note)}
                              disabled={pending}
                              className="text-muted transition-colors hover:text-orange disabled:opacity-60"
                            >
                              Modifier
                            </button>
                          )}
                          {deletable && (
                            <button
                              type="button"
                              onClick={() => handleDelete(note.id)}
                              disabled={pending}
                              className="text-muted transition-colors hover:text-red disabled:opacity-60"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
        </ul>
      )}
    </section>
  )
}
