'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleLogout() {
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      title="Déconnexion"
      className="ml-1 rounded-full px-2 text-xs font-semibold text-white/70 transition-colors hover:text-white disabled:opacity-60"
    >
      {pending ? '…' : '↪'}
    </button>
  )
}
