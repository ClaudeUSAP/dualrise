'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import {
  addCustomItem,
  deleteCustomItem,
  toggleChecklistItemAsAgent,
  toggleHideDefault,
  updateChecklistItemsOrder,
  updateCustomItem,
  updateDefaultOverride,
} from './checklist-actions'

type DefaultItem = {
  id: string
  item_key: string
  section_label: string
  section_order: number
  position: number
  original_label: string
  original_url: string | null
  original_tooltip: string | null
  original_due_hint: string | null
  override_label: string | null
  override_url: string | null
  override_tooltip: string | null
  override_due_hint: string | null
  hidden: boolean
  is_usap_side: boolean
  show_tooltip_inline: boolean
}

type CheckedByInfo = { name: string | null; role: string | null }

type CustomItem = {
  id: string
  section_label: string
  section_order: number
  position: number
  label: string
  url: string | null
  tooltip: string | null
  due_hint: string | null
}

type RowItem =
  | { kind: 'default'; key: string; position: number; data: DefaultItem }
  | { kind: 'custom'; key: string; position: number; data: CustomItem }

export function AdminChecklist({
  playerId,
  defaults,
  customs,
  checkedKeys,
  checkedBy,
  availableSections,
  currentAgentName,
  currentAgentRole,
}: {
  playerId: string
  defaults: DefaultItem[]
  customs: CustomItem[]
  checkedKeys: Set<string>
  checkedBy: Map<string, CheckedByInfo>
  availableSections: Array<{ label: string; order: number }>
  currentAgentName: string
  currentAgentRole: 'agent' | 'founder'
}) {
  const [sectionMode, setSectionMode] = useState<'existing' | 'new'>('existing')
  const [pending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDefault, setEditingDefault] = useState<string | null>(null)
  const [editingCustom, setEditingCustom] = useState<string | null>(null)

  const [localChecked, setLocalChecked] = useState<Set<string>>(checkedKeys)
  const [localBy, setLocalBy] = useState<Map<string, CheckedByInfo>>(checkedBy)

  // Drag state
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const dragKeyRef = useRef<string | null>(null)
  const dragSectionRef = useRef<string | null>(null)

  // Local override of computed order (set after a drag, keyed by section label → list of keys)
  const [orderOverride, setOrderOverride] = useState<Map<string, string[]>>(
    new Map()
  )

  function handleToggleChecked(itemKey: string, currentlyChecked: boolean) {
    const nextChecked = !currentlyChecked
    setLocalChecked((prev) => {
      const n = new Set(prev)
      if (nextChecked) n.add(itemKey)
      else n.delete(itemKey)
      return n
    })
    setLocalBy((prev) => {
      const n = new Map(prev)
      if (nextChecked) {
        n.set(itemKey, { name: currentAgentName, role: currentAgentRole })
      } else {
        n.delete(itemKey)
      }
      return n
    })
    startTransition(async () => {
      try {
        await toggleChecklistItemAsAgent(playerId, itemKey, nextChecked)
      } catch (err) {
        console.error(err)
        setLocalChecked((prev) => {
          const n = new Set(prev)
          if (currentlyChecked) n.add(itemKey)
          else n.delete(itemKey)
          return n
        })
      }
    })
  }

  function handleToggleHide(templateId: string, currentlyHidden: boolean) {
    startTransition(async () => {
      try {
        await toggleHideDefault(playerId, templateId, !currentlyHidden)
      } catch (err) {
        console.error(err)
      }
    })
  }

  function handleDeleteCustom(overrideId: string) {
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cette tâche custom ?')) return
    startTransition(async () => {
      try {
        await deleteCustomItem(playerId, overrideId)
      } catch (err) {
        console.error(err)
      }
    })
  }

  function handleAddCustom(formData: FormData) {
    const label = formData.get('label')?.toString() || ''
    const url = formData.get('url')?.toString() || ''
    const tooltip = formData.get('tooltip')?.toString() || ''
    const due_hint = formData.get('due_hint')?.toString() || ''
    const section_label = formData.get('section_label')?.toString() || 'Custom'
    const section_order = parseInt(formData.get('section_order')?.toString() || '99', 10)
    if (!label.trim()) return
    startTransition(async () => {
      try {
        await addCustomItem(playerId, { label, url, tooltip, due_hint, section_label, section_order })
        setShowAddForm(false)
      } catch (err) {
        console.error(err)
      }
    })
  }

  function handleUpdateDefault(templateId: string, formData: FormData) {
    const label = formData.get('label')?.toString() || ''
    const url = formData.get('url')?.toString() || ''
    const tooltip = formData.get('tooltip')?.toString() || ''
    const due_hint = formData.get('due_hint')?.toString() || ''
    startTransition(async () => {
      try {
        await updateDefaultOverride(playerId, templateId, {
          label: label || null,
          url: url || null,
          tooltip: tooltip || null,
          due_hint: due_hint || null,
        })
        setEditingDefault(null)
      } catch (err) {
        console.error(err)
        alert('Erreur lors de la sauvegarde — voir console.')
      }
    })
  }

  function handleUpdateCustom(overrideId: string, formData: FormData) {
    const label = formData.get('label')?.toString() || ''
    const url = formData.get('url')?.toString() || ''
    const tooltip = formData.get('tooltip')?.toString() || ''
    const due_hint = formData.get('due_hint')?.toString() || ''
    if (!label.trim()) return
    startTransition(async () => {
      try {
        await updateCustomItem(playerId, overrideId, {
          label,
          url: url || null,
          tooltip: tooltip || null,
          due_hint: due_hint || null,
        })
        setEditingCustom(null)
      } catch (err) {
        console.error(err)
        alert('Erreur lors de la sauvegarde — voir console.')
      }
    })
  }

  // Build sections with merged items sorted by effective position.
  const sections = useMemo(() => {
    const map = new Map<
      string,
      { order: number; items: RowItem[] }
    >()
    for (const d of defaults) {
      const existing = map.get(d.section_label) ?? { order: d.section_order, items: [] }
      existing.items.push({
        kind: 'default',
        key: `default-${d.id}`,
        position: d.position,
        data: d,
      })
      map.set(d.section_label, existing)
    }
    for (const c of customs) {
      const existing = map.get(c.section_label) ?? { order: c.section_order, items: [] }
      existing.items.push({
        kind: 'custom',
        key: `custom-${c.id}`,
        position: c.position,
        data: c,
      })
      map.set(c.section_label, existing)
    }
    for (const [label, val] of map) {
      val.items.sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position
        // stable tiebreak: defaults before customs, then by label
        if (a.kind !== b.kind) return a.kind === 'default' ? -1 : 1
        return 0
      })
      const override = orderOverride.get(label)
      if (override) {
        const byKey = new Map(val.items.map((i) => [i.key, i]))
        const reordered: RowItem[] = []
        for (const k of override) {
          const it = byKey.get(k)
          if (it) reordered.push(it)
        }
        for (const it of val.items) {
          if (!override.includes(it.key)) reordered.push(it)
        }
        val.items = reordered
      }
    }
    return Array.from(map.entries())
      .map(([label, val]) => ({ label, order: val.order, items: val.items }))
      .sort((a, b) => a.order - b.order)
  }, [defaults, customs, orderOverride])

  function commitReorder(sectionLabel: string, items: RowItem[]) {
    setOrderOverride((prev) => {
      const next = new Map(prev)
      next.set(
        sectionLabel,
        items.map((i) => i.key)
      )
      return next
    })
    const payload = items.map((it, idx) => ({
      kind: it.kind,
      id: it.kind === 'default' ? it.data.id : it.data.id,
      position: idx,
    }))
    startTransition(async () => {
      try {
        await updateChecklistItemsOrder(playerId, payload)
      } catch (err) {
        console.error(err)
      }
    })
  }

  function onDragStart(key: string, sectionLabel: string) {
    dragKeyRef.current = key
    dragSectionRef.current = sectionLabel
  }
  function onDragEnd() {
    dragKeyRef.current = null
    dragSectionRef.current = null
    setDragOverKey(null)
  }
  function onDragOver(e: React.DragEvent, key: string, sectionLabel: string) {
    if (dragKeyRef.current && dragSectionRef.current === sectionLabel) {
      e.preventDefault()
      setDragOverKey(key)
    }
  }
  function onDrop(targetKey: string, sectionLabel: string) {
    const draggedKey = dragKeyRef.current
    onDragEnd()
    if (!draggedKey || draggedKey === targetKey) return
    const section = sections.find((s) => s.label === sectionLabel)
    if (!section) return
    const items = [...section.items]
    const fromIdx = items.findIndex((i) => i.key === draggedKey)
    const toIdx = items.findIndex((i) => i.key === targetKey)
    if (fromIdx < 0 || toIdx < 0) return
    const [dragged] = items.splice(fromIdx, 1)
    items.splice(toIdx, 0, dragged)
    commitReorder(sectionLabel, items)
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="display text-xl text-navy">Checklist du joueur</h2>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#C11722]"
        >
          + Ajouter une tâche
        </button>
      </div>

      {showAddForm && (
        <form action={handleAddCustom} className="mb-4 flex flex-col gap-3 rounded-md border border-orange/30 bg-orange/5 p-4">
          <FormRow label="Section">
            {sectionMode === 'existing' ? (
              <div className="flex gap-1">
                <select
                  name="section_label"
                  className="flex-1 rounded-md border border-line bg-white px-2 py-1 text-sm"
                  onChange={(e) => {
                    const opt = availableSections.find((s) => s.label === e.target.value)
                    const orderInput = e.currentTarget.form?.elements.namedItem('section_order') as HTMLInputElement | null
                    if (opt && orderInput) orderInput.value = String(opt.order)
                  }}
                  defaultValue={availableSections[0]?.label ?? 'Custom'}
                >
                  {availableSections.map((s) => (
                    <option key={s.label} value={s.label}>{s.label}</option>
                  ))}
                </select>
                <input name="section_order" type="hidden" defaultValue={String(availableSections[0]?.order ?? 99)} />
                <button type="button" onClick={() => setSectionMode('new')} className="rounded-md border border-line bg-white px-2 py-1 text-xs text-muted hover:text-orange">+ Nouvelle</button>
              </div>
            ) : (
              <div className="flex gap-1">
                <input name="section_label" placeholder="Nom de la nouvelle section" required className="flex-1 rounded-md border border-line px-2 py-1 text-sm" />
                <input name="section_order" type="number" min="1" max="99" defaultValue="99" title="Ordre (1=top)" className="w-16 rounded-md border border-line px-2 py-1 text-sm" />
                <button type="button" onClick={() => setSectionMode('existing')} className="rounded-md border border-line bg-white px-2 py-1 text-xs text-muted hover:text-orange">← Existante</button>
              </div>
            )}
          </FormRow>
          <FormRow label="Tâche">
            <input name="label" placeholder="ex: Faire questionnaire apply UVA" required className="w-full rounded-md border border-line px-2 py-1 text-sm" />
          </FormRow>
          <FormRow label="Lien URL">
            <input name="url" placeholder="https://..." className="w-full rounded-md border border-line px-2 py-1 text-sm" />
          </FormRow>
          <FormRow label="Détail">
            <input name="tooltip" placeholder="Tooltip affiché au survol" className="w-full rounded-md border border-line px-2 py-1 text-sm" />
          </FormRow>
          <FormRow label="Échéance">
            <input name="due_hint" placeholder="ex: 15 mars" className="w-full rounded-md border border-line px-2 py-1 text-sm" />
          </FormRow>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-md px-3 py-1 text-xs text-muted">Annuler</button>
            <button type="submit" disabled={pending} className="rounded-md bg-orange px-3 py-1 text-xs font-bold text-white disabled:opacity-60">Ajouter</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.label} className="rounded-md border border-line bg-white p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-orange">{section.label}</h3>
            <ul className="flex flex-col gap-2">
              {section.items.map((item) => {
                const isOver = dragOverKey === item.key
                const liClass = `flex flex-col gap-2 border-b border-line/50 pb-2 last:border-b-0 ${
                  item.kind === 'default' && item.data.is_usap_side
                    ? 'rounded bg-blue-50/40 -mx-2 px-2 py-1'
                    : ''
                } ${isOver ? 'ring-2 ring-orange/40' : ''}`
                return (
                  <li
                    key={item.key}
                    className={liClass}
                    onDragOver={(e) => onDragOver(e, item.key, section.label)}
                    onDragLeave={() => {
                      if (dragOverKey === item.key) setDragOverKey(null)
                    }}
                    onDrop={() => onDrop(item.key, section.label)}
                  >
                    {item.kind === 'default'
                      ? renderDefault({
                          d: item.data,
                          itemKey: item.key,
                          sectionLabel: section.label,
                          editingDefault,
                          setEditingDefault,
                          pending,
                          localChecked,
                          localBy,
                          handleToggleChecked,
                          handleToggleHide,
                          handleUpdateDefault,
                          onDragStart,
                          onDragEnd,
                        })
                      : renderCustom({
                          c: item.data,
                          itemKey: item.key,
                          sectionLabel: section.label,
                          editingCustom,
                          setEditingCustom,
                          pending,
                          localChecked,
                          localBy,
                          handleToggleChecked,
                          handleDeleteCustom,
                          handleUpdateCustom,
                          onDragStart,
                          onDragEnd,
                        })}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function DragHandle({
  itemKey,
  sectionLabel,
  onDragStart,
  onDragEnd,
}: {
  itemKey: string
  sectionLabel: string
  onDragStart: (key: string, section: string) => void
  onDragEnd: () => void
}) {
  return (
    <span
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', itemKey)
        onDragStart(itemKey, sectionLabel)
      }}
      onDragEnd={onDragEnd}
      title="Glisser pour réordonner"
      className="mt-0.5 cursor-grab select-none text-muted hover:text-orange active:cursor-grabbing"
      aria-label="Réordonner"
    >
      ⋮⋮
    </span>
  )
}

function renderDefault(args: {
  d: DefaultItem
  itemKey: string
  sectionLabel: string
  editingDefault: string | null
  setEditingDefault: (v: string | null) => void
  pending: boolean
  localChecked: Set<string>
  localBy: Map<string, CheckedByInfo>
  handleToggleChecked: (k: string, c: boolean) => void
  handleToggleHide: (id: string, h: boolean) => void
  handleUpdateDefault: (id: string, fd: FormData) => void
  onDragStart: (key: string, section: string) => void
  onDragEnd: () => void
}) {
  const {
    d,
    itemKey,
    sectionLabel,
    editingDefault,
    setEditingDefault,
    pending,
    localChecked,
    localBy,
    handleToggleChecked,
    handleToggleHide,
    handleUpdateDefault,
    onDragStart,
    onDragEnd,
  } = args
  const currentLabel = d.override_label ?? d.original_label
  const currentUrl = d.override_url ?? d.original_url
  const currentDueHint = d.override_due_hint ?? d.original_due_hint
  const isModified = d.override_label || d.override_url || d.override_tooltip || d.override_due_hint
  const isChecked = localChecked.has(d.item_key)
  const author = localBy.get(d.item_key)

  if (editingDefault === d.id) {
    return (
      <form action={(fd) => handleUpdateDefault(d.id, fd)} className="flex flex-col gap-2 rounded-md bg-cream-2/40 p-3">
        <FormRow label="Tâche">
          <input name="label" defaultValue={d.override_label ?? d.original_label} placeholder={`Default : ${d.original_label}`} className="w-full rounded border border-line px-2 py-1 text-sm" />
        </FormRow>
        <FormRow label="Lien URL">
          <input name="url" defaultValue={d.override_url ?? d.original_url ?? ''} placeholder={d.original_url ?? '—'} className="w-full rounded border border-line px-2 py-1 text-sm" />
        </FormRow>
        <FormRow label="Détail">
          <input name="tooltip" defaultValue={d.override_tooltip ?? d.original_tooltip ?? ''} placeholder={d.original_tooltip ?? '—'} className="w-full rounded border border-line px-2 py-1 text-sm" />
        </FormRow>
        <FormRow label="Échéance">
          <input name="due_hint" defaultValue={d.override_due_hint ?? d.original_due_hint ?? ''} placeholder={d.original_due_hint ?? '—'} className="w-full rounded border border-line px-2 py-1 text-sm" />
        </FormRow>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditingDefault(null)} className="text-xs text-muted">Annuler</button>
          <button type="submit" disabled={pending} className="rounded bg-orange px-3 py-1 text-xs font-bold text-white">Sauver</button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-1 items-start gap-2 text-sm">
        <DragHandle itemKey={itemKey} sectionLabel={sectionLabel} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        <button
          type="button"
          role="checkbox"
          aria-checked={isChecked}
          aria-label={currentLabel}
          onClick={() => handleToggleChecked(d.item_key, isChecked)}
          disabled={pending || d.hidden}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors ${
            isChecked
              ? 'border-orange bg-orange text-white'
              : 'border-line bg-white hover:border-orange'
          } disabled:opacity-40`}
        >
          {isChecked ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={d.hidden ? 'text-muted line-through' : 'text-navy'}>{currentLabel}</span>
            {currentUrl && <a href={currentUrl} target="_blank" rel="noreferrer" className="text-xs text-orange">↗</a>}
            {d.is_usap_side && <span className="rounded bg-blue-100 px-1 text-[9px] font-bold uppercase text-blue-700">Dual Rise</span>}
            {isModified && <span className="rounded bg-orange/20 px-1 text-[9px] text-orange">modifié</span>}
            {currentDueHint && (
              <span className="text-[11px] text-orange-600">⏰ {currentDueHint}</span>
            )}
          </div>
          {isChecked && author?.name && (
            <div className="mt-0.5 text-[11px] italic text-muted">
              ✓ Coché par {author.name}{author.role && author.role !== 'player' ? ` (${author.role})` : ''}
            </div>
          )}
          {d.show_tooltip_inline && (d.override_tooltip ?? d.original_tooltip) && (
            d.item_key === 'v_ambassade' ? (
              // Embassy task carries the critical "RÈGLE ABSOLUE" — keep the
              // loud yellow ⚠️ panel so the agent can't miss it either.
              <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-orange/30 bg-orange/5 px-2 py-1.5">
                <span aria-hidden>⚠️</span>
                <p className="whitespace-pre-line text-xs leading-relaxed text-navy">
                  {d.override_tooltip ?? d.original_tooltip}
                </p>
              </div>
            ) : (
              <div className="mt-1.5 flex items-start gap-1.5">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-muted"
                >
                  i
                </span>
                <p className="whitespace-pre-line text-xs leading-relaxed text-muted">
                  {d.override_tooltip ?? d.original_tooltip}
                </p>
              </div>
            )
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2 text-[10px] uppercase">
        <button type="button" onClick={() => setEditingDefault(d.id)} disabled={pending} className="text-muted hover:text-orange">Modifier</button>
        <button type="button" onClick={() => handleToggleHide(d.id, d.hidden)} disabled={pending} className={d.hidden ? 'text-orange' : 'text-muted hover:text-red'}>{d.hidden ? 'Afficher' : 'Cacher'}</button>
      </div>
    </div>
  )
}

function renderCustom(args: {
  c: CustomItem
  itemKey: string
  sectionLabel: string
  editingCustom: string | null
  setEditingCustom: (v: string | null) => void
  pending: boolean
  localChecked: Set<string>
  localBy: Map<string, CheckedByInfo>
  handleToggleChecked: (k: string, c: boolean) => void
  handleDeleteCustom: (id: string) => void
  handleUpdateCustom: (id: string, fd: FormData) => void
  onDragStart: (key: string, section: string) => void
  onDragEnd: () => void
}) {
  const {
    c,
    itemKey,
    sectionLabel,
    editingCustom,
    setEditingCustom,
    pending,
    localChecked,
    localBy,
    handleToggleChecked,
    handleDeleteCustom,
    handleUpdateCustom,
    onDragStart,
    onDragEnd,
  } = args
  const customKey = `custom_${c.id}`
  const isChecked = localChecked.has(customKey)
  const author = localBy.get(customKey)

  if (editingCustom === c.id) {
    return (
      <form action={(fd) => handleUpdateCustom(c.id, fd)} className="flex flex-col gap-2 rounded-md bg-cream-2/40 p-3">
        <FormRow label="Tâche">
          <input name="label" defaultValue={c.label} required className="w-full rounded border border-line px-2 py-1 text-sm" />
        </FormRow>
        <FormRow label="Lien URL">
          <input name="url" defaultValue={c.url ?? ''} placeholder="https://..." className="w-full rounded border border-line px-2 py-1 text-sm" />
        </FormRow>
        <FormRow label="Détail">
          <input name="tooltip" defaultValue={c.tooltip ?? ''} placeholder="Tooltip" className="w-full rounded border border-line px-2 py-1 text-sm" />
        </FormRow>
        <FormRow label="Échéance">
          <input name="due_hint" defaultValue={c.due_hint ?? ''} placeholder="ex: 15 mars" className="w-full rounded border border-line px-2 py-1 text-sm" />
        </FormRow>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditingCustom(null)} className="text-xs text-muted">Annuler</button>
          <button type="submit" disabled={pending} className="rounded bg-orange px-3 py-1 text-xs font-bold text-white">Sauver</button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-1 items-start gap-2 text-sm">
        <DragHandle itemKey={itemKey} sectionLabel={sectionLabel} onDragStart={onDragStart} onDragEnd={onDragEnd} />
        <button
          type="button"
          role="checkbox"
          aria-checked={isChecked}
          aria-label={c.label}
          onClick={() => handleToggleChecked(customKey, isChecked)}
          disabled={pending}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors ${
            isChecked
              ? 'border-orange bg-orange text-white'
              : 'border-line bg-white hover:border-orange'
          } disabled:opacity-40`}
        >
          {isChecked ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rounded bg-orange/20 px-1 text-[9px] uppercase text-orange">custom</span>
            <span className="text-navy">{c.label}</span>
            {c.url && <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-orange">↗</a>}
            {c.due_hint && (
              <span className="text-[11px] text-orange-600">⏰ {c.due_hint}</span>
            )}
          </div>
          {isChecked && author?.name && (
            <div className="mt-0.5 text-[11px] italic text-muted">
              ✓ Coché par {author.name}{author.role && author.role !== 'player' ? ` (${author.role})` : ''}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-2 text-[10px] uppercase">
        <button type="button" onClick={() => setEditingCustom(c.id)} disabled={pending} className="text-muted hover:text-orange">Modifier</button>
        <button type="button" onClick={() => handleDeleteCustom(c.id)} disabled={pending} className="text-muted hover:text-red">Supprimer</button>
      </div>
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
