'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { deleteArticle, setActive, setPosition } from './actions'

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export function AdminArticleRow({
  article,
  canEdit,
}: {
  article: {
    slug: string
    title_fr: string
    emoji: string | null
    position: number
    active: boolean
    updated_at: string | null
    updated_by_name: string | null
  }
  canEdit: boolean
}) {
  const [pos, setPos] = useState(String(article.position))
  const [active, setActiveState] = useState(article.active)
  const [pending, startTransition] = useTransition()

  useEffect(() => setPos(String(article.position)), [article.position])
  useEffect(() => setActiveState(article.active), [article.active])

  function commitPosition() {
    const n = Number.parseInt(pos, 10)
    if (!Number.isInteger(n) || n < 0) {
      setPos(String(article.position))
      return
    }
    if (n === article.position) return
    startTransition(async () => {
      try {
        await setPosition(article.slug, n)
      } catch (err) {
        console.error(err)
        setPos(String(article.position))
        alert('Impossible de changer la position — voir console.')
      }
    })
  }

  function toggleActive(next: boolean) {
    setActiveState(next)
    startTransition(async () => {
      try {
        await setActive(article.slug, next)
      } catch (err) {
        console.error(err)
        setActiveState(!next)
        alert('Impossible de changer le statut — voir console.')
      }
    })
  }

  function handleDelete() {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Supprimer définitivement "${article.title_fr}" ? Cette action est irréversible.`
      )
    )
      return
    startTransition(async () => {
      try {
        await deleteArticle(article.slug)
      } catch (err) {
        console.error(err)
        alert('Impossible de supprimer — voir console.')
      }
    })
  }

  return (
    <tr className="border-t border-line">
      <td className="px-3 py-2 align-middle">
        <input
          type="number"
          min={0}
          step={1}
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          onBlur={commitPosition}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          disabled={pending || !canEdit}
          readOnly={!canEdit}
          className="w-16 rounded border border-line bg-white px-2 py-1 text-right tabular-nums text-sm text-navy focus:border-orange focus:outline-none disabled:bg-cream-2 disabled:text-muted"
        />
      </td>
      <td className="px-3 py-2 align-middle">
        {canEdit ? (
          <Link
            href={`/admin/resources/${article.slug}/edit`}
            className="inline-flex items-center gap-2 text-navy hover:text-orange"
          >
            <span className="text-xl leading-none" aria-hidden>
              {article.emoji ?? '📄'}
            </span>
            <span>
              <span className="block font-semibold">{article.title_fr}</span>
              <span className="block text-[11px] text-muted">
                /{article.slug}
              </span>
            </span>
          </Link>
        ) : (
          <Link
            href={`/resources/${article.slug}`}
            className="inline-flex items-center gap-2 text-navy hover:text-orange"
          >
            <span className="text-xl leading-none" aria-hidden>
              {article.emoji ?? '📄'}
            </span>
            <span>
              <span className="block font-semibold">{article.title_fr}</span>
              <span className="block text-[11px] text-muted">
                /{article.slug}
              </span>
            </span>
          </Link>
        )}
      </td>
      <td className="px-3 py-2 align-middle">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => toggleActive(e.target.checked)}
            disabled={pending || !canEdit}
            className="h-4 w-4"
          />
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              active
                ? 'bg-green-100 text-green-800'
                : 'bg-zinc-200 text-muted'
            }`}
          >
            {active ? 'Actif' : 'Inactif'}
          </span>
        </label>
      </td>
      <td className="px-3 py-2 align-middle text-xs text-muted">
        {article.updated_at ? (
          <>
            {DATE_FMT.format(new Date(article.updated_at))}
            {article.updated_by_name ? (
              <span className="block text-[11px]">
                par {article.updated_by_name}
              </span>
            ) : null}
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="px-3 py-2 align-middle text-right">
        <div className="flex items-center justify-end gap-3 text-[11px] font-bold uppercase">
          {canEdit ? (
            <>
              <Link
                href={`/admin/resources/${article.slug}/edit`}
                className="text-orange hover:text-[#C11722]"
              >
                Éditer
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="text-muted hover:text-red disabled:opacity-50"
              >
                Supprimer
              </button>
            </>
          ) : (
            <Link
              href={`/resources/${article.slug}`}
              className="text-orange hover:text-[#C11722]"
            >
              Voir
            </Link>
          )}
        </div>
      </td>
    </tr>
  )
}
