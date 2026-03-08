export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  console.log('[/api/auth/signup] POST received')
  try {
    const { email, password, phone } = await request.json()
    console.log('[/api/auth/signup] body parsed, email:', email, 'phone:', phone)

    if (!email || !password || !phone) {
      return new Response(
        JSON.stringify({ error: 'שדות חסרים' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { phone } },
    })

    if (error) {
      console.log('[/api/auth/signup] Supabase error:', error.message)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[/api/auth/signup] caught:', err)
    return new Response(
      JSON.stringify({ error: 'שגיאת שרת פנימית' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
