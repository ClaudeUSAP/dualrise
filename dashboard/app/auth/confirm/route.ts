import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { linkAgentByEmail } from '../actions'

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null

  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=auth', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth', request.url))
  }

  const isAgent = await linkAgentByEmail()
  if (isAgent) {
    return NextResponse.redirect(new URL('/admin/players', request.url))
  }

  return NextResponse.redirect(new URL('/schools', request.url))
}
