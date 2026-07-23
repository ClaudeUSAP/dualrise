'use client'

import { useTranslations } from 'next-intl'
import { useOptimistic, useTransition } from 'react'
import { markTaskDoneAsPlayer } from './actions'

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
  created_at: string | null
  created_at_display: string | null
  done_at_display: string | null
}

export function TasksView({ tasks }: { tasks: Task[] }) {
  const t = useTranslations('tasks')
  const [, startTransition] = useTransition()
  const [optimisticDone, applyOptimistic] = useOptimistic<
    Set<string>,
    { taskId: string; done: boolean }
  >(
    new Set(tasks.filter((t) => t.status === 'done').map((t) => t.id)),
    (state, action) => {
      const next = new Set(state)
      if (action.done) next.add(action.taskId)
      else next.delete(action.taskId)
      return next
    }
  )

  function handleToggle(taskId: string, currentlyDone: boolean) {
    startTransition(async () => {
      applyOptimistic({ taskId, done: !currentlyDone })
      try {
        await markTaskDoneAsPlayer(taskId, !currentlyDone)
      } catch (err) {
        console.error(err)
      }
    })
  }

  const pending = tasks.filter((t) => !optimisticDone.has(t.id))
  const done = tasks.filter((t) => optimisticDone.has(t.id))

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
        {t('empty')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 && (
        <section className="rounded-md border border-line bg-white">
          <header className="flex items-center justify-between px-5 py-3 border-b border-line">
            <h2 className="display text-sm text-navy">{t('todo')}</h2>
            <span className="rounded-full bg-orange px-2.5 py-0.5 text-xs font-bold text-white">
              {pending.length}
            </span>
          </header>
          <ul className="divide-y divide-line">
            {pending.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                done={false}
                onToggle={() => handleToggle(task.id, false)}
              />
            ))}
          </ul>
        </section>
      )}

      {done.length > 0 && (
        <details className="rounded-md border border-line bg-white">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3 list-none [&::-webkit-details-marker]:hidden">
            <span className="display text-sm text-navy">{t('done')}</span>
            <span className="rounded-full bg-cream-2 px-2.5 py-0.5 text-xs font-bold text-muted">
              {done.length}
            </span>
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {done.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                done
                onToggle={() => handleToggle(task.id, true)}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function TaskRow({
  task,
  done,
  onToggle,
}: {
  task: Task
  done: boolean
  onToggle: () => void
}) {
  const t = useTranslations('tasks')
  const titleClass = done ? 'text-muted line-through' : 'text-navy'
  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={task.title}
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition-colors ${
            done
              ? 'border-orange bg-orange text-white'
              : 'border-line bg-white hover:border-orange'
          }`}
        >
          {done ? '✓' : ''}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`${titleClass} text-sm font-medium`}>{task.title}</span>
            {task.school_name && !done && (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                🏫 {task.school_name}
              </span>
            )}
            {task.due_date_text && !done && (
              <span className="text-[11px] font-bold text-orange-600">
                ⏰ {task.due_date_text}
              </span>
            )}
          </div>
          {task.description && !done && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
              {task.description}
            </p>
          )}
          <div className="mt-1 text-[11px] text-muted">
            {task.assigned_by_name && (
              <>{t('assignedBy', { name: task.assigned_by_name })}</>
            )}
            {task.created_at_display && <> · {task.created_at_display}</>}
            {done && task.done_at_display && (
              <> · ✓ {task.done_at_display}</>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
