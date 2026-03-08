import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In — The Investment Academy',
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#101A26] p-4">

      {/* Ambient glow — top center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(200,170,143,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Ambient glow — bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 110%, rgba(68,81,71,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">

        {/* ── Card ── */}
        <div className="rounded-2xl border border-[#C8AA8F]/12 bg-[#20302F] p-8 shadow-2xl shadow-black/40">

          {/* Brand mark */}
          <div className="mb-8 flex flex-col items-center text-center">

            {/* Monogram */}
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/8">
              <span className="text-lg font-bold tracking-[0.15em] text-[#C8AA8F]">
                IA
              </span>
            </div>

            <h1 className="text-lg font-semibold tracking-wide text-[#C8AA8F]">
              The Investment Academy
            </h1>
          </div>

          {/* Divider */}
          <div className="mb-7 h-px bg-gradient-to-r from-transparent via-[#445147] to-transparent" />

          {/* Form */}
          <LoginForm />

        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#445147]">
          © {new Date().getFullYear()} The Investment Academy. All rights reserved.
        </p>

      </div>
    </div>
  )
}
