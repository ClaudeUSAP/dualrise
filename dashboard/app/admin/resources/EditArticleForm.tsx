'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createArticle, updateArticle, type ArticlePayload } from './actions'
import { ArticleMarkdown } from '../../(app)/resources/ArticleMarkdown'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type Mode =
  | { kind: 'edit'; slug: string; initial: ArticlePayload }
  | { kind: 'new'; defaultPosition: number }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function EditArticleForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')

  const isEdit = mode.kind === 'edit'
  const initial: ArticlePayload =
    mode.kind === 'edit'
      ? mode.initial
      : {
          title_fr: '',
          title_en: '',
          emoji: '',
          excerpt_fr: '',
          excerpt_en: '',
          content_markdown: '',
          content_markdown_en: '',
          position: mode.defaultPosition,
          active: true,
        }

  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [slug, setSlug] = useState(mode.kind === 'edit' ? mode.slug : '')
  const [slugTouched, setSlugTouched] = useState(false)
  const [titleFr, setTitleFr] = useState(initial.title_fr)
  const [titleEn, setTitleEn] = useState(initial.title_en)
  const [emoji, setEmoji] = useState(initial.emoji)
  const [excerptFr, setExcerptFr] = useState(initial.excerpt_fr)
  const [excerptEn, setExcerptEn] = useState(initial.excerpt_en)
  const [contentFr, setContentFr] = useState(initial.content_markdown)
  const [contentEn, setContentEn] = useState(initial.content_markdown_en)
  const [position, setPosition] = useState(String(initial.position))
  const [active, setActive] = useState(initial.active)
  const [error, setError] = useState<string | null>(null)

  const title = lang === 'fr' ? titleFr : titleEn
  const excerpt = lang === 'fr' ? excerptFr : excerptEn
  const content = lang === 'fr' ? contentFr : contentEn
  const setTitle = lang === 'fr' ? setTitleFr : setTitleEn
  const setExcerpt = lang === 'fr' ? setExcerptFr : setExcerptEn
  const setContent = lang === 'fr' ? setContentFr : setContentEn

  function handleTitleChange(next: string) {
    setTitle(next)
    // Auto-derive slug only when editing the FR title on a new article
    if (!isEdit && !slugTouched && lang === 'fr') {
      setSlug(slugify(next))
    }
  }

  function handleSlugChange(next: string) {
    setSlugTouched(true)
    setSlug(next.toLowerCase())
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const pos = Number.parseInt(position, 10)
    if (!Number.isInteger(pos) || pos < 0) {
      setError('Position doit être un entier ≥ 0')
      return
    }
    if (!titleFr.trim()) {
      setError('Titre FR requis')
      return
    }
    if (!contentFr.trim()) {
      setError('Contenu FR requis')
      return
    }
    if (!isEdit && !SLUG_RE.test(slug)) {
      setError('Slug invalide (lettres minuscules, chiffres, tirets)')
      return
    }

    const payload: ArticlePayload = {
      title_fr: titleFr,
      title_en: titleEn,
      emoji,
      excerpt_fr: excerptFr,
      excerpt_en: excerptEn,
      content_markdown: contentFr,
      content_markdown_en: contentEn,
      position: pos,
      active,
    }

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateArticle(mode.slug, payload)
          router.push('/admin/resources')
          router.refresh()
        } else {
          await createArticle({ ...payload, slug })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        // redirect() throws — let it bubble
        if (msg === 'NEXT_REDIRECT') return
        setError(msg)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/resources"
          className="text-xs font-bold uppercase tracking-wide text-muted hover:text-orange"
        >
          ← Ressources
        </Link>
        <div className="flex gap-2">
          <Link
            href="/admin/resources"
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-muted hover:text-navy"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-60"
          >
            {pending ? 'Sauvegarde…' : isEdit ? 'Sauvegarder' : 'Créer'}
          </button>
        </div>
      </div>

      <h1 className="display text-2xl text-navy">
        {isEdit ? 'Éditer un article' : 'Nouvel article'}
      </h1>

      <div className="inline-flex w-fit overflow-hidden rounded-md border border-line bg-white text-xs font-bold">
        {(['fr', 'en'] as const).map((l) => {
          const labelFilled =
            l === 'fr'
              ? !!titleFr.trim()
              : !!titleEn.trim() || !!contentEn.trim()
          return (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 ${
                lang === l
                  ? 'bg-navy text-white'
                  : 'text-muted hover:bg-cream-2'
              }`}
            >
              {l === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
              {!labelFilled && l === 'en' && (
                <span className="ml-1 text-[10px] opacity-70">(vide)</span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        <Field className="sm:col-span-3" label="Emoji">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="📖"
            className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-lg"
          />
        </Field>
        <Field
          className="sm:col-span-6"
          label={`Titre (${lang === 'fr' ? 'FR' : 'EN'})`}
        >
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required={lang === 'fr'}
            placeholder={
              lang === 'fr'
                ? 'ex: Comprendre les divisions'
                : 'e.g.: Understanding divisions'
            }
            className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
          />
        </Field>
        <Field className="sm:col-span-3" label="Position">
          <input
            type="number"
            min={0}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm tabular-nums"
          />
        </Field>

        <Field className="sm:col-span-9" label="Slug (URL)">
          <input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            disabled={isEdit}
            placeholder="ex: comprendre-les-divisions"
            className="w-full rounded-md border border-line bg-white px-2 py-1.5 font-mono text-sm disabled:bg-cream-2 disabled:text-muted"
          />
          {!isEdit && (
            <p className="mt-1 text-[11px] text-muted">
              Auto-généré depuis le titre. Sera l&apos;URL : /resources/{slug || '…'}
            </p>
          )}
        </Field>
        <Field className="sm:col-span-3" label="Actif">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4"
            />
            <span className={active ? 'text-navy' : 'text-muted'}>
              {active ? 'Publié' : 'Brouillon'}
            </span>
          </label>
        </Field>

        <Field
          className="sm:col-span-12"
          label={`Excerpt — carte (${lang === 'fr' ? 'FR' : 'EN'})`}
        >
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            placeholder={
              lang === 'fr'
                ? 'Résumé court affiché sur la carte de la grille'
                : 'Short summary shown on the resource card'
            }
            className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
          />
        </Field>
      </div>

      <div className="mt-2 flex gap-2 lg:hidden">
        <TabButton active={tab === 'editor'} onClick={() => setTab('editor')}>
          ✍️ Éditeur
        </TabButton>
        <TabButton active={tab === 'preview'} onClick={() => setTab('preview')}>
          👁️ Aperçu
        </TabButton>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={tab === 'editor' ? '' : 'hidden lg:block'}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
            Markdown ({lang === 'fr' ? 'FR' : 'EN'})
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={25}
            required={lang === 'fr'}
            spellCheck={false}
            className="w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-[13px] leading-relaxed focus:border-orange focus:outline-none"
          />
        </div>

        <div className={tab === 'preview' ? '' : 'hidden lg:block'}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
            Aperçu
          </label>
          <div className="min-h-[400px] rounded-md border border-line bg-white p-4">
            {content.trim() ? (
              <ArticleMarkdown source={content} />
            ) : (
              <p className="text-sm italic text-muted">
                L&apos;aperçu apparaîtra ici.
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-bold ${
        active
          ? 'bg-navy text-white'
          : 'bg-cream-2 text-muted hover:bg-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}
