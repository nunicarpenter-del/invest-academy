'use client'

import Link from 'next/link'
import { CalendarDays, Lock, Download } from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'

interface ServicePlan {
  plan_name:      string
  total_sessions: number
  start_date:     string
}

interface Props {
  plan:         ServicePlan | null
  sessionsUsed: number
  isPremium:    boolean
}

export default function ServiceHubWidget({ plan, sessionsUsed, isPremium }: Props) {
  const { lang, t } = useLang()
  const sp = t.servicePlan

  const remaining = plan ? Math.max(0, plan.total_sessions - sessionsUsed) : 0
  const pct       = plan && plan.total_sessions > 0
    ? Math.min(100, (sessionsUsed / plan.total_sessions) * 100)
    : 0

  return (
    <div className="space-y-4">

      {/* ── Service Hub ──────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{sp.title}</h2>
            {plan && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {sp.startDate}: {new Date(plan.start_date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
              </p>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays size={17} className="text-primary" />
          </div>
        </div>

        {plan ? (
          <>
            {/* Plan name */}
            <p className="mb-3 text-base font-bold text-primary">{plan.plan_name}</p>

            {/* Sessions progress bar */}
            <div className="mb-3">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{sp.sessionsUsed}: {sessionsUsed}</span>
                <span>{sp.sessionsRemaining}: {remaining}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-emerald-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Count text */}
            <p className="mb-4 text-2xl font-black text-foreground">
              <span className="text-emerald-500 dark:text-emerald-400">{sessionsUsed}</span>
              <span className="mx-1 text-sm font-normal text-muted-foreground">{sp.sessionsUsed.toLowerCase()}</span>
              <span className="text-sm font-normal text-muted-foreground">{lang === 'he' ? 'מתוך' : 'of'}</span>
              <span className="mx-1">{plan.total_sessions}</span>
            </p>

            <Link
              href="/dashboard/meetings"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <CalendarDays size={14} />
              {sp.bookNext}
            </Link>
          </>
        ) : (
          <p className="text-sm text-subtle">{sp.noplan}</p>
        )}
      </section>

      {/* ── Premium Upsell ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t.premium.exclusiveTitle}</h2>
          </div>
          {!isPremium && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10">
              <Lock size={14} className="text-amber-500 dark:text-amber-400" />
            </div>
          )}
        </div>

        {isPremium ? (
          /* Premium: full content */
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {lang === 'he'
                ? 'יש לך גישה מלאה להזדמנויות בלעדיות ולדוחות עושר מותאמים אישית.'
                : 'You have full access to exclusive opportunities and personalised wealth reports.'}
            </p>
            <button
              onClick={() => {
                const link = document.createElement('a')
                link.href = 'data:application/pdf;base64,JVBERi0xLjAKJeKiu6sKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUj4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjE0CiUlRU9G'
                link.download = 'wealth-report.pdf'
                link.click()
              }}
              className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
            >
              <Download size={14} />
              {t.premium.downloadReport}
            </button>
          </div>
        ) : (
          /* Non-premium: blurred overlay */
          <div className="relative">
            {/* Blurred placeholder content */}
            <div className="select-none blur-sm pointer-events-none space-y-2">
              <div className="rounded-lg bg-background px-4 py-3">
                <p className="text-xs text-amber-500 dark:text-amber-400 font-semibold">🏗️ פרויקט פינוי-בינוי — תשואה 28%</p>
                <p className="mt-1 text-xs text-muted-foreground">הזדמנות בלעדית למשקיעי פרמיום בלבד</p>
              </div>
              <div className="rounded-lg bg-background px-4 py-3">
                <p className="text-xs text-emerald-500 dark:text-emerald-400 font-semibold">📊 דוח עושר מותאם אישית</p>
                <p className="mt-1 text-xs text-muted-foreground">ניתוח מעמיק של התיק שלך</p>
              </div>
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/85">
              <Lock size={20} className="text-amber-500 dark:text-amber-400" />
              <p className="text-xs text-muted-foreground text-center px-4">{t.premium.lockedHint}</p>
              <button
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-400"
              >
                {t.premium.upgradeBtn}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
