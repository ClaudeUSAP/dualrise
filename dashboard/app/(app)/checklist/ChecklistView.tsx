'use client'

import toast from 'react-hot-toast'

import { useState, useTransition } from 'react'
import { toggleChecklistItem } from './actions'

type Template = {
  id: string
  section_order: number
  section_key: string
  section_label: string
  item_key: string
  item_label_fr: string
  tooltip_fr: string | null
  url_link: string | null
  due_hint_fr: string | null
  position: number
  show_tooltip_inline: boolean
}

type SectionGroup = {
  key: string
  label: string
  order: number
  items: Template[]
}

function groupBySection(templates: Template[]): SectionGroup[] {
  const map = new Map<string, SectionGroup>()
  for (const t of templates) {
    let g = map.get(t.section_key)
    if (!g) {
      g = {
        key: t.section_key,
        label: t.section_label,
        order: t.section_order,
        items: [],
      }
      map.set(t.section_key, g)
    }
    g.items.push(t)
  }
  for (const g of map.values()) g.items.sort((a, b) => a.position - b.position)
  return Array.from(map.values()).sort((a, b) => a.order - b.order)
}

export function ChecklistView({
  templates,
  initialChecked,
  weightedPercent,
}: {
  templates: Template[]
  initialChecked: string[]
  // % from public.player_completion_summary, weighted per section
  // (profile_golf 20 / academic 10 / admin 30 / visa 30 / arrival 10).
  // Snapshot at page render; the progress bar drifts off the DB value as the
  // user ticks/un-ticks items locally — fine for v1, a full round-trip would
  // re-fetch the view on every toggle.
  weightedPercent: number
}) {
  const [, startTransition] = useTransition()
  const [localChecked, setLocalChecked] = useState<Set<string>>(
    () => new Set(initialChecked)
  )

  const sections = groupBySection(templates)
  const [openSet, setOpenSet] = useState<Set<string>>(
    () => new Set(sections.filter((s) => s.order === 1).map((s) => s.key))
  )

  function toggleSection(key: string, open: boolean) {
    setOpenSet((prev) => {
      const next = new Set(prev)
      if (open) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function handleToggleItem(itemKey: string) {
    const isChecked = localChecked.has(itemKey)
    const next = !isChecked
    setLocalChecked((prev) => {
      const n = new Set(prev)
      if (next) n.add(itemKey)
      else n.delete(itemKey)
      return n
    })
    startTransition(async () => {
      try {
        await toggleChecklistItem(itemKey, next)
      } catch (err) {
        console.error(err)
        // revert
        setLocalChecked((prev) => {
          const n = new Set(prev)
          if (isChecked) n.add(itemKey)
          else n.delete(itemKey)
          return n
        })
      }
    })
  }

  const totalItems = templates.length
  const totalChecked = templates.filter((t) =>
    localChecked.has(t.item_key)
  ).length
  // % is the weighted value from the DB view (passed by the server). We do not
  // recompute locally — that would silently diverge from `/admin/players`,
  // which already reads the same view.
  const percent = weightedPercent

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
      <div className="flex flex-col gap-3">
        {sections.map((section) => {
          const checkedInSection = section.items.filter((it) =>
            localChecked.has(it.item_key)
          ).length
          return (
            <details
              key={section.key}
              open={openSet.has(section.key)}
              onToggle={(e) =>
                toggleSection(section.key, (e.currentTarget as HTMLDetailsElement).open)
              }
              className="rounded-md border border-line bg-white"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 list-none [&::-webkit-details-marker]:hidden">
                <span className="display text-sm text-navy">{section.label}</span>
                <span className="rounded-full bg-cream-2 px-2.5 py-0.5 text-xs font-bold text-muted">
                  {checkedInSection}/{section.items.length}
                </span>
              </summary>
              <ul className="divide-y divide-line border-t border-line">
                {section.items.map((item) => (
                  <ChecklistItem
                    key={item.item_key}
                    item={item}
                    checked={localChecked.has(item.item_key)}
                    onToggle={() => handleToggleItem(item.item_key)}
                  />
                ))}
              </ul>
            </details>
          )
        })}
      </div>

      <ProgressCard
        percent={percent}
        totalChecked={totalChecked}
        totalItems={totalItems}
        sections={sections.map((s) => ({
          label: s.label,
          checked: s.items.filter((it) => localChecked.has(it.item_key)).length,
          total: s.items.length,
        }))}
      />
    </div>
  )
}

function ChecklistItem({
  item,
  checked,
  onToggle,
}: {
  item: Template
  checked: boolean
  onToggle: () => void
}) {
  const titleClass = checked ? 'text-muted line-through' : 'text-navy'
  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={item.item_label_fr}
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors ${
            checked
              ? 'border-orange bg-orange text-white'
              : 'border-line bg-white hover:border-orange'
          }`}
        >
          {checked ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {item.url_link ? (
              <a
                href={item.url_link}
                target="_blank"
                rel="noreferrer"
                className={`${titleClass} text-sm font-medium hover:text-orange`}
              >
                {item.item_label_fr} ↗
              </a>
            ) : (
              <span className={`${titleClass} text-sm font-medium`}>
                {item.item_label_fr}
              </span>
            )}
            {item.tooltip_fr && !item.show_tooltip_inline && (
              <details className="inline-block">
                <summary className="inline-flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-orange text-[10px] font-bold text-orange transition-colors hover:bg-orange-soft">
                    ?
                  </span>
                </summary>
                <p className="mt-2 rounded-md bg-cream-2 p-2 text-xs text-muted">
                  {item.tooltip_fr}
                </p>
              </details>
            )}
          </div>
          {item.tooltip_fr && item.show_tooltip_inline && (
            item.item_key === 'v_ambassade' ? (
              // Embassy task carries the critical "RÈGLE ABSOLUE" — keep the
              // loud yellow ⚠️ panel so it can't be missed.
              <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-orange/30 bg-orange/5 px-2 py-1.5">
                <span aria-hidden>⚠️</span>
                <p className="whitespace-pre-line text-xs leading-relaxed text-navy">
                  {item.tooltip_fr}
                </p>
              </div>
            ) : (
              // Default inline style: small discreet ℹ️ bubble, neutral gray.
              <div className="mt-1.5 flex items-start gap-1.5">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-muted"
                >
                  i
                </span>
                <p className="whitespace-pre-line text-xs leading-relaxed text-muted">
                  {item.tooltip_fr}
                </p>
              </div>
            )
          )}
        </div>
        {item.due_hint_fr && (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">
            {item.due_hint_fr}
          </span>
        )}
      </div>
    </li>
  )
}

function ProgressCard({
  percent,
  totalChecked,
  totalItems,
  sections,
}: {
  percent: number
  totalChecked: number
  totalItems: number
  sections: { label: string; checked: number; total: number }[]
}) {
  return (
    <aside className="self-start rounded-md bg-navy p-6 text-white lg:sticky lg:top-[100px]">
      <div className="display leading-none text-orange">
        <span className="text-6xl">{percent}</span>
        <span className="text-3xl">%</span>
      </div>
      <p className="mt-2 text-sm text-white/70">
        {totalChecked}/{totalItems} items complétés
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-orange transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="mt-6 flex flex-col gap-2 text-sm">
        {sections.map((s) => (
          <li key={s.label} className="flex items-center justify-between">
            <span className="text-white/80">{s.label}</span>
            <span className="font-bold text-white">
              {s.checked}/{s.total}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-white/10 pt-4 text-xs italic text-white/60">
        Une question ? Demande à Camille via WhatsApp.
      </p>
    </aside>
  )
}
