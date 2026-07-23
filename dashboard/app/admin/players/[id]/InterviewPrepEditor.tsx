'use client'

import { useState, useTransition } from 'react'
import { ArticleMarkdown } from '../../../(app)/resources/ArticleMarkdown'
import {
  togglePlayerInterviewPrepVisibility,
  updateInterviewPrep,
} from './interview-prep-actions'

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function InterviewPrepEditor({
  playerId,
  initialContent,
  initialShow,
  updatedAt,
  updatedByName,
}: {
  playerId: string
  initialContent: string
  initialShow: boolean
  updatedAt: string | null
  updatedByName: string | null
}) {
  const [content, setContent] = useState(initialContent)
  const [savedContent, setSavedContent] = useState(initialContent)
  const [show, setShow] = useState(initialShow)
  const [tab, setTab] = useState<'editor' | 'preview'>('editor')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const dirty = content !== savedContent

  function handleToggleShow(next: boolean) {
    const prev = show
    setShow(next)
    startTransition(async () => {
      try {
        await togglePlayerInterviewPrepVisibility(playerId, next)
      } catch (err) {
        console.error(err)
        setShow(prev)
      }
    })
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      try {
        await updateInterviewPrep(playerId, content)
        setSavedContent(content)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  return (
    <section className="mt-10">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="display text-xl text-navy">
            Préparation entretien — joueur
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Notes personnalisées avant les appels coachs. Visibles par le joueur
            et les parents en lecture.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-[11px] italic text-muted">
              Sauvé le {DATE_FMT.format(new Date(updatedAt))}
              {updatedByName ? ` par ${updatedByName}` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !dirty}
            className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#C11722] disabled:opacity-50"
          >
            {pending ? 'Sauvegarde…' : dirty ? 'Sauvegarder' : 'Sauvegardé'}
          </button>
        </div>
      </div>

      {/* Visibility switch — sits directly under the subtitle. */}
      <div
        className={`mb-4 flex flex-wrap items-center gap-3 rounded-md border-2 px-3 py-2.5 transition-colors ${
          show
            ? 'border-orange/30 bg-orange/5'
            : 'border-zinc-300 bg-zinc-50'
        }`}
      >
        <button
          type="button"
          role="switch"
          aria-checked={show}
          aria-label="Afficher la préparation entretien au joueur"
          onClick={() => handleToggleShow(!show)}
          disabled={pending}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            show ? 'bg-orange' : 'bg-zinc-400'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              show ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-navy">
            Afficher au joueur{' '}
            <span
              className={`ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                show ? 'bg-orange text-white' : 'bg-zinc-300 text-zinc-700'
              }`}
            >
              {show ? 'ON' : 'OFF'}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            {show
              ? 'Carte visible sur /resources et la home /schools du joueur.'
              : 'Carte masquée côté joueur, /resources/interview-prep redirige. L’éditeur reste ouvert et le brief call automatique continue à utiliser ce contenu.'}
          </p>
        </div>
      </div>

      {error && show && (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Editor + preview are gated by the visibility toggle: when OFF, nothing
          below the toggle is rendered. The toggle itself + title row stay so
          the agent can always flip the switch back on. */}
      {show && (
        <>
          <div className="mb-2 flex gap-2 lg:hidden">
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
                Markdown
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={18}
                placeholder="Aucune préparation perso encore. Tu peux noter ici les questions à mettre en avant pour ce joueur avant ses appels coach, ses points forts à valoriser, ses risques à anticiper, etc."
                spellCheck={false}
                className="w-full rounded-md border border-line bg-white px-3 py-2 font-mono text-[13px] leading-relaxed focus:border-orange focus:outline-none"
              />
            </div>
            <div className={tab === 'preview' ? '' : 'hidden lg:block'}>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">
                Aperçu côté joueur
              </label>
              <div className="min-h-[300px] rounded-md border border-line bg-white p-4">
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
        </>
      )}
    </section>
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
