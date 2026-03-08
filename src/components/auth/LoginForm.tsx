'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Portal = 'client' | 'partner'

export default function LoginForm() {
  const [portal, setPortal]             = useState<Portal>('client')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })
    if (oauthError) {
      setError(oauthError.message)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.user) {
      setError('אימייל או סיסמה שגויים. אנא נסה שוב.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const role = profile?.role ?? 'client'
    router.refresh()
    if (role === 'admin')        router.push('/admin')
    else if (role === 'partner') router.push('/partner')
    else                         router.push('/dashboard')
  }

  return (
    <div className="space-y-5" dir="rtl">

      {/* Portal tabs */}
      <div className="flex gap-1 rounded-xl border border-[#D4DEDD] bg-[#EEF1F0] p-1">
        {(['client', 'partner'] as Portal[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPortal(p)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
              portal === p
                ? 'bg-[#A0806A] text-white shadow-sm'
                : 'text-[#4A6460] hover:text-[#1C2B2A]'
            }`}
          >
            {p === 'client' ? 'כניסת לקוח' : 'כניסת שותף'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-[#4A6460]">
            אימייל
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            dir="ltr"
            className="w-full rounded-xl border border-[#D4DEDD] bg-[#F4F6F5] px-4 py-3 text-sm text-[#1C2B2A] placeholder-[#9BB0AC] outline-none transition-all duration-200 focus:border-[#C8AA8F] focus:ring-1 focus:ring-[#C8AA8F]/50"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold text-[#4A6460]">
              סיסמה
            </label>
            <button
              type="button"
              className="text-xs text-[#A0806A] hover:underline"
            >
              שכחת סיסמה?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              dir="ltr"
              className="w-full rounded-xl border border-[#D4DEDD] bg-[#F4F6F5] px-4 py-3 ps-12 text-sm text-[#1C2B2A] placeholder-[#9BB0AC] outline-none transition-all duration-200 focus:border-[#C8AA8F] focus:ring-1 focus:ring-[#C8AA8F]/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#9BB0AC] transition-colors hover:text-[#A0806A]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A0806A] px-6 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#8B6E5A] hover:shadow-lg hover:shadow-[#A0806A]/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              מתחבר…
            </>
          ) : (
            portal === 'client' ? 'התחברות' : 'כניסת שותפים'
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#D4DEDD]" />
          <span className="text-xs text-[#9BB0AC]">או</span>
          <div className="h-px flex-1 bg-[#D4DEDD]" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#D4DEDD] bg-white px-6 py-3.5 text-sm font-semibold text-[#1C2B2A] shadow-sm transition-all duration-200 hover:border-[#C8AA8F]/50 hover:bg-[#F4F6F5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          המשך עם גוגל
        </button>

        {/* Sign up hint */}
        <p className="text-center text-xs text-[#9BB0AC]">
          עדיין אין לך חשבון?{' '}
          <span className="cursor-pointer text-[#A0806A] hover:underline">
            צור קשר איתנו להרשמה
          </span>
        </p>

        {/* Security line */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck size={11} className="text-[#9BB0AC]" />
          <span className="text-xs text-[#9BB0AC]">מוצפן 256-bit · מאובטח על ידי Supabase</span>
        </div>

      </form>

    </div>
  )
}
