'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'

type Agent = {
  id: string
  first_name: string | null
  last_name: string | null
}

export function FiltersBar({
  years,
  agents,
  totalCount,
}: {
  years: number[]
  agents: Agent[]
  totalCount: number
}) {
  const router = useRouter()
  const params = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // URL = source de vérité unique
  const currentYear = params.get('year') ?? 'all'
  const currentAgentId = params.get('agent_id') ?? 'all'
  const currentQuery = params.get('q') ?? ''

  function pushWithParam(mutator: (sp: URLSearchParams) => void) {
    const next = new URLSearchParams(params)
    mutator(next)
    const qs = next.toString()
    router.push(qs ? `/admin/players?${qs}` : '/admin/players', {
      scroll: false,
    })
  }

  function setParam(key: 'year' | 'agent_id', value: string) {
    pushWithParam((sp) => {
      if (value === 'all' || !value) sp.delete(key)
      else sp.set(key, value)
    })
  }

  function handleSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      pushWithParam((sp) => {
        const trimmed = value.trim()
        if (trimmed) sp.set('q', trimmed)
        else sp.delete('q')
      })
    }, 250)
  }

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="relative">
        <input
          key={currentQuery}
          type="search"
          defaultValue={currentQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="🔍 Rechercher un joueur (nom, prénom)…"
          className="w-full rounded-md border border-line bg-white px-3 py-2 pr-9 text-sm text-navy outline-none focus:border-orange placeholder:text-muted"
        />
        {currentQuery && (
          <button
            type="button"
            onClick={() => pushWithParam((sp) => sp.delete('q'))}
            aria-label="Effacer la recherche"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-cream-2 hover:text-navy"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <YearChip
            label="Toutes classes"
            active={currentYear === 'all'}
            onClick={() => setParam('year', 'all')}
          />
          {years.map((y) => (
            <YearChip
              key={y}
              label={`Fall ${y}`}
              active={currentYear === String(y)}
              onClick={() => setParam('year', String(y))}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wide text-muted">
            Agent
          </label>
          <select
            value={currentAgentId}
            onChange={(e) => setParam('agent_id', e.target.value)}
            className="rounded-md border border-line bg-white px-2 py-1 text-xs text-navy outline-none focus:border-orange"
          >
            <option value="all">Tous</option>
            {agents.map((a) => {
              const name =
                `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() ||
                '(sans nom)'
              return (
                <option key={a.id} value={a.id}>
                  {name}
                </option>
              )
            })}
          </select>
          <span className="text-xs text-muted">
            {totalCount} joueur{totalCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

function YearChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
        active
          ? 'bg-orange text-white'
          : 'bg-cream-2 text-muted hover:bg-zinc-200'
      }`}
    >
      {label}
    </button>
  )
}
