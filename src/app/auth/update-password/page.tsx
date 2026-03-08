'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const INPUT = 'w-full rounded-xl border border-[#D4DEDD] bg-[#F4F6F5] px-4 py-3 text-sm text-[#1C2B2A] placeholder-[#9BB0AC] outline-none transition-all duration-200 focus:border-[#C8AA8F] focus:ring-1 focus:ring-[#C8AA8F]/50'

export default function UpdatePasswordPage() {
  const [password, setPassword]       = useState('')
  const [confirm,  setConfirm]        = useState('')
  const [showPw,   setShowPw]         = useState(false)
  const [showCf,   setShowCf]         = useState(false)
  const [loading,  setLoading]        = useState(false)
  const [error,    setError]          = useState<string | null>(null)
  const [done,     setDone]           = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError('הסיסמאות אינן תואמות.'); return }
    if (password.length < 6)  { setError('הסיסמה חייבת להכיל לפחות 6 תווים.'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 3000)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F7F8F7] p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#D4DEDD] bg-white p-8 shadow-lg shadow-black/5">

          {/* Brand */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/8">
              <Image src="/logo.svg" alt="לוגו" width={34} height={34} priority />
            </div>
            <h1 className="text-lg font-bold text-[#1C2B2A]">עדכון סיסמה</h1>
            <p className="mt-1 text-xs text-[#4A6460]">הזן סיסמה חדשה לחשבונך</p>
          </div>

          <div className="mb-6 h-px bg-gradient-to-r from-transparent via-[#D4DEDD] to-transparent" />

          {done ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
              <CheckCircle2 size={28} className="text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">הסיסמה עודכנה בהצלחה!</p>
              <p className="text-xs text-emerald-600">מועבר לדף הכניסה…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              {/* New password */}
              <div className="space-y-1.5">
                <label htmlFor="new-pw" className="block text-xs font-semibold text-[#4A6460]">
                  סיסמה חדשה
                </label>
                <div className="relative">
                  <input
                    id="new-pw"
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="לפחות 6 תווים"
                    dir="ltr"
                    className={`${INPUT} ps-12`}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#9BB0AC] hover:text-[#A0806A]">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-pw" className="block text-xs font-semibold text-[#4A6460]">
                  אימות סיסמה
                </label>
                <div className="relative">
                  <input
                    id="confirm-pw"
                    type={showCf ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="הזן שוב את הסיסמה"
                    dir="ltr"
                    className={`${INPUT} ps-12`}
                  />
                  <button type="button" onClick={() => setShowCf(s => !s)}
                    className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#9BB0AC] hover:text-[#A0806A]">
                    {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A0806A] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#8B6E5A] disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? <><Loader2 size={16} className="animate-spin" /> מעדכן…</> : 'עדכן סיסמה'}
              </button>

              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck size={11} className="text-[#9BB0AC]" />
                <span className="text-xs text-[#9BB0AC]">מוצפן 256-bit · מאובטח על ידי Supabase</span>
              </div>

            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#9BB0AC]">
          © {new Date().getFullYear()} האקדמיה להשקעות. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  )
}
