'use client'

import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import {
  listUnlinkedPlayers,
  linkPlayerSheetsBatch,
  type LinkUnresolved,
} from './link-sheets-actions'

// Drive API calls are slower than the sync route, so use a smaller batch to
// stay comfortably under the function timeout.
const BATCH_SIZE = 8

export function LinkSheetsButton() {
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
        'Chercher dans le Drive le sheet « Prénom Nom Liste Facs » pour tous les ' +
          'joueurs sans sheet lié, et lier automatiquement quand il y a un seul ' +
          'résultat ?\n\nTraitement par lots de 8. Les liens existants ne sont jamais écrasés.'
      )
    ) {
      return
    }
    setRunning(true)
    setProgress({ done: 0, total: 0 })
    startTransition(async () => {
      try {
        const players = await listUnlinkedPlayers()
        if (players.length === 0) {
          toast('Tous les joueurs ont déjà un sheet lié.')
          return
        }
        setProgress({ done: 0, total: players.length })

        let linked = 0
        const unresolved: LinkUnresolved[] = []

        for (let i = 0; i < players.length; i += BATCH_SIZE) {
          const ids = players.slice(i, i + BATCH_SIZE).map((p) => p.id)
          try {
            const res = await linkPlayerSheetsBatch(ids)
            linked += res.linked
            unresolved.push(...res.unresolved)
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            unresolved.push({
              player: `lot ${i / BATCH_SIZE + 1}`,
              reason: 'error',
              error: msg,
            })
          }
          setProgress({
            done: Math.min(i + BATCH_SIZE, players.length),
            total: players.length,
          })
        }

        // Full detail (incl. candidate names) to the console for manual follow-up.
        if (unresolved.length > 0) {
          console.warn('[LinkSheetsButton] non résolus:', unresolved)
        }

        const none = unresolved.filter((u) => u.reason === 'none').map((u) => u.player)
        const multiple = unresolved
          .filter((u) => u.reason === 'multiple')
          .map((u) => u.player)
        const errors = unresolved.filter((u) => u.reason === 'error')

        const lines: string[] = [`${linked} joueur(s) nouvellement lié(s).`]
        if (none.length)
          lines.push(`Aucun match (${none.length}) : ${none.join(', ')}`)
        if (multiple.length)
          lines.push(`Plusieurs matchs (${multiple.length}) : ${multiple.join(', ')}`)
        if (errors.length)
          lines.push(`Erreur(s) (${errors.length}) — voir la console.`)

        const msg = lines.join('\n')
        if (unresolved.length === 0) {
          toast.success(msg, { duration: 8000 })
        } else {
          toast(msg, { duration: 15000, icon: '⚠️' })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`Liaison impossible: ${msg}`, { duration: 8000 })
      } finally {
        setRunning(false)
        setProgress(null)
      }
    })
  }

  const label =
    running && progress && progress.total > 0
      ? `Liaison ${progress.done}/${progress.total}…`
      : '🔗 Lier les sheets'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={running}
      className="inline-flex items-center gap-2 rounded-md border border-navy/30 bg-navy/5 px-3 py-1.5 text-xs font-bold text-navy transition-colors hover:bg-navy/10 disabled:cursor-progress disabled:opacity-60"
      title="Cherche dans le Drive le sheet « Prénom Nom Liste Facs » et lie automatiquement les joueurs sans sheet_id (1 seul match)."
    >
      {label}
    </button>
  )
}
