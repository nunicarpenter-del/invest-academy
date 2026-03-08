import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.log('[auth/callback] error:', error.message)
    }
  }

  return NextResponse.redirect('https://invest-academy-rho.vercel.app/dashboard')
}
