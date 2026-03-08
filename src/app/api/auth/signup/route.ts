import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[/api/auth/signup] POST received')
  try {
    const { email, password, phone } = await request.json()
    console.log('[/api/auth/signup] body parsed, email:', email, 'phone:', phone)

    if (!email || !password || !phone) {
      return NextResponse.json({ error: 'שדות חסרים' }, { status: 400 })
    }

    // Server-side client — anon key is fine for signUp, but the request
    // originates from our server so there is no browser CORS restriction.
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
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 })
  }
}
