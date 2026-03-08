import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In — The Investment Academy',
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F8F7] p-4">

      {/* Subtle gold glow — top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(200,170,143,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">

        {/* ── Card ── */}
        <div className="rounded-2xl border border-[#D4DEDD] bg-white p-8 shadow-lg shadow-black/5">

          {/* Brand mark */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[#C8AA8F]/40 bg-[#C8AA8F]/10">
              <span className="text-lg font-bold tracking-[0.15em] text-[#A0806A]">
                IA
              </span>
            </div>
            <h1 className="text-lg font-semibold tracking-wide text-[#1C2B2A]">
              The Investment Academy
            </h1>
            <p className="mt-1 text-xs text-[#4A6460]">כניסה לפורטל האישי שלך</p>
          </div>

          {/* Divider */}
          <div className="mb-7 h-px bg-gradient-to-r from-transparent via-[#D4DEDD] to-transparent" />

          {/* Form */}
          <LoginForm />

        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#4A6460]">
          © {new Date().getFullYear()} The Investment Academy. All rights reserved.
        </p>

      </div>
    </div>
  )
}
