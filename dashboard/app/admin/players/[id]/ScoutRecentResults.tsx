'use client'

import { useState } from 'react'
import type { ScoutResult } from '@/lib/scout-types'

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('fr-FR')
}

function fmtSigned(n: number | null): string {
  if (n === null || n === undefined) return ''
  return n > 0 ? `+${n}` : `${n}`
}

/**
 * Agent/founder view (§6.6): read-only "Résultats récents" — the 10 most recent
 * SCOUT tournaments for this player, shown regardless of recruiting status
 * (even committed / in_college).
 */
export function ScoutRecentResults({ results }: { results: ScoutResult[] }) {
  const [open, setOpen] = useState(false)
  const shown = results.slice(0, 10)

  return (
    <div className="rounded-md border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="display text-sm text-navy">
          Résultats récents{' '}
          <span className="font-normal text-muted">({results.length} tournois SCOUT)</span>
        </span>
        <span className="text-xs font-semibold text-orange">{open ? 'Masquer' : 'Voir'}</span>
      </button>

      {open && (
        <div className="border-t border-line">
          {shown.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Aucun résultat SCOUT.</p>
          ) : (
            <ul className="divide-y divide-line">
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
                      {r.totalScore ?? '—'}
                      {r.vsPar !== null ? ` · ${fmtSigned(r.vsPar)} par` : ''}
                      {r.vsCR !== null ? ` · ${fmtSigned(r.vsCR)} CR` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
