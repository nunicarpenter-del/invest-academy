import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Use NEXT_PUBLIC_APP_URL as the authoritative base — avoids Vercel proxy
// returning internal hostnames (e.g. on mobile or edge redirects).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Prefer the env-var base; fall back to request origin so localhost dev still works
  const base = APP_URL || origin

  console.log('[auth/callback] code present:', !!code, '| base:', base)

  if (!code) {
    console.error('[auth/callback] No code in query string — aborting OAuth flow')
    return NextResponse.redirect(`${base}/login?error=oauth_no_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error?.message ?? 'no user returned')
    return NextResponse.redirect(`${base}/login?error=oauth_failed`)
  }

  console.log('[auth/callback] session exchanged for user:', data.user.id)

  // Fetch role for correct portal redirect
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profileError) {
    console.error('[auth/callback] profiles fetch error:', profileError.message)
  }

  const role = profile?.role ?? 'client'
  const redirectTo =
    role === 'admin'   ? '/admin'   :
    role === 'partner' ? '/partner' :
    next

  console.log('[auth/callback] redirecting role:', role, '→', redirectTo)

  return NextResponse.redirect(`${base}${redirectTo}`)
}
