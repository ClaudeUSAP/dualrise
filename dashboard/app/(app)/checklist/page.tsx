import { redirect } from 'next/navigation'
import { getViewerMember } from '@/lib/get-viewer-player'
import { getViewerLocale, serverT } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { ChecklistView } from './ChecklistView'

// Sections whose label is provided in messages/{fr,en}.json under
// `checklist.sections.<section_key>`. Anything outside this set falls back to
// the DB `section_label` (FR-only) so a brand-new section is never blank.
const I18N_SECTION_KEYS = new Set([
  'profile_golf',
  'academic',
  'admin',
  'visa',
  'arrival',
])

type Template = {
  id: string
  section_order: number
  section_key: string
  section_label: string
  item_key: string
  item_label_fr: string
  item_label_en: string | null
  tooltip_fr: string | null
  tooltip_en: string | null
  url_link: string | null
  due_hint_fr: string | null
  due_hint_en: string | null
  position: number
  show_tooltip_inline: boolean | null
}

type Override = {
  id: string
  template_id: string | null
  hidden: boolean
  custom_label_fr: string | null
  custom_url_link: string | null
  custom_tooltip_fr: string | null
  custom_due_hint_fr: string | null
  custom_section_key: string | null
  custom_section_label: string | null
  custom_section_order: number | null
  custom_position: number | null
}

export default async function ChecklistPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const member = await getViewerMember(supabase)
  const { data: player } = member
    ? await supabase
        .from('players')
        .select('id')
        .eq('id', member.player_id)
        .single()
    : { data: null }
  if (!player) {
    return (
      <div className="rounded-md border border-line bg-white p-6 text-muted">
        Profil joueur introuvable pour {user.email}.
      </div>
    )
  }

  const locale = await getViewerLocale(supabase)
  const [templatesRes, overridesRes, progressRes, completionRes] = await Promise.all([
    supabase
      .from('checklist_templates')
      .select(
        'id, section_order, section_key, section_label, item_key, item_label_fr, item_label_en, tooltip_fr, tooltip_en, url_link, due_hint_fr, due_hint_en, position, show_tooltip_inline'
      )
      .eq('active', true)
      .order('section_order', { ascending: true })
      .order('position', { ascending: true }),
    supabase
      .from('checklist_player_overrides')
      .select(
        'id, template_id, hidden, custom_label_fr, custom_url_link, custom_tooltip_fr, custom_due_hint_fr, custom_section_key, custom_section_label, custom_section_order, custom_position'
      )
      .eq('player_id', player.id),
    supabase
      .from('checklist_progress')
      .select('item_key, checked')
      .eq('player_id', player.id),
    // Weighted % is computed in `public.player_completion_summary`.
    // Per-section weights live in the view; the front just consumes the value.
    supabase
      .from('player_completion_summary')
      .select('percent_complete')
      .eq('player_id', player.id)
      .maybeSingle(),
  ])

  const templates = (templatesRes.data ?? []) as Template[]
  const overrides = (overridesRes.data ?? []) as Override[]
  const overrideByTemplate = new Map<string, Override>()
  for (const o of overrides) {
    if (o.template_id) overrideByTemplate.set(o.template_id, o)
  }

  const pickLabel = (
    enValue: string | null | undefined,
    frValue: string | null | undefined
  ) => (locale === 'en' && enValue ? enValue : frValue ?? null)

  // Merge defaults + apply overrides + filter hidden
  const merged = templates
    .filter((t) => !overrideByTemplate.get(t.id)?.hidden)
    .map((t) => {
      const o = overrideByTemplate.get(t.id)
      // Overrides are FR-only (per-player customisations). When the viewer is
      // in EN and there is no override, we fall back to item_label_en when
      // available. If the agent has overridden the FR label we honor that
      // regardless of locale (it's explicitly personalised).
      return {
        id: t.id,
        section_order: t.section_order,
        section_key: t.section_key,
        section_label: I18N_SECTION_KEYS.has(t.section_key)
          ? serverT(locale, `checklist.sections.${t.section_key}`)
          : t.section_label,
        item_key: t.item_key,
        item_label_fr:
          o?.custom_label_fr ?? pickLabel(t.item_label_en, t.item_label_fr) ?? t.item_label_fr,
        tooltip_fr:
          o?.custom_tooltip_fr ?? pickLabel(t.tooltip_en, t.tooltip_fr),
        url_link: o?.custom_url_link ?? t.url_link,
        due_hint_fr:
          o?.custom_due_hint_fr ?? pickLabel(t.due_hint_en, t.due_hint_fr),
        position: o?.custom_position ?? t.position,
        show_tooltip_inline: t.show_tooltip_inline ?? false,
      }
    })

  // Add custom items (template_id IS NULL). Custom items have no inline-tooltip
  // notion in the overrides table, so the flag is always false for them.
  const custom = overrides
    .filter((o) => !o.template_id)
    .map((o) => ({
      id: o.id,
      section_order: o.custom_section_order ?? 99,
      section_key: o.custom_section_key ?? 'custom',
      section_label: o.custom_section_label ?? 'Custom',
      item_key: `custom_${o.id}`,
      item_label_fr: o.custom_label_fr ?? '',
      tooltip_fr: o.custom_tooltip_fr,
      url_link: o.custom_url_link,
      due_hint_fr: o.custom_due_hint_fr,
      position: o.custom_position ?? 99,
      show_tooltip_inline: false,
    }))

  const allItems = [...merged, ...custom].sort(
    (a, b) =>
      a.section_order - b.section_order || a.position - b.position
  )

  const initialChecked = (progressRes.data ?? [])
    .filter((p) => p.checked)
    .map((p) => p.item_key)

  const weightedPercent = Math.round(
    Number(
      (completionRes.data as { percent_complete?: number | string } | null)
        ?.percent_complete ?? 0
    )
  )

  return (
    <div>
      <h1 className="display mb-3 text-2xl text-navy sm:text-3xl">
        Checklist administrative
      </h1>
      <p className="mb-6 rounded-md border border-orange/20 bg-orange/5 p-3 text-xs text-navy">
        💡 Cette checklist sera ajustée par ton agent au fil du temps pour refléter ton parcours spécifique.
      </p>
      <ChecklistView
        templates={allItems}
        initialChecked={initialChecked}
        weightedPercent={weightedPercent}
      />
    </div>
  )
}
