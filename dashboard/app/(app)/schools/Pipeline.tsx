'use client'

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { removeAssignment, updateAssignmentStage } from './actions'

// iOS Safari has documented issues with HTML5 `draggable` + click handlers:
// the synthetic click after a tap is suppressed on draggable elements, so
// touch users can never open the school detail. We detect coarse pointers
// and disable `draggable` on those devices — drag-to-reassign-stage is a
// desktop-only affordance anyway.
function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(hover: none), (pointer: coarse)')
    setIsTouch(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isTouch
}
import { AddSchoolModal } from './AddSchoolModal'
import { SchoolDetail } from './SchoolDetail'
import { USMap } from './USMap'

export type Stage = 'interested' | 'talks' | 'offer'
export type Division = 'D1' | 'D2' | 'D3' | 'NAIA' | 'JUCO'

export type School = {
  gender: string | null
  id: string
  name: string
  city: string | null
  state_code: string | null
  division: Division
  governing_body: string | null
  ranking: number | null
  coach_name: string | null
  niche_url: string | null
  website_url: string | null
  scoreboard_url: string | null
  roster_size: number | null
  graduates_count: number | null
  tuition_min_usd: number | null
  tuition_max_usd: number | null
  coach_email: string | null
  coach_initials: string | null
  coach_bio: string | null
  lat: number | null
  lng: number | null
}

export type RatingSessionItem = {
  criterion_key: string
  criterion_label: string
  is_custom: boolean
  rating: number
}

export type RatingSession = {
  id: string
  author_type: 'player' | 'parent'
  evaluated_at: string
  created_at: string
  rating_session_items: RatingSessionItem[]
}

export type Note = {
  id: string
  note_date: string
  author_type: 'player' | 'parent' | 'other' | 'agent'
  visibility: 'shared' | 'private'
  author_user_id: string | null
  author_name: string
  body: string
  created_at: string
  updated_at: string | null
}

export type Assignment = {
  id: string
  stage: Stage
  coach_interest: number | null
  schools: School | null
  rating_sessions: RatingSession[]
  school_call_notes: Note[]
}

export type PlayerCriterion = {
  id: string
  criterion_key: string
  label: string
  is_default: boolean
  position: number
}

const COLUMNS: { stage: Stage; label: string }[] = [
  { stage: 'interested', label: 'Intéressés par toi' },
  { stage: 'talks', label: 'En échange' },
  { stage: 'offer', label: 'Offre reçue' },
]

const DIVISION_BADGE: Record<Division, string> = {
  D1: 'bg-navy text-white',
  D2: 'bg-navy-bright text-white',
  D3: 'bg-navy-bright text-white',
  NAIA: 'bg-orange text-white',
  JUCO: 'bg-zinc-500 text-white',
}

const COACH_INTEREST_STYLE: Record<1 | 2 | 3, string> = {
  1: 'bg-zinc-200 text-muted',
  2: 'bg-orange-soft text-orange',
  3: 'bg-orange text-white',
}

type OptimisticAction =
  | { type: 'stage'; id: string; stage: Stage }
  | { type: 'delete'; id: string }

export type AdminContext = {
  agentName: string
  // Used by NotesSection to decide who can edit/delete notes from agents.
  agentUserId?: string | null
  isFounder?: boolean
}

