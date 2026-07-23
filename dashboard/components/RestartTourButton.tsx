'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { resetOnboarding } from '@/app/(app)/actions/onboarding'

export function RestartTourButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        await resetOnboarding()
        router.push('/schools')
        router.refresh()
      } catch (err) {
        console.error(err)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="block w-full rounded-md bg-white/10 px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/20 hover:text-white disabled:opacity-60"
    >
      🔄 Refaire le tour de présentation
    </button>
  )
}
