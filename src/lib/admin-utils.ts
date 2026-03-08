/**
 * Shared utilities for admin and partner pages.
 * Import from here instead of defining locally in each component.
 */

// ── Role display ──────────────────────────────────────────────────────────────

export const ROLE_LABEL: Record<string, string> = {
  admin:   'מנהל',
  partner: 'סוכן',
  client:  'לקוח',
}

export const ROLE_STYLE: Record<string, string> = {
  admin:   'border-red-500/30 bg-red-500/10 text-red-400',
  partner: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  client:  'border-[#2C3B38] bg-[#2C3B38]/50 text-[#445147]',
}

/** Returns CSS class string for a role badge, with fallback to client style. */
export function roleStyle(role: string | null | undefined): string {
  return ROLE_STYLE[role ?? 'client'] ?? ROLE_STYLE.client
}

/** Returns Hebrew label for a role, with fallback. */
export function roleLabel(role: string | null | undefined): string {
  return ROLE_LABEL[role ?? 'client'] ?? (role ?? 'לקוח')
}

// ── Formatters ────────────────────────────────────────────────────────────────

/** Format an ISO date string as DD/MM/YY in Hebrew locale. Returns '—' for null. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', {
    day:   '2-digit',
    month: '2-digit',
    year:  '2-digit',
  })
}

/** Format a duration in minutes as "X דק'" or "Xש' Yד'". Returns '—' for zero. */
export function fmtMin(minutes: number): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} דק'`
  return `${Math.floor(minutes / 60)}ש' ${minutes % 60}ד'`
}

// ── Email pattern matching ────────────────────────────────────────────────────

/**
 * Strict email pattern matching — two modes only:
 *   1. Exact match:   pattern = "user@company.com"  → only that email matches
 *   2. Domain suffix: pattern = "@company.com" or "company.com"
 *                     → any email ending with @company.com matches
 *
 * Intentionally rejects loose substring matching (no .includes()).
 * A pattern like "admin" will NOT match "gadmin@gmail.com".
 */
export function matchesEmailPattern(email: string, pattern: string): boolean {
  const e = email.toLowerCase().trim()
  const p = pattern.toLowerCase().trim()
  if (!e || !p) return false

  // Mode 1 — exact email match
  if (e === p) return true

  // Mode 2 — domain suffix (@company.com or company.com)
  const domain = p.startsWith('@') ? p : `@${p}`
  return e.endsWith(domain)
}

/**
 * Validates that a pattern is either a full email address or a domain suffix.
 * Returns an error string if invalid, or null if valid.
 */
export function validateEmailPattern(pattern: string): string | null {
  const p = pattern.toLowerCase().trim()
  if (!p) return 'תבנית האימייל נדרשת.'

  const isDomain = p.startsWith('@') && p.includes('.') && p.length > 4
  const isEmail  = !p.startsWith('@') && p.includes('@') && p.includes('.')

  if (!isDomain && !isEmail) {
    return 'תבנית לא תקינה. השתמש ב-@domain.com לדומיין, או כתובת אימייל מלאה.'
  }
  return null
}
