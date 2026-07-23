'use client'

import { useState } from 'react'
import {
  PERIOD_LABELS,
  type ScoringByPeriod,
  type ScoringPeriod,
} from '@/lib/scout-types'

const PERIODS: ScoringPeriod[] = [
  'last_3',
  'last_5',
  'last_7',
  'last_10',
  'current_year',
  'all_time',
]

type Metric = 'vsPar' | 'vsCR'

function fmt(v: string | null): string {
  return v && v.trim() !== '' ? v : '—'
}

// vs-par / vs-cr are signed; show a leading + for positive values for clarity.
function fmtSigned(v: string | null): string {
  if (!v || v.trim() === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return v
  return n > 0 ? `+${v}` : v
}

export function ScoutScoringCard({ scoring }: { scoring: ScoringByPeriod }) {
  const [period, setPeriod] = useState<ScoringPeriod>('all_time')
  const [metric, setMetric] = useState<Metric>('vsCR')

  const cell = scoring[period]
  const headline = metric === 'vsCR' ? cell.vsCR : cell.vsPar
  const headlineLabel = metric === 'vsCR' ? 'vs Course Rating' : 'vs Par'

  const btn = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
      active
        ? 'bg-navy text-white'
        : 'bg-cream-2 text-muted hover:bg-line'
    }`

  return (
    <div className="rounded-md border border-line bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="display text-sm text-navy">Scoring</h3>
          <p className="text-xs text-muted">
            vs Course Rating is the truest recruiting metric on US courses
          </p>
        </div>
        {/* Metric toggle */}
        <div className="flex gap-1">
          <button type="button" className={btn(metric === 'vsPar')} onClick={() => setMetric('vsPar')}>
            vs Par
          </button>
          <button type="button" className={btn(metric === 'vsCR')} onClick={() => setMetric('vsCR')}>
            vs Course Rating
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="mb-4 flex flex-wrap gap-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            className={btn(period === p)}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Values for the selected period */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md border border-line bg-cream-2/40 px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted">
            Scoring avg
          </div>
          <div className="mt-1 text-xl font-bold text-navy">{fmt(cell.raw)}</div>
        </div>
        <div
          className={`rounded-md border px-3 py-3 ${
            metric === 'vsPar' ? 'border-orange bg-orange-soft' : 'border-line bg-cream-2/40'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted">
            vs Par
          </div>
          <div className="mt-1 text-xl font-bold text-navy">{fmtSigned(cell.vsPar)}</div>
        </div>
        <div
          className={`rounded-md border px-3 py-3 ${
            metric === 'vsCR' ? 'border-orange bg-orange-soft' : 'border-line bg-cream-2/40'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted">
            vs Course Rating
          </div>
          <div className="mt-1 text-xl font-bold text-navy">{fmtSigned(cell.vsCR)}</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        {PERIOD_LABELS[period]} · headline: {headlineLabel} {fmtSigned(headline)}
      </p>
    </div>
  )
}
