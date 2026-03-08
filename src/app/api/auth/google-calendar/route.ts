import { NextResponse } from 'next/server'
import { buildAuthUrl } from '@/lib/google-calendar'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // Verify the user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL))

  // Use user id as state (CSRF protection + user identification on callback)
  const state   = Buffer.from(user.id).toString('base64url')
  const authUrl = buildAuthUrl(state)

  return NextResponse.redirect(authUrl)
}
