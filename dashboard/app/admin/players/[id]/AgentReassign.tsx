'use client'

import { useState, useTransition } from 'react'
import { reassignAgent } from './agent-actions'

type AgentOption = {
  id: string
  first_name: string | null
  last_name: string | null
}

export function AgentReassign({
  playerId,
  currentAgentId,
  currentAgentName,
  agents,
  canEdit,
}: {
  playerId: string
  currentAgentId: string | null
  currentAgentName: string | null
  agents: AgentOption[]
  canEdit: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handlePick(agentId: string) {
    if (agentId === currentAgentId) {
      setOpen(false)
      return
    }
    startTransition(async () => {
      try {
        await reassignAgent(playerId, agentId)
        setOpen(false)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'erreur')
      }
    })
  }

  return (
    <div className="relative inline-flex items-center gap-2">
      <span className="text-xs text-muted">
        Agent : <strong className="text-navy">{currentAgentName ?? '—'}</strong>
      </span>
      {canEdit && (
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v)
            setError(null)
          }}
          disabled={pending}
          className="rounded border border-line px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted hover:border-orange hover:text-orange disabled:opacity-50"
          aria-label="Réassigner agent"
        >
          ✎
        </button>
      )}
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-line bg-white p-2 shadow-lg">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase text-muted">
            Réassigner à
          </p>
          {error && (
            <p className="mb-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">
              {error}
            </p>
          )}
          <ul className="flex max-h-72 flex-col overflow-y-auto">
            {agents.map((a) => {
              const name = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || '(sans nom)'
              const active = a.id === currentAgentId
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(a.id)}
                    disabled={pending || active}
                    className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                      active
                        ? 'bg-orange/10 font-bold text-orange'
                        : 'text-navy hover:bg-cream-2'
                    }`}
                  >
                    {name} {active && <span className="text-[10px]">(actuel)</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
