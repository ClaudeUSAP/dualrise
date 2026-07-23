'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { linkAgentByEmail } from '../actions'

function CallbackInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') ?? 'magiclink'
    const code = searchParams.get('code')

    if (!tokenHash && !code) {
      router.replace('/login?error=auth')
      return
    }

    ;(async () => {
      const supabase = createClient()
      try {
        if (tokenHash) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            type: type as 'magiclink' | 'recovery' | 'invite' | 'email',
            token_hash: tokenHash,
          })
          if (verifyErr) throw verifyErr
        } else if (code) {
          const { error: codeErr } =
            await supabase.auth.exchangeCodeForSession(code)
          if (codeErr) throw codeErr
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('no user after auth')

        const isAgent = await linkAgentByEmail()
        router.replace(isAgent ? '/admin/players' : '/schools')
      } catch (err) {
        console.error('auth callback failed:', err)
        setError('auth')
        // small delay so the user sees the message before redirect
        setTimeout(() => router.replace('/login?error=auth'), 1500)
      }
    })()
  }, [router, searchParams])

  return (
    <main className="flex flex-1 items-center justify-center bg-[#FAFAF7] px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-[#0B1D58]">
          USAP Dashboard
        </h1>
        {error ? (
          <p className="text-sm text-red-600">
            Lien invalide ou expiré — redirection…
          </p>
        ) : (
          <>
            <Spinner />
            <p className="mt-4 text-sm text-[#0B1D58]/70">
              Connexion en cours…
            </p>
          </>
        )}
      </div>
    </main>
  )
}

function Spinner() {
  return (
    <span
      aria-label="Chargement"
      className="mx-auto inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-[#E11D2A]/30 border-t-[#E11D2A]"
    />
  )
}

export default function CallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  )
}
