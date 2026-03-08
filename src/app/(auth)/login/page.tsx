import type { Metadata } from 'next'
import Image from 'next/image'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'כניסה — האקדמיה להשקעות',
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F8F7] p-4" dir="rtl">

      {/* Subtle gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[400px]"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(200,170,143,0.14) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-sm">

        {/* ── Card ── */}
        <div className="rounded-2xl border border-[#D4DEDD] bg-white p-8 shadow-lg shadow-black/5">

          {/* Brand mark */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C8AA8F]/30 bg-[#C8AA8F]/8 shadow-sm">
              <Image
                src="/logo.svg"
                alt="האקדמיה להשקעות"
                width={40}
                height={40}
                priority
              />
            </div>
            <h1 className="text-xl font-bold tracking-wide text-[#1C2B2A]">
              האקדמיה להשקעות
            </h1>
            <p className="mt-1 text-sm text-[#4A6460]">מרכז הפיקוד הפיננסי שלך</p>
          </div>

          {/* Divider */}
          <div className="mb-7 h-px bg-gradient-to-r from-transparent via-[#D4DEDD] to-transparent" />

          {/* Form */}
          <LoginForm />

        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#9BB0AC]">
          © {new Date().getFullYear()} האקדמיה להשקעות. כל הזכויות שמורות.
        </p>

      </div>
    </div>
  )
}
