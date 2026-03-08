/**
 * Academy Recommendation Engine & XP System
 *
 * MODULAR DESIGN — adding new triggers or milestones is a one-liner:
 *   1. Add an entry to RECOMMENDATION_TRIGGERS (category slugs match vod_categories.slug)
 *   2. Add an entry to XP_MILESTONES
 *
 * No other files need to change.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Snapshot of a user's financial data, used by all condition functions. */
export interface UserSnapshot {
  liabilityCount:  number
  totalLiabilities: number
  stockCount:      number
  cryptoCount:     number
  propertyCount:   number
  pensionCount:    number
  meetingCount:    number
  completedTaskXP: number   // pre-calculated from task completions
  videoXP:         number   // from user_xp_events video_completed
  hasAnyAsset:     boolean  // property | stock | pension > 0
}

// ── Recommendation Triggers ───────────────────────────────────────────────────

export interface RecommendationTrigger {
  id:         string
  /** Pure function — no side effects */
  condition:  (snap: UserSnapshot) => boolean
  /** vod_categories.slug values to surface */
  categories: string[]
  reason:     { he: string; en: string }
}

/**
 * The full list of recommendation triggers.
 * category slugs must match vod_categories.slug in the DB.
 * Add new triggers here — nothing else needs to change.
 */
export const RECOMMENDATION_TRIGGERS: RecommendationTrigger[] = [
  {
    id:         'always_core_program',
    condition:  (_s) => true,
    categories: ['mezapen_calcali'],
    reason:     { he: 'תוכנית הליבה של אביתר', en: "Aviatar's core program" },
  },
  {
    id:         'no_stocks',
    condition:  (s) => s.stockCount === 0,
    categories: ['shuk_haon'],
    reason:     { he: 'כדי להתחיל להשקיע בשוק ההון', en: 'To start investing in the capital market' },
  },
  {
    id:         'has_stocks',
    condition:  (s) => s.stockCount > 0,
    categories: ['shuk_haon'],
    reason:     { he: 'לניהול תיק ההשקעות שלך', en: 'To manage your investment portfolio' },
  },
  {
    id:         'no_properties',
    condition:  (s) => s.propertyCount === 0,
    categories: ['nadlan', 'dirot_yad_rishona', 'karkot'],
    reason:     { he: 'לצעדים ראשונים בנדל"ן', en: 'For first steps in real estate' },
  },
  {
    id:         'has_properties',
    condition:  (s) => s.propertyCount > 0,
    categories: ['nadlan', 'pinui_binui', 'kvutzot_rechisha'],
    reason:     { he: 'לניהול נכסים מתקדם', en: 'For advanced property management' },
  },
  {
    id:         'has_liabilities',
    condition:  (s) => s.liabilityCount > 0,
    categories: ['calcala_vzchanut'],
    reason:     { he: 'כי יש לך הלוואות פעילות', en: 'Because you have active loans' },
  },
  {
    id:         'has_pension',
    condition:  (s) => s.pensionCount > 0,
    categories: ['shuk_haon', 'calcala_vzchanut'],
    reason:     { he: 'לניהול נכסי הפנסיה שלך', en: 'To manage your pension assets' },
  },
  {
    id:         'podcast',
    condition:  (_s) => true,
    categories: ['hasfa_financit'],
    reason:     { he: 'הפודקאסט הפיננסי השבועי', en: 'Weekly financial podcast' },
  },
]

// ── XP Milestones ─────────────────────────────────────────────────────────────

export interface XPMilestone {
  id:       string
  xp:       number
  achieved: (snap: UserSnapshot) => boolean
  label:    { he: string; en: string }
  icon:     string
}

/**
 * Full list of XP-earning milestones.
 * Add new milestones here — XP recalculates automatically.
 */
