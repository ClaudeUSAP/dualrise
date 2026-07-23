'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type SyncResult = {
  playersInPipe?: number
  newInvitations?: number
  skippedAlreadyExists?: number
  skippedNoEmail?: number
  skippedAmbiguousAgent?: number
  errors?: string[]
  error?: string
}

export function SyncButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<SyncResult | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/sync-clients-pipe', {
          method: 'POST',
        })
        const data = (await res.json()) as SyncResult
        setResult(data)
        router.refresh()
      } catch (err) {
        setResult({ error: err instanceof Error ? err.message : String(err) })
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
      >
        {pending ? 'Sync…' : 'Sync depuis Clients-Pipe'}
      </button>
      {result && (
        <div className="rounded-md border border-line bg-white p-3 text-xs">
          {result.error ? (
            <p className="text-red font-semibold">Erreur : {result.error}</p>
          ) : (
            <>
              <p className="text-navy">
                <strong>{result.newInvitations ?? 0}</strong> nouvelles · pipe :{' '}
                {result.playersInPipe ?? 0} · existants :{' '}
                {result.skippedAlreadyExists ?? 0} · sans email :{' '}
                {result.skippedNoEmail ?? 0}
              </p>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-muted">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>…{result.errors.length - 5} autres</li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
