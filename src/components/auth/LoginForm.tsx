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
      <div className="flex gap-1 rounded-xl border border-[#2C3B38] bg-[#101A26] p-1">
        {(['client', 'partner'] as Portal[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPortal(p)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
              portal === p
                ? 'bg-[#C8AA8F] text-[#101A26]'
                : 'text-[#86968B] hover:text-[#F0EDE8]'
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
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-widest text-[#86968B]">
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
            className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-3 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-all duration-200 focus:border-[#C8AA8F] focus:ring-1 focus:ring-[#C8AA8F]/50"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-widest text-[#86968B]">
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
              className="w-full rounded-xl border border-[#2C3B38] bg-[#101A26] px-4 py-3 pr-12 text-sm text-[#F0EDE8] placeholder-[#445147] outline-none transition-all duration-200 focus:border-[#C8AA8F] focus:ring-1 focus:ring-[#C8AA8F]/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#445147] transition-colors hover:text-[#C8AA8F]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C8AA8F] px-6 py-3.5 text-sm font-semibold tracking-wide text-[#101A26] transition-all duration-200 hover:bg-[#D4B99E] hover:shadow-lg hover:shadow-[#C8AA8F]/10 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Security line */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          <Lock size={11} className="text-[#445147]" />
          <span className="text-xs text-[#445147]">256-bit encrypted · Secured by Supabase</span>
        </div>

      </form>

    </div>
  )
}
