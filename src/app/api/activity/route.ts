import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { event_type, page } = await req.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    await supabase.from('user_activity_log').insert({
      user_id:    user.id,
      event_type: event_type ?? 'page_view',
      page:       page ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch {
    // Fail silently — table may not exist yet
    return NextResponse.json({ ok: true })
  }
}
