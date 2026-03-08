import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Fetch role to redirect correctly
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role ?? 'client'
      const redirectTo =
        role === 'admin'   ? '/admin' :
        role === 'partner' ? '/partner' :
        next

      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Something went wrong — send back to login with error
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
