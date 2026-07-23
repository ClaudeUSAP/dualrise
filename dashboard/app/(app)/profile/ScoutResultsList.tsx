'use client'

import { useState } from 'react'
import type { ScoutResult } from '@/lib/scout-types'

const INITIAL = 10

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—'
  const s = String(v).trim()
  return s === '' ? '—' : s
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR')
}

function fmtSigned(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return n > 0 ? `+${n}` : `${n}`
}

export function ScoutResultsList({ results }: { results: ScoutResult[] }) {
  const [expanded, setExpanded] = useState(false)

  if (results.length === 0) {
    return <p className="text-sm text-muted">Aucun résultat enregistré.</p>
  }

  const shown = expanded ? results : results.slice(0, INITIAL)
  const remaining = results.length - INITIAL

  return (
    <div>
      <ul className="divide-y divide-line rounded-md border border-line">
        {shown.map((r, i) => (
          <li
            key={`${r.tournamentName}-${i}`}
            className="flex items-center justify-between gap-3 px-4 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-navy">
                {r.tournamentName ?? '—'}
              </div>
              <div className="text-xs text-muted">
                {fmtDate(r.date)}
                {r.location ? ` · ${r.location}` : ''}
                {r.rounds.length > 0 ? ` · ${r.rounds.join('-')}` : ''}
              </div>
            </div>
            <div className="shrink-0 text-right">
              {(r.position || r.fieldSize) && (
                <div className="text-sm font-bold text-navy">
                  {r.position}
                  {r.fieldSize ? (
                    <span className="font-normal text-muted">
                      {r.position ? ' / ' : ''}
                      {r.fieldSize}
                    </span>
                  ) : null}
                </div>
              )}
              <div className="text-xs text-muted">
                {fmt(r.totalScore)}
                {r.vsPar !== null ? ` · ${fmtSigned(r.vsPar)} par` : ''}
                {r.vsCR !== null ? ` · ${fmtSigned(r.vsCR)} CR` : ''}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-semibold text-orange hover:underline"
        >
          {expanded ? 'Voir moins' : `Voir plus (${remaining})`}
        </button>
      )}
    </div>
  )
}
