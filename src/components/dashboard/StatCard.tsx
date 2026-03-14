import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  trend?: string
  trendUp?: boolean
  icon: LucideIcon
  accentColor?: string
}

export default function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon: Icon,
  accentColor = '#C8AA8F',
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />

      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}14` }}
        >
          <Icon size={19} style={{ color: accentColor }} />
        </div>

        {trend && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              trendUp
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <p className="mb-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-subtle">{subtitle}</p>
    </div>
  )
}
