import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/google-calendar'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/dashboard/meetings?gcal=denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/dashboard/meetings?gcal=error`)
  }

  // Decode user id from state
  let userId: string
  try {
    userId = Buffer.from(state, 'base64url').toString()
  } catch {
    return NextResponse.redirect(`${APP_URL}/dashboard/meetings?gcal=error`)
  }

  // Verify the authenticated user matches state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    return NextResponse.redirect(`${APP_URL}/login`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const expiryDate = Date.now() + tokens.expires_in * 1000

    // Upsert tokens for this user
    await supabase.from('google_calendar_tokens').upsert({
      user_id:       userId,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expiry_date:   expiryDate,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.redirect(`${APP_URL}/dashboard/meetings?gcal=connected`)
  } catch (err) {
    console.error('[gcal/callback]', err)
    return NextResponse.redirect(`${APP_URL}/dashboard/meetings?gcal=error`)
  }
}
