'use client'

import { useState, useTransition } from 'react'
import { updateSchoolInfo } from './actions'

type SchoolEditable = {
  id: string
  name: string
  coach_name: string | null
  coach_email: string | null
  coach_bio: string | null
  niche_url: string | null
  website_url: string | null
  instagram_url: string | null
  scoreboard_url: string | null
}

export function EditSchoolInfo({ school }: { school: SchoolEditable }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    const data = {
      coach_name: formData.get('coach_name')?.toString() || null,
      coach_email: formData.get('coach_email')?.toString() || null,
      coach_bio: formData.get('coach_bio')?.toString() || null,
      niche_url: formData.get('niche_url')?.toString() || null,
      website_url: formData.get('website_url')?.toString() || null,
      instagram_url: formData.get('instagram_url')?.toString() || null,
      scoreboard_url: formData.get('scoreboard_url')?.toString() || null,
    }
    startTransition(async () => {
      try {
        await updateSchoolInfo(school.id, data)
        setOpen(false)
      } catch (err) {
        console.error(err)
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold uppercase tracking-wide text-orange transition-colors hover:underline"
      >
        ✏️ Modifier infos école
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2 rounded-md border border-orange/30 bg-orange/5 p-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-navy">Modifier {school.name}</h3>
      <Field label="Coach" name="coach_name" defaultValue={school.coach_name ?? ''} />
      <Field label="Email coach" name="coach_email" defaultValue={school.coach_email ?? ''} type="email" />
      <Field label="Bio coach" name="coach_bio" defaultValue={school.coach_bio ?? ''} />
      <Field label="Niche URL" name="niche_url" defaultValue={school.niche_url ?? ''} placeholder="https://niche.com/..." />
      <Field label="Website équipe" name="website_url" defaultValue={school.website_url ?? ''} placeholder="https://goteam.com/sports/..." />
      <Field label="Instagram" name="instagram_url" defaultValue={school.instagram_url ?? ''} placeholder="https://instagram.com/..." />
      <Field label="Scoreboard" name="scoreboard_url" defaultValue={school.scoreboard_url ?? ''} placeholder="https://scoreboard.clippd.com/..." />
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-3 py-1 text-xs text-muted">Annuler</button>
        <button type="submit" disabled={pending} className="rounded-md bg-orange px-3 py-1 text-xs font-bold text-white disabled:opacity-60">
          {pending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = 'text',
}: {
  label: string
  name: string
  defaultValue: string
  placeholder?: string
  type?: string
}) {
  return (
    <label className="flex items-center gap-3 text-xs">
      <span className="w-32 shrink-0 font-bold uppercase tracking-wide text-muted">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-line bg-white px-2 py-1 text-sm text-navy outline-none focus:border-orange placeholder:text-muted"
      />
    </label>
  )
}