export function Pipeline({
  assignments,
  availableSchools,
  playerCriteria,
  adminContext,
  viewerRole = 'player',
}: {
  assignments: Assignment[]
  availableSchools: School[]
  playerCriteria: PlayerCriterion[]
  adminContext?: AdminContext
  viewerRole?: 'player' | 'parent'
}) {
  const isAdmin = !!adminContext
  const isTouchDevice = useIsTouchDevice()
  const [, startTransition] = useTransition()
  const [optimistic, applyOptimistic] = useOptimistic<Assignment[], OptimisticAction>(
    assignments,
    (state, action) => {
      if (action.type === 'stage') {
        return state.map((a) =>
          a.id === action.id ? { ...a, stage: action.stage } : a
        )
      }
      if (action.type === 'delete') {
        return state.filter((a) => a.id !== action.id)
      }
      return state
    }
  )
  const [overStage, setOverStage] = useState<Stage | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'map'>('list')
  // True only between dragstart and dragend. We also clear it at the next
  // microtask after dragend so that the synthetic click that some browsers
  // fire on the dragged element doesn't reach handleCardClick.
  const draggingRef = useRef(false)
  // Set to the id we suspect is being dragged when dragstart fires. We only
  // gate clicks if a drop actually moved the card.
  const dragMovedRef = useRef(false)

  function handleDragStart(e: React.DragEvent<HTMLElement>, id: string) {
    draggingRef.current = true
    dragMovedRef.current = false
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    // dragend always fires (even if drop was cancelled). Wait one frame so
    // the post-drag synthetic click is suppressed, then unlock further clicks.
    requestAnimationFrame(() => {
      draggingRef.current = false
      dragMovedRef.current = false
    })
  }

  function handleCardClick(id: string) {
    // Only suppress click if a real drag is in progress. Stale ref state will
    // not silently swallow clicks because dragend clears it on the next frame.
    if (draggingRef.current || dragMovedRef.current) return
    setSelectedId(id)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stage: Stage) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overStage !== stage) setOverStage(stage)
  }

  function handleDragLeaveCol(e: React.DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setOverStage(null)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, newStage: Stage) {
    e.preventDefault()
    setOverStage(null)
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    commitStageChange(id, newStage)
  }

  function commitStageChange(id: string, newStage: Stage) {
    const current = optimistic.find((a) => a.id === id)
    if (!current || current.stage === newStage) return
    dragMovedRef.current = true
    startTransition(async () => {
      applyOptimistic({ type: 'stage', id, stage: newStage })
      try {
        await updateAssignmentStage(id, newStage)
      } catch (err) {
        console.error(err)
      }
    })
  }

  // --- Touch drag implementation -------------------------------------------
  // HTML5 drag events don't fire from touch on iOS Safari, so we run our own
  // pointer tracking on the drag-handle. The visual drop preview reuses the
  // same overStage state as the desktop flow; the drop dispatches through
  // commitStageChange so the optimistic update + server action stay in sync.
  const touchDragRef = useRef<{
    id: string
    pointerId: number | null
    moved: boolean
  } | null>(null)

  function findStageAtPoint(x: number, y: number): Stage | null {
    if (typeof document === 'undefined') return null
    const el = document.elementFromPoint(x, y)
    if (!el) return null
    const stageEl = (el as HTMLElement).closest('[data-drop-stage]')
    const stage = stageEl?.getAttribute('data-drop-stage')
    if (stage === 'interested' || stage === 'talks' || stage === 'offer') {
      return stage
    }
    return null
  }

  function handleHandleTouchStart(e: React.TouchEvent, id: string) {
    if (e.touches.length !== 1) return
    e.stopPropagation()
    const t = e.touches[0]
    touchDragRef.current = { id, pointerId: t.identifier, moved: false }
    draggingRef.current = true
    dragMovedRef.current = false
  }

  function handleHandleTouchMove(e: React.TouchEvent) {
    const drag = touchDragRef.current
    if (!drag) return
    // touch-action:none on the handle already disables native scroll; React's
    // synthetic touchmove is passive so preventDefault would be a no-op.
    const t = e.touches[0]
    drag.moved = true
    const stage = findStageAtPoint(t.clientX, t.clientY)
    if (stage !== overStage) setOverStage(stage)
  }

  function handleHandleTouchEnd(e: React.TouchEvent) {
    const drag = touchDragRef.current
    touchDragRef.current = null
    setOverStage(null)
    if (!drag) {
      requestAnimationFrame(() => {
        draggingRef.current = false
      })
      return
    }
    const t = e.changedTouches[0]
    const stage = t ? findStageAtPoint(t.clientX, t.clientY) : null
    if (stage && drag.moved) {
      commitStageChange(drag.id, stage)
    }
    requestAnimationFrame(() => {
      draggingRef.current = false
      dragMovedRef.current = false
    })
  }

  function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    const subject = isAdmin ? 'pipeline du joueur' : 'ta pipeline'
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Tu es sûr de retirer ${name} de ${subject} ?`)
    )
      return
    startTransition(async () => {
      applyOptimistic({ type: 'delete', id })
      try {
        await removeAssignment(id)
        toast.success('École retirée')
        if (selectedId === id) setSelectedId(null)
      } catch (err) {
        console.error(err)
        toast.error('Impossible de supprimer — voir console.')
      }
    })
  }

  const selected = selectedId ? optimistic.find((a) => a.id === selectedId) : null

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-2xl text-navy sm:text-3xl">
          {isAdmin ? 'Pipeline du joueur' : 'Mes écoles cibles'}
        </h1>
        <div className="flex items-center gap-3">
          <ViewToggle value={view} onChange={setView} />
          {!isAdmin && <AddSchoolModal availableSchools={availableSchools} />}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher une école…"
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-navy outline-none focus:border-orange placeholder:text-muted"
        />
        {search && (() => {
          const matches = optimistic.filter(
            (a) =>
              (a.schools?.name?.toLowerCase().includes(search.toLowerCase()) ?? false)
          ).length
          return (
            <p className="mt-2 text-xs text-muted">
              {matches === 0
                ? `Aucune école ne correspond à "${search}"`
                : `${matches} école${matches > 1 ? 's' : ''} trouvée${matches > 1 ? 's' : ''}`}
            </p>
          )
        })()}
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map(({ stage, label }) => {
            const items = optimistic.filter(
              (a) =>
                a.stage === stage &&
                (search === '' ||
                  (a.schools?.name?.toLowerCase().includes(search.toLowerCase()) ?? false))
            )
            const isOver = overStage === stage
            return (
              <div
                key={stage}
                data-drop-stage={stage}
                onDragOver={(e) => handleDragOver(e, stage)}
                onDragLeave={handleDragLeaveCol}
                onDrop={(e) => handleDrop(e, stage)}
                className={`flex min-h-[180px] flex-col rounded-md border bg-white p-3 transition-colors lg:min-h-[300px] ${
                  isOver ? 'border-orange bg-orange-soft' : 'border-line'
                }`}
              >
                {/* On mobile, columns stack vertically. Make each header sticky
                    so the stage label + count stay anchored while scrolling its
                    cards, and remain a visible drop target. On lg+, columns sit
                    side-by-side and the header reverts to a static block. */}
                <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-3 flex items-center justify-between border-b border-line bg-white px-3 pt-3 pb-2 lg:static lg:m-0 lg:mb-3 lg:border-b-0 lg:bg-transparent lg:p-0 lg:pb-0">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-navy">
                    {label}
                  </h2>
                  <span className="rounded-full bg-cream-2 px-2 py-0.5 text-xs font-semibold text-muted">
                    {items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {items.length === 0 ? (
                    <p className="rounded-md border border-dashed border-line py-6 text-center text-xs text-muted">
                      Glisse une école ici
                    </p>
                  ) : (
                    items.map((a) => {
                      const s = a.schools
                      if (!s) return null
                      const ci = a.coach_interest
                      const ciStyle =
                        ci === 1 || ci === 2 || ci === 3
                          ? COACH_INTEREST_STYLE[ci]
                          : null
                      return (
                        <article
                          key={a.id}
                          onClick={(e) => {
                            // ignore clicks on interactive children (delete button, drag handle, links)
                            if (
                              (e.target as HTMLElement).closest(
                                'button, a, [data-drag-handle]'
                              )
                            )
                              return
                            handleCardClick(a.id)
                          }}
                          style={{ touchAction: 'manipulation' }}
                          className="group relative cursor-pointer rounded-md border border-line bg-white p-3 shadow-sm transition-shadow hover:shadow"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, a.id, s.name)}
                            aria-label={`Supprimer ${s.name}`}
                            className={
                              isTouchDevice
                                ? 'absolute right-1.5 top-1.5 flex h-[20px] w-[20px] items-center justify-center rounded-full bg-zinc-200 text-[12px] font-bold text-muted hover:bg-red hover:text-white'
                                : 'pointer-events-none absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-zinc-200 text-[11px] font-bold text-muted opacity-0 transition-all hover:bg-red hover:text-white group-hover:pointer-events-auto group-hover:opacity-100'
                            }
                          >
                            ×
                          </button>
                          <div className="flex items-start justify-between gap-2 pr-5">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${DIVISION_BADGE[s.division]}`}
                            >
                              {s.division}
                            </span>
                            {ciStyle && (
                              <span
                                title={`Intérêt coach: ${ci}/3`}
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${ciStyle}`}
                              >
                                {ci}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-start gap-2">
                            <DragHandle
                              onMouseDragStart={(e) => handleDragStart(e, a.id)}
                              onMouseDragEnd={handleDragEnd}
                              onTouchDragStart={(e) =>
                                handleHandleTouchStart(e, a.id)
                              }
                              onTouchDragMove={handleHandleTouchMove}
                              onTouchDragEnd={handleHandleTouchEnd}
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-bold text-navy">
                                {s.name}
                              </h3>
                              <div className="mt-0.5 flex items-center justify-between text-xs text-muted">
                                <span>
                                  {[s.city, s.state_code]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                                {s.ranking != null && s.ranking < 1000 && (
                                  <span>#{s.ranking}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <USMap
          assignments={optimistic}
          onSelect={(id) => setSelectedId(id)}
        />
      )}

      {selected && (
        <SchoolDetail
          key={selected.id}
          assignment={selected}
          playerCriteria={playerCriteria}
          adminContext={adminContext}
          viewerRole={viewerRole}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function DragHandle({
  onMouseDragStart,
  onMouseDragEnd,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
}: {
  onMouseDragStart: (e: React.DragEvent<HTMLSpanElement>) => void
  onMouseDragEnd: () => void
  onTouchDragStart: (e: React.TouchEvent<HTMLSpanElement>) => void
  onTouchDragMove: (e: React.TouchEvent<HTMLSpanElement>) => void
  onTouchDragEnd: (e: React.TouchEvent<HTMLSpanElement>) => void
}) {
  return (
    <span
      data-drag-handle
      role="button"
      aria-label="Glisser pour réorganiser"
      draggable
      onDragStart={onMouseDragStart}
      onDragEnd={onMouseDragEnd}
      onTouchStart={onTouchDragStart}
      onTouchMove={onTouchDragMove}
      onTouchEnd={onTouchDragEnd}
      onTouchCancel={onTouchDragEnd}
      onClick={(e) => e.stopPropagation()}
      style={{ touchAction: 'none' }}
      className="mt-0.5 inline-flex shrink-0 cursor-grab items-center justify-center text-zinc-300 opacity-60 transition-opacity hover:text-zinc-500 hover:opacity-100 active:cursor-grabbing active:text-orange"
    >
      <svg
        width="12"
        height="16"
        viewBox="0 0 12 16"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="3" cy="3" r="1.4" />
        <circle cx="9" cy="3" r="1.4" />
        <circle cx="3" cy="8" r="1.4" />
        <circle cx="9" cy="8" r="1.4" />
        <circle cx="3" cy="13" r="1.4" />
        <circle cx="9" cy="13" r="1.4" />
      </svg>
    </span>
  )
}

function ViewToggle({
  value,
  onChange,
}: {
  value: 'list' | 'map'
  onChange: (v: 'list' | 'map') => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-line bg-white text-xs font-semibold">
      {(['list', 'map'] as const).map((v) => {
        const active = value === v
        const label = v === 'list' ? 'Liste' : 'Carte'
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 transition-colors ${
              active ? 'bg-navy text-white' : 'text-muted hover:text-navy'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
