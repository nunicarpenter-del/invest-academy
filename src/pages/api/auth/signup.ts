import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  console.log('[/api/auth/signup] POST received')

  try {
    const { email, password, phone } = req.body

    if (!email || !password || !phone) {
      return res.status(400).json({ error: 'שדות חסרים' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { phone } },
    })

    if (error) {
      console.log('[/api/auth/signup] Supabase error:', error.message)
      return res.status(400).json({ error: error.message })
    }

    console.log('[/api/auth/signup] success for:', email)
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[/api/auth/signup] caught:', err)
    return res.status(500).json({ error: 'שגיאת שרת פנימית' })
  }
}
