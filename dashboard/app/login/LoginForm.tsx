'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setStatus('error')
      setErrorMessage(error.message)
      return
    }

    setStatus('sent')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <span className="rounded bg-[#E11D2A] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            USAP
          </span>
        </div>
        <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight text-[#0B1D58]">
          {title}
        </h1>
        <p className="mb-8 text-center text-sm text-[#0B1D58]/70">{subtitle}</p>

        {status === 'sent' ? (
          <div className="rounded-md border border-[#E11D2A]/30 bg-[#E11D2A]/5 p-4 text-center">
            <p className="font-medium text-[#0B1D58]">
              ✓ Check ton email !
            </p>
            <p className="mt-1 text-xs text-[#0B1D58]/70">
              Clique sur le lien magique pour te connecter.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#0B1D58]">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'sending'}
                className="w-full rounded-md border border-[#0B1D58]/15 bg-white px-3 py-2 text-[#0B1D58] outline-none focus:border-[#E11D2A] focus:ring-2 focus:ring-[#E11D2A]/30 disabled:opacity-50"
                placeholder="ton email"
              />
            </label>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-[#E11D2A] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#C11722] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'sending' ? 'Envoi…' : 'Recevoir le magic link'}
            </button>

            {status === 'error' && (
              <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {errorMessage}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
