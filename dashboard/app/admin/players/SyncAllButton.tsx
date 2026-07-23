'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import {
  listSyncablePlayers,
  syncPlayerSheetsBatch,
  type SyncBatchResult,
} from './sync-actions'

const BATCH_SIZE = 15

export function SyncAllButton() {
  const [, startTransition] = useTransition()
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  )

  function handleClick() {
    if (running) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Lancer la sync des Google Sheets « Liste Facs » pour tous les joueurs ?\n\n' +
          'Le traitement se fait par lots de 15. Compte ~2 minutes pour ~75 joueurs.'
      )
    ) {
      return
    }
    setRunning(true)
    setProgress({ done: 0, total: 0 })
    startTransition(async () => {
      try {
        const players = await listSyncablePlayers()
        if (players.length === 0) {
          toast('Aucun joueur avec sheet_id à synchroniser.')
          return
        }
        setProgress({ done: 0, total: players.length })

        const aggregate: SyncBatchResult = {
          playersProcessed: 0,
          assignmentsUpserted: 0,
          newAssignments: 0,
          unchanged: 0,
          errors: [],
        }

        for (let i = 0; i < players.length; i += BATCH_SIZE) {
          const slice = players.slice(i, i + BATCH_SIZE)
          const ids = slice.map((p) => p.id)
          try {
            const res = await syncPlayerSheetsBatch(ids)
            aggregate.playersProcessed += res.playersProcessed
            aggregate.assignmentsUpserted += res.assignmentsUpserted
            aggregate.newAssignments += res.newAssignments
            aggregate.unchanged += res.unchanged
            aggregate.errors.push(...res.errors)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            aggregate.errors.push(`batch ${i / BATCH_SIZE + 1}: ${msg}`)
          }
          setProgress({ done: Math.min(i + slice.length, players.length), total: players.length })
        }

        if (aggregate.errors.length === 0) {
          toast.success(
            `Sync terminée. ${aggregate.playersProcessed} joueurs · ` +
              `${aggregate.newAssignments} nouveaux assignments · ` +
              `${aggregate.unchanged} re-marqués.`,
            { duration: 8000 }
          )
        } else {
          toast.error(
            `Sync terminée avec ${aggregate.errors.length} erreur(s). ` +
              `${aggregate.playersProcessed} joueurs · ${aggregate.newAssignments} nouveaux assignments.`,
            { duration: 12000 }
          )
          // Surface up to 3 error lines in the console for quick inspection.
          console.warn('[SyncAllButton] errors:', aggregate.errors)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`Sync impossible: ${msg}`, { duration: 8000 })
      } finally {
        setRunning(false)
        setProgress(null)
      }
    })
  }

  const progressLabel =
    running && progress && progress.total > 0
      ? `Sync ${progress.done}/${progress.total}…`
      : '🔄 Sync tout maintenant'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={running}
      className="inline-flex items-center gap-2 rounded-md border border-orange/40 bg-orange/10 px-3 py-1.5 text-xs font-bold text-orange transition-colors hover:bg-orange/20 disabled:cursor-progress disabled:opacity-60"
      title="Déclenche la sync des Google Sheets Liste Facs pour tous les joueurs ayant un sheet lié."
    >
      {progressLabel}
    </button>
  )
}
