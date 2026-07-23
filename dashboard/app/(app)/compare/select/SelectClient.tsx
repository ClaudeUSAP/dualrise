'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const STAGE_LABEL: Record<string, string> = {
  interested: 'Intéressé',
  talks: 'En échange',
  offer: 'Offre',
}

export function SelectClient({
  assignments,
}: {
  assignments: Array<{
    schoolId: string
    schoolName: string
    division: string | null
    stage: string
  }>
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 3) next.add(id)
      return next
    })
  }

  const count = selected.size

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Sélectionne 2 ou 3 facs à comparer. ({count}/3)
        </p>
        <button
          type="button"
          disabled={count < 2}
          onClick={() => {
            const ids = Array.from(selected).join(',')
            router.push(`/compare?ids=${ids}`)
          }}
          className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-40"
        >
          Comparer ({count})
        </button>
      </div>

      {assignments.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-white py-10 text-center text-sm text-muted">
          Tu n&apos;as encore aucune fac dans ta pipeline. Ajoute-les depuis « Mes
          écoles ».
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assignments.map((a) => {
            const checked = selected.has(a.schoolId)
            const disabled = !checked && count >= 3
            return (
              <li key={a.schoolId}>
                <button
                  type="button"
                  onClick={() => toggle(a.schoolId)}
                  disabled={disabled}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
                    checked
                      ? 'border-orange bg-orange/10'
                      : 'border-line bg-white hover:border-orange/40'
                  } ${disabled ? 'opacity-40' : ''}`}
                >
                  <div>
                    <div className="text-sm font-bold text-navy">
                      {a.schoolName}
                    </div>
                    <div className="text-[11px] text-muted">
                      {a.division ?? '—'} · {STAGE_LABEL[a.stage] ?? a.stage}
                    </div>
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 text-xs font-bold ${
                      checked
                        ? 'border-orange bg-orange text-white'
                        : 'border-line bg-white'
                    }`}
                  >
                    {checked ? '✓' : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
