'use client'

import { useState, useTransition } from 'react'
import { createTask, deleteTask, toggleTaskDone } from './task-actions'

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

type Task = {
  id: string
  title: string
  description: string | null
  due_date_text: string | null
  school_id: string | null
  school_name: string | null
  status: string | null
  done_at: string | null
  done_by_name: string | null
  done_by_role: string | null
  assigned_by_name: string | null
  email_sent_at: string | null
  created_at: string | null
}

type SchoolOption = { id: string; name: string }

export function TasksSection({
  playerId,
  tasks,
  schoolOptions,
}: {
  playerId: string
  tasks: Task[]
  schoolOptions: SchoolOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pendingTasks = tasks.filter((t) => (t.status ?? 'pending') !== 'done')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  function handleCreate(formData: FormData) {
    const title = formData.get('title')?.toString() ?? ''
    const description = formData.get('description')?.toString() ?? ''
    const dueDateText = formData.get('due_date_text')?.toString() ?? ''
    const schoolId = formData.get('school_id')?.toString() ?? ''
    if (!title.trim()) {
      setError('Titre requis')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await createTask(playerId, {
          title,
          description: description || null,
          due_date_text: dueDateText || null,
          school_id: schoolId || null,
        })
        setShowForm(false)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    })
  }

  function handleToggle(taskId: string, currentlyDone: boolean) {
    startTransition(async () => {
      try {
        await toggleTaskDone(taskId, !currentlyDone)
      } catch (err) {
        console.error(err)
      }
    })
  }

  function handleDelete(taskId: string) {
    if (typeof window !== 'undefined' && !window.confirm('Supprimer cette tâche ?')) return
    startTransition(async () => {
      try {
        await deleteTask(taskId)
      } catch (err) {
        console.error(err)
      }
    })
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="display text-xl text-navy">Tâches custom</h2>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v)
            setError(null)
          }}
          className="rounded-md bg-orange px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#C11722]"
        >
          + Nouvelle tâche
        </button>
      </div>

      {showForm && (
        <form
          action={handleCreate}
          className="mb-4 flex flex-col gap-3 rounded-md border border-orange/30 bg-orange/5 p-4"
        >
          <FormRow label="Titre">
            <input
              name="title"
              required
              placeholder="ex: Envoyer le passeport scanné"
              className="w-full rounded-md border border-line bg-white px-2 py-1 text-sm"
            />
          </FormRow>
          <FormRow label="Description">
            <textarea
              name="description"
              rows={3}
              placeholder="Détails facultatifs"
              className="w-full rounded-md border border-line bg-white px-2 py-1 text-sm"
            />
          </FormRow>
          <FormRow label="Échéance">
            <input
              name="due_date_text"
              placeholder="ex: avant 30 juin"
              className="w-full rounded-md border border-line bg-white px-2 py-1 text-sm"
            />
          </FormRow>
          <FormRow label="École">
            <select
              name="school_id"
              defaultValue=""
              className="w-full rounded-md border border-line bg-white px-2 py-1 text-sm"
            >
              <option value="">— Aucune —</option>
              {schoolOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FormRow>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md px-3 py-1 text-xs text-muted"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-orange px-3 py-1 text-xs font-bold text-white disabled:opacity-60"
            >
              {pending ? 'Création…' : 'Créer + Notifier'}
            </button>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-white py-6 text-center text-sm text-muted">
          Pas encore de tâches custom pour ce joueur.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {pendingTasks.length > 0 && (
            <div className="rounded-md border border-line bg-white p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-orange">
                À faire ({pendingTasks.length})
              </h3>
              <ul className="flex flex-col gap-3">
                {pendingTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    pending={pending}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </div>
          )}
          {doneTasks.length > 0 && (
            <details className="rounded-md border border-line bg-white p-4">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-muted">
                Terminées ({doneTasks.length})
              </summary>
              <ul className="mt-3 flex flex-col gap-3">
                {doneTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    pending={pending}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  )
}

function TaskRow({
  task,
  pending,
  onToggle,
  onDelete,
}: {
  task: Task
  pending: boolean
  onToggle: (taskId: string, done: boolean) => void
  onDelete: (taskId: string) => void
}) {
  const isDone = task.status === 'done'
  return (
    <li className="flex items-start gap-2 border-b border-line/40 pb-3 last:border-b-0 last:pb-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        onClick={() => onToggle(task.id, isDone)}
        disabled={pending}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors ${
          isDone
            ? 'border-orange bg-orange text-white'
            : 'border-line bg-white hover:border-orange'
        } disabled:opacity-40`}
      >
        {isDone ? '✓' : ''}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className={isDone ? 'text-muted line-through' : 'text-navy font-medium'}>
            {task.title}
          </span>
          {task.school_name && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
              🏫 {task.school_name}
            </span>
          )}
          {task.due_date_text && !isDone && (
            <span className="text-[11px] text-orange-600">⏰ {task.due_date_text}</span>
          )}
          {task.email_sent_at && !isDone && (
            <span className="text-[10px] text-muted">📧 envoyé</span>
          )}
        </div>
        {task.description && (
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{task.description}</p>
        )}
        <div className="mt-1 text-[10px] text-muted">
          {task.assigned_by_name && <>Assigné par {task.assigned_by_name}</>}
          {task.created_at && (
            <> · {DATE_FMT.format(new Date(task.created_at))}</>
          )}
          {isDone && task.done_by_name && (
            <> · ✓ Faite par {task.done_by_name}
              {task.done_at && ` le ${DATE_FMT.format(new Date(task.done_at))}`}
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        disabled={pending}
        className="shrink-0 text-[10px] font-bold uppercase text-muted hover:text-red-600"
      >
        Supprimer
      </button>
    </li>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-24 shrink-0 pt-1 text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
