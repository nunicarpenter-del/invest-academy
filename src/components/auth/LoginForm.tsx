'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Portal = 'client' | 'partner'

const PORTAL_LABEL: Record<Portal, string> = {
  client:  'Client Portal',
  partner: 'Partner Portal',
}

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
      setError('Invalid email or password. Please try again.')
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
    if (role === 'admin')   router.push('/admin')
    else if (role === 'partner') router.push('/partner')
    else router.push('/dashboard')
  }

  return (
    <div className="space-y-5">

      {/* Portal selector (Client / Partner tabs) */}
      <div className="flex gap-1 rounded-xl border border-[#D4DEDD] bg-[#EEF1F0] p-1">
        {(['client', 'partner'] as Portal[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPortal(p)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
              portal === p
                ? 'bg-[#A0806A] text-white shadow-sm'
                : 'text-[#4A6460] hover:text-[#1C2B2A]'
            }`}
          >
            {p === 'client' ? 'Client' : 'Partner'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>

        {/* Error banner */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-widest text-[#4A6460]">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full rounded-xl border border-[#D4DEDD] bg-[#F4F6F5] px-4 py-3 text-sm text-[#1C2B2A] placeholder-[#9BB0AC] outline-none transition-all duration-200 focus:border-[#C8AA8F] focus:ring-1 focus:ring-[#C8AA8F]/50"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-widest text-[#4A6460]">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-[#D4DEDD] bg-[#F4F6F5] px-4 py-3 pr-12 text-sm text-[#1C2B2A] placeholder-[#9BB0AC] outline-none transition-all duration-200 focus:border-[#C8AA8F] focus:ring-1 focus:ring-[#C8AA8F]/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9BB0AC] transition-colors hover:text-[#A0806A]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A0806A] px-6 py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-[#8B6E5A] hover:shadow-lg hover:shadow-[#A0806A]/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in…
            </>
          ) : (
            `Sign in to ${PORTAL_LABEL[portal]}`
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2C3B38]" />
          <span className="text-xs text-[#445147]">or</span>
          <div className="h-px flex-1 bg-[#2C3B38]" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#2C3B38] bg-[#101A26] px-6 py-3.5 text-sm font-semibold text-[#F0EDE8] transition-all duration-200 hover:border-[#C8AA8F]/30 hover:bg-[#172530] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Google SVG icon */}
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Security line */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Lock size={11} className="text-[#9BB0AC]" />
          <span className="text-xs text-[#9BB0AC]">256-bit encrypted · Secured by Supabase</span>
        </div>

      </form>

    </div>
  )
}
