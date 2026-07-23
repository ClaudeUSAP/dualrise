'use client'

import { useState, useTransition } from 'react'
import {
  addCustomFollowupItem,
  deleteCustomFollowupItem,
  toggleFollowupItem,
  updateCustomFollowupLabel,
  updateFollowupItemUrl,
} from './followup-actions'

export type FollowupItem = {
  id: string
  item_key: string
  item_label: string
  is_default: boolean
  position: number
  checked: boolean
  url_link: string | null
}

function hasUrlField(item: FollowupItem) {
  return item.item_key === 'email_written' || (item.url_link != null && item.url_link !== '')
}

export function AgentFollowupChecklist({
  playerId,
  items,
}: {
  playerId: string
  items: FollowupItem[]
}) {
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [pending, startTransition] = useTransition()

  function handleAdd() {
    const txt = newLabel.trim()
    if (!txt) return
    setNewLabel('')
    setAdding(false)
    startTransition(async () => {
      try {
        await addCustomFollowupItem(playerId, txt)
      } catch (err) {
        console.error(err)
      }
    })
  }

  const sorted = [...items].sort((a, b) => a.position - b.position)

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="display text-xl text-navy">✅ Suivi agent</h2>
          <p className="text-xs text-muted">
            Checklist hebdo. Visible uniquement par l’agent du joueur et les founders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white hover:bg-[#C11722]"
        >
          + Ajouter un item
        </button>
      </div>

      {adding && (
        <div className="mb-3 rounded-md border border-orange/30 bg-orange/5 p-3">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Intitulé du nouvel item…"
            autoFocus
            className="w-full rounded-md border border-line bg-white px-2 py-1 text-sm text-navy outline-none focus:border-orange placeholder:text-muted"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') {
                setAdding(false)
                setNewLabel('')
              }
            }}
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setNewLabel('')
              }}
              className="text-xs text-muted"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={pending || !newLabel.trim()}
              className="rounded-md bg-orange px-3 py-1 text-xs font-bold text-white disabled:opacity-60"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-md border border-dashed border-line py-6 text-center text-xs text-muted">
          Aucun item.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {sorted.map((item) => (
            <FollowupRow key={item.id} playerId={playerId} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FollowupRow({
  playerId,
  item,
}: {
  playerId: string
  item: FollowupItem
}) {
  const [checked, setChecked] = useState(item.checked)
  const [label, setLabel] = useState(item.item_label)
  const [urlValue, setUrlValue] = useState(item.url_link ?? '')
  const [pending, startTransition] = useTransition()

  const showUrlField = hasUrlField(item)

  function handleToggle(next: boolean) {
    setChecked(next)
    startTransition(async () => {
      try {
        await toggleFollowupItem(playerId, item.id, next)
      } catch (err) {
        console.error(err)
        setChecked(!next)
      }
    })
  }

  function commitLabel() {
    const trimmed = label.trim()
    if (!trimmed) {
      setLabel(item.item_label)
      return
    }
    if (trimmed === item.item_label) return
    startTransition(async () => {
      try {
        await updateCustomFollowupLabel(playerId, item.id, trimmed)
      } catch (err) {
        console.error(err)
        setLabel(item.item_label)
      }
    })
  }

  function commitUrl() {
    const trimmed = urlValue.trim()
    if (trimmed === (item.url_link ?? '')) return
    startTransition(async () => {
      try {
        await updateFollowupItemUrl(playerId, item.id, trimmed || null)
      } catch (err) {
        console.error(err)
        setUrlValue(item.url_link ?? '')
      }
    })
  }

  function handleDelete() {
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cet item ?')) return
    startTransition(async () => {
      try {
        await deleteCustomFollowupItem(playerId, item.id)
      } catch (err) {
        console.error(err)
      }
    })
  }

  return (
    <li className="rounded-md border border-line bg-white p-2.5">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={pending}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <div className="flex-1 min-w-0">
          {item.is_default ? (
            <span
              className={`text-sm ${checked ? 'text-muted line-through' : 'text-navy'}`}
            >
              {item.item_label}
            </span>
          ) : (
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              disabled={pending}
              className={`w-full bg-transparent text-sm outline-none ${
                checked ? 'text-muted line-through' : 'text-navy'
              }`}
            />
          )}

          {showUrlField && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onBlur={commitUrl}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                placeholder="https://docs.google.com/…"
                disabled={pending}
                className="flex-1 min-w-0 rounded border border-line bg-white px-2 py-0.5 text-xs text-navy outline-none focus:border-orange placeholder:text-muted"
              />
              {checked && urlValue.trim() && (
                <a
                  href={urlValue.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-orange hover:underline"
                >
                  Ouvrir ↗
                </a>
              )}
            </div>
          )}
        </div>

        {!item.is_default && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-[10px] uppercase text-muted hover:text-red-600"
            title="Supprimer"
          >
            ✕
          </button>
        )}
      </div>
    </li>
  )
}
