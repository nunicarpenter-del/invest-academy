'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Portal = 'client' | 'partner'
type View   = 'login' | 'signup' | 'forgot'

// ── Shared input style ───────────────────────────────────────────────────────
const INPUT = 'w-full rounded-xl border border-[#D4DEDD] bg-[#F4F6F5] px-4 py-3 text-sm text-[#1C2B2A] placeholder-[#9BB0AC] outline-none transition-all duration-200 focus:border-[#C8AA8F] focus:ring-1 focus:ring-[#C8AA8F]/50'
const LABEL = 'block text-xs font-semibold text-[#4A6460]'
const BTN_PRIMARY = 'flex w-full items-center justify-center gap-2 rounded-xl bg-[#A0806A] px-6 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#8B6E5A] hover:shadow-lg hover:shadow-[#A0806A]/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50'

// ── Google logo SVG ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C18.622 14.017 17.64 11.71 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

// ── Password input with show/hide toggle ────────────────────────────────────
function PasswordInput({
  id, value, onChange, placeholder = '••••••••••••', autoComplete = 'current-password',
}: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className={`${INPUT} ps-12`}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'הסתר סיסמה' : 'הצג סיסמה'}
        className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#9BB0AC] transition-colors hover:text-[#A0806A]"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function LoginForm() {
  const [view, setView]       = useState<View>('login')
  const [portal, setPortal]   = useState<Portal>('client')

  // shared fields
  const [email, setEmail]     = useState('')
  const [password, setPassword]        = useState('')
  const [confirmPassword, setConfirm]  = useState('')
  const [phone, setPhone]              = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const router = useRouter()

  function reset() {
    setError(null); setSuccess(null)
    setEmail(''); setPassword(''); setConfirm(''); setPhone('')
  }

  function switchTo(v: View) { reset(); setView(v) }

  // ── Login ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err || !data.user) {
      setError('אימייל או סיסמה שגויים. אנא נסה שוב.')
      setLoading(false); return
    }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()
    const role = profile?.role ?? 'client'
    router.refresh()
    if      (role === 'admin')   router.push('/admin')
    else if (role === 'partner') router.push('/partner')
    else                         router.push('/dashboard')
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (err) { setError(err.message); setLoading(false) }
  }

  // ── Sign Up ───────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות.'); return
    }
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.'); return
    }
    if (!phone.trim()) {
      setError('נא להזין מספר טלפון.'); return
    }
    if (!/^\+?[0-9]{7,15}$/.test(phone.trim())) {
      setError('מספר הטלפון אינו תקין. השתמש בספרות בלבד, עם + אופציונלי בהתחלה (לדוג׳ +972501234567).'); return
    }

    // ── Debug: verify env vars are present ──────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Key present:', !!supabaseKey)

    if (!supabaseUrl || !supabaseKey) {
      const msg = `שגיאת הגדרות: משתני סביבה חסרים. URL: ${supabaseUrl ?? 'חסר'} | KEY: ${supabaseKey ? 'קיים' : 'חסר'}`
      setError(msg)
      return
    }

    setLoading(true); setError(null)

    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { phone: phone.trim() } },
      })
      setLoading(false)
      if (err) {
        console.error('signUp error:', err)
        setError(`שגיאה: ${err.message} (${err.status ?? 'no status'})`)
        return
      }
      setSuccess('נשלח אליך אימייל לאישור החשבון. בדוק את תיבת הדואר שלך.')
    } catch (caught: unknown) {
      setLoading(false)
      const msg = caught instanceof Error ? caught.message : String(caught)
      console.error('signUp caught:', msg)
      setError(`שגיאת רשת: ${msg} — בדוק שכתובת Supabase נגישה ושמפתח ה-Anon תקין.`)
    }
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSuccess('בדוק את תיבת המייל שלך לקבלת קישור לשחזור הסיסמה.')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORGOT PASSWORD VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'forgot') {
    return (
      <div className="space-y-5" dir="rtl">
        <div>
          <h2 className="text-base font-bold text-[#1C2B2A]">שחזור סיסמה</h2>
          <p className="mt-1 text-xs text-[#4A6460]">הזן את כתובת האימייל שלך ונשלח לך קישור לשחזור.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
              <MailCheck size={28} className="text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">{success}</p>
            </div>
            <button type="button" onClick={() => switchTo('login')}
              className="flex items-center gap-1.5 text-xs text-[#A0806A] hover:underline">
              <ArrowRight size={12} /> חזרה להתחברות
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className={LABEL}>אימייל</label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                dir="ltr"
                className={INPUT}
              />
            </div>
            <button type="submit" disabled={loading} className={BTN_PRIMARY}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> שולח…</> : 'שלח קישור לשחזור'}
            </button>
            <button type="button" onClick={() => switchTo('login')}
              className="flex items-center gap-1.5 text-xs text-[#4A6460] hover:text-[#1C2B2A]">
              <ArrowRight size={12} /> חזרה להתחברות
            </button>
          </form>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNUP VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'signup') {
    return (
      <div className="space-y-5" dir="rtl">
        <div>
          <h2 className="text-base font-bold text-[#1C2B2A]">הרשמה</h2>
          <p className="mt-1 text-xs text-[#4A6460]">צור חשבון חדש באקדמיה להשקעות.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
              <MailCheck size={28} className="text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">{success}</p>
            </div>
            <button type="button" onClick={() => switchTo('login')}
              className="flex items-center gap-1.5 text-xs text-[#A0806A] hover:underline">
              <ArrowRight size={12} /> חזרה להתחברות
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="signup-email" className={LABEL}>אימייל</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                dir="ltr"
                className={INPUT}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-phone" className={LABEL}>מספר טלפון</label>
              <input
                id="signup-phone"
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                placeholder="+972501234567"
                dir="ltr"
                inputMode="tel"
                className={INPUT}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-password" className={LABEL}>סיסמה</label>
              <PasswordInput
                id="signup-password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder="לפחות 6 תווים"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-confirm" className={LABEL}>אימות סיסמה</label>
              <PasswordInput
                id="signup-confirm"
                value={confirmPassword}
                onChange={setConfirm}
                autoComplete="new-password"
                placeholder="הזן שוב את הסיסמה"
              />
            </div>

            <button type="submit" disabled={loading} className={`${BTN_PRIMARY} mt-2`}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> יוצר חשבון…</> : 'צור חשבון'}
            </button>

            <p className="text-center text-xs text-[#9BB0AC]">
              כבר יש לך חשבון?{' '}
              <button type="button" onClick={() => switchTo('login')}
                className="text-[#A0806A] hover:underline font-semibold">
                התחברות
              </button>
            </p>
          </form>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN VIEW (default)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5" dir="rtl">

      {/* Portal tabs */}
      <div className="flex gap-1 rounded-xl border border-[#D4DEDD] bg-[#EEF1F0] p-1">
        {(['client', 'partner'] as Portal[]).map(p => (
          <button key={p} type="button" onClick={() => setPortal(p)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
              portal === p ? 'bg-[#A0806A] text-white shadow-sm' : 'text-[#4A6460] hover:text-[#1C2B2A]'
            }`}>
            {p === 'client' ? 'כניסת לקוח' : 'כניסת שותף'}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleLogin} className="space-y-5" noValidate>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className={LABEL}>אימייל</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            dir="ltr"
            className={INPUT}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className={LABEL}>סיסמה</label>
            <button type="button" onClick={() => switchTo('forgot')}
              className="text-xs text-[#A0806A] hover:underline">
              שכחת סיסמה?
            </button>
          </div>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={setPassword}
          />
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className={`mt-2 ${BTN_PRIMARY}`}>
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> מתחבר…</>
            : portal === 'client' ? 'התחברות' : 'כניסת שותפים'
          }
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#D4DEDD]" />
          <span className="text-xs text-[#9BB0AC]">או</span>
          <div className="h-px flex-1 bg-[#D4DEDD]" />
        </div>

        {/* Google */}
        <button type="button" disabled={loading} onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#D4DEDD] bg-white px-6 py-3.5 text-sm font-semibold text-[#1C2B2A] shadow-sm transition-all duration-200 hover:border-[#C8AA8F]/50 hover:bg-[#F4F6F5] disabled:cursor-not-allowed disabled:opacity-50">
          <GoogleIcon />
          המשך עם גוגל
        </button>

      </form>

      {/* Sign up link */}
      <p className="text-center text-xs text-[#9BB0AC]">
        עדיין אין לך חשבון?{' '}
        <button type="button" onClick={() => switchTo('signup')}
          className="font-semibold text-[#A0806A] hover:underline">
          הרשמה
        </button>
      </p>

      {/* Security */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        <ShieldCheck size={11} className="text-[#9BB0AC]" />
        <span className="text-xs text-[#9BB0AC]">מוצפן 256-bit · מאובטח על ידי Supabase</span>
      </div>

    </div>
  )
}