export const XP_MILESTONES: XPMilestone[] = [
  {
    id:       'first_property',
    xp:       100,
    achieved: (s) => s.propertyCount > 0,
    label:    { he: 'נכס ראשון נוסף', en: 'First Property Added' },
    icon:     '🏠',
  },
  {
    id:       'first_stock',
    xp:       100,
    achieved: (s) => s.stockCount > 0,
    label:    { he: 'השקעה ראשונה', en: 'First Investment Added' },
    icon:     '📈',
  },
  {
    id:       'first_pension',
    xp:       50,
    achieved: (s) => s.pensionCount > 0,
    label:    { he: 'חיסכון לגיל פרישה', en: 'Retirement Savings Started' },
    icon:     '🏦',
  },
  {
    id:       'tracks_debt',
    xp:       50,
    achieved: (s) => s.liabilityCount > 0,
    label:    { he: 'מעקב חובות פעיל', en: 'Active Debt Tracking' },
    icon:     '📋',
  },
  {
    id:       'first_meeting',
    xp:       75,
    achieved: (s) => s.meetingCount > 0,
    label:    { he: 'פגישה ראשונה תוזמנה', en: 'First Meeting Scheduled' },
    icon:     '🤝',
  },
  {
    id:       'diverse_portfolio',
    xp:       150,
    achieved: (s) => s.stockCount > 0 && s.propertyCount > 0,
    label:    { he: 'תיק מגוון (מניות + נדל"ן)', en: 'Diversified Portfolio (Stocks + Real Estate)' },
    icon:     '⭐',
  },
  {
    id:       'full_spectrum',
    xp:       200,
    achieved: (s) => s.stockCount > 0 && s.propertyCount > 0 && s.pensionCount > 0,
    label:    { he: 'תיק מלא (נדל"ן + מניות + פנסיה)', en: 'Full Spectrum Portfolio' },
    icon:     '💎',
  },
]

// Task XP by difficulty
export const TASK_XP: Record<string, number> = {
  easy:   25,
  medium: 50,
  hard:   100,
}

// ── Tiers ─────────────────────────────────────────────────────────────────────

export interface Tier {
  key:   string
  minXP: number
  color: string
  bg:    string
  icon:  string
}

export const TIERS: Tier[] = [
  { key: 'beginner',    minXP: 0,   color: '#86968B', bg: 'bg-[#86968B]/10',   icon: '🌱' },
  { key: 'progressor',  minXP: 150, color: '#C8AA8F', bg: 'bg-[#C8AA8F]/10',   icon: '⭐' },
  { key: 'experienced', minXP: 350, color: '#3B82F6', bg: 'bg-blue-400/10',    icon: '🏆' },
  { key: 'expert',      minXP: 600, color: '#10B981', bg: 'bg-emerald-400/10', icon: '💎' },
]

// ── Pure helper functions ─────────────────────────────────────────────────────

export function calcXP(snap: UserSnapshot): number {
  const milestoneXP = XP_MILESTONES
    .filter(m => m.achieved(snap))
    .reduce((s, m) => s + m.xp, 0)
  return milestoneXP + snap.completedTaskXP + snap.videoXP
}

export function getTier(xp: number): Tier {
  return [...TIERS].reverse().find(t => xp >= t.minXP) ?? TIERS[0]
}

export function getNextTier(xp: number): Tier | null {
  return TIERS.find(t => t.minXP > xp) ?? null
}

/** Returns firing triggers (max 3) — drives the "Recommended for You" section */
export function getActiveTriggers(snap: UserSnapshot): RecommendationTrigger[] {
  return RECOMMENDATION_TRIGGERS.filter(t => t.condition(snap)).slice(0, 3)
}

/**
 * Maps a level number to a named tier key (level-based, 500 XP per level).
 * Used in the Journey tab to show a human-readable rank label.
 */
export function getLevelTierKey(level: number): string {
  if (level <= 3)  return 'rookie'
  if (level <= 7)  return 'investor'
  if (level <= 12) return 'expert'
  return 'elite'
}

/**
 * Determines if a category is locked for the current user.
 * lock_type comes from vod_categories.lock_type in the DB.
 */
export function isCatLocked(lockType: string | null | undefined, snap: UserSnapshot): boolean {
  if (!lockType) return false
  if (lockType === 'has_any_asset')  return !snap.hasAnyAsset
  if (lockType === 'has_property')   return snap.propertyCount === 0
  if (lockType === 'has_investment') return snap.stockCount === 0 && snap.cryptoCount === 0
  return false
}
