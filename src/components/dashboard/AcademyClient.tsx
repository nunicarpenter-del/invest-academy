'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Lock, CheckCircle2, Clock, Play, X, GraduationCap, Star, Sparkles,
} from 'lucide-react'
import { useLang } from '@/contexts/LanguageContext'
import type { T } from '@/lib/i18n'
import {
  getActiveTriggers, calcXP, getTier, getNextTier, isCatLocked,
  getLevelTierKey, XP_MILESTONES, TASK_XP,
  type UserSnapshot,
} from '@/lib/academy'
import { useAcademyData } from '@/hooks/useAcademyData'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VodCategory {
  id:            string
  slug:          string
  name_he:       string
  name_en:       string
  parent_id:     string | null
  lock_type:     string | null
  icon:          string | null
  display_order: number
}

export interface VodVideo {
  id:               string
  title_he:         string
  title_en:         string | null
  description_he:   string | null
  description_en:   string | null
  video_url:        string
  thumbnail_url:    string | null
  duration_seconds: number | null
  xp_value:         number
  display_order:    number
  category_id:      string
}

interface VideoProgress {
  video_id:  string
  completed: boolean
}

interface TaskBank {
  title:       string
  description: string | null
  difficulty:  string | null
  category:    string | null
}

interface Task {
  id:           string
  is_completed: boolean
  task_id:      string
  task_bank:    TaskBank | null
}

interface Props {
  videos:     VodVideo[]
  categories: VodCategory[]
  progress:   VideoProgress[]
  tasks:      Task[]
  snap:       UserSnapshot
  userId:     string
}

// ── Confetti ──────────────────────────────────────────────────────────────────
// Deterministic particles — no Math.random() in render, no hydration issues.

const CONFETTI_COLORS = [
  '#C8AA8F', '#10B981', '#3B82F6', '#F59E0B',
  '#A855F7', '#EC4899', '#F43F5E', '#06B6D4',
]

const PARTICLES = Array.from({ length: 48 }, (_, i) => ({
  left:     (i * 100 / 48 + (i % 6) * 2.5) % 100,
  delay:    (i * 0.07) % 0.65,
  duration: 1.3 + (i % 6) * 0.18,
  width:    5 + (i % 4) * 2,
  height:   6 + (i % 5) * 2,
  color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round:    i % 4 === 0,
}))

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="fixed inset-0 pointer-events-none z-[70] overflow-hidden">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position:        'absolute',
            left:            `${p.left}%`,
            top:             '-24px',
            width:           `${p.width}px`,
            height:          `${p.height}px`,
            backgroundColor: p.color,
            borderRadius:    p.round ? '50%' : '2px',
            animation:       `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`
  return url
}

const DIFF_STYLE: Record<string, string> = {
  easy:   'text-emerald-400 bg-emerald-400/10',
  medium: 'text-amber-400  bg-amber-400/10',
  hard:   'text-red-400    bg-red-400/10',
}

const LS_KEY = 'academy_last_watched'

// ── Main component ────────────────────────────────────────────────────────────

export default function AcademyClient({
  videos, categories, progress, tasks, snap, userId,
}: Props) {
  const { t, lang } = useLang()

  const [tab,    setTab]   = useState<'library' | 'journey'>('library')
  const [topCat, setTopCat] = useState<string | null>(null)
  const [subCat, setSubCat] = useState<string | null>(null)
  const [playing, setPlay]  = useState<VodVideo | null>(null)

  // Lock toast
  const [lockToastVisible, setLockToast] = useState(false)
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Confetti
  const [confettiActive, setConfetti] = useState(false)
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Continue Watching — persisted to localStorage
  const [lastWatchedId, setLastWatchedId] = useState<string | null>(null)

  // Load lastWatchedId from localStorage on mount (client-only)
  useEffect(() => {
    setLastWatchedId(localStorage.getItem(LS_KEY))
  }, [])

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (lockTimer.current)     clearTimeout(lockTimer.current)
    if (confettiTimer.current) clearTimeout(confettiTimer.current)
  }, [])

  // ── Academy data hook (optimistic progress + live XP) ────────────────────
  const { progressMap, videoXP: liveVideoXP, handleVideoComplete } = useAcademyData({
    initialProgress: progress,
    initialVideoXP:  snap.videoXP,
    userId,
  })

  const ac   = t.academy
  const isHe = lang === 'he'

  // Category helpers
  const catMap  = new Map(categories.map(c => [c.id, c]))
  const topCats = categories.filter(c => c.parent_id === null)
  const subCats = topCat ? categories.filter(c => c.parent_id === topCat) : []

  // ── XP + Level (live) ─────────────────────────────────────────────────────
  const xp    = calcXP({ ...snap, videoXP: liveVideoXP })
  const level = Math.floor(xp / 500) + 1
  const tier     = getTier(xp)
  const nextTier = getNextTier(xp)

  const xpInLevel        = xp % 500
  const xpToNextLevel    = 500 - xpInLevel
  const levelProgressPct = Math.min(100, (xpInLevel / 500) * 100)

  const levelTierKey   = getLevelTierKey(level)
  const levelTierLabel = ac.levelTiers[levelTierKey] ?? levelTierKey

  // ── Recommendation Engine ─────────────────────────────────────────────────
  // Triggered by snap data (pension, property, stocks, liabilities).
  // RECOMMENDATION_TRIGGERS in academy.ts handles the logic.
  const activeTriggers = getActiveTriggers(snap)
  const recSlugs  = [...new Set(activeTriggers.flatMap(tr => tr.categories))]
  const recCatIds = new Set(categories.filter(c => recSlugs.includes(c.slug)).map(c => c.id))
  const recVideos = videos
    .filter(v => recCatIds.has(v.category_id) && !(progressMap.get(v.id) ?? false))
    .slice(0, 3)

  // ── Continue Watching ─────────────────────────────────────────────────────
  // Last video opened in any session, if not yet completed.
  const lastWatchedVideo =
    lastWatchedId &&
    videos.find(v => v.id === lastWatchedId && !(progressMap.get(v.id) ?? false))
      ? videos.find(v => v.id === lastWatchedId)!
      : null

  // Filtered video list by selected category
  const filteredVideos = (() => {
    if (subCat) return videos.filter(v => v.category_id === subCat)
    if (topCat) {
      const childIds = new Set(categories.filter(c => c.parent_id === topCat).map(c => c.id))
      return videos.filter(v => v.category_id === topCat || childIds.has(v.category_id))
    }
    return videos
  })()

  // Recent XP activity (derived, no extra DB query)
  interface XPEvent { label: string; xp: number; icon: string }
  const recentEvents: XPEvent[] = [
    ...videos
      .filter(v => progressMap.get(v.id) === true)
      .map(v => ({ label: isHe ? v.title_he : (v.title_en ?? v.title_he), xp: v.xp_value, icon: '▶' })),
    ...XP_MILESTONES
      .filter(m => m.achieved(snap))
      .map(m => ({ label: m.label[isHe ? 'he' : 'en'], xp: m.xp, icon: m.icon })),
  ].slice(0, 12)

  const hasLockedCats = categories.some(c => isCatLocked(c.lock_type, snap))

  const catName  = (c: VodCategory) => isHe ? c.name_he : (c.name_en || c.name_he)
  const vidTitle = (v: VodVideo)    => isHe ? v.title_he : (v.title_en ?? v.title_he)
  const vidDesc  = (v: VodVideo)    => isHe ? v.description_he : (v.description_en ?? v.description_he)

  // ── Event handlers ────────────────────────────────────────────────────────

  function showLockToast() {
    setLockToast(true)
    if (lockTimer.current) clearTimeout(lockTimer.current)
    lockTimer.current = setTimeout(() => setLockToast(false), 3000)
  }

  function fireConfetti() {
    setConfetti(true)
    if (confettiTimer.current) clearTimeout(confettiTimer.current)
    confettiTimer.current = setTimeout(() => setConfetti(false), 2800)
  }

  function openVideo(video: VodVideo) {
    setPlay(video)
    // Track for "Continue Watching" (persisted across page refreshes)
    localStorage.setItem(LS_KEY, video.id)
    setLastWatchedId(video.id)
  }

  function markComplete(videoId: string, xpValue: number) {
    handleVideoComplete(videoId, xpValue)
    fireConfetti()
    // Clear "Continue Watching" if this is the watched video
    if (lastWatchedId === videoId) {
      localStorage.removeItem(LS_KEY)
      setLastWatchedId(null)
    }
    setPlay(null)
  }

  function selectTopCat(id: string) {
    if (topCat === id) { setTopCat(null); setSubCat(null) }
    else               { setTopCat(id);  setSubCat(null)  }
  }

  function selectSubCat(id: string) {
    setSubCat(prev => prev === id ? null : id)
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6">

      {/* Page header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C8AA8F]">{ac.section}</p>
        <h1 className="mt-1 text-2xl font-bold text-[#F0EDE8]">{ac.title}</h1>
      </div>

      {/* ── STATS HEADER ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#2C3B38] bg-[#172530] px-5 py-4">
        <div className="flex items-center gap-5">

          {/* Level badge */}
          <div
            className="relative flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${tier.color}22 0%, ${tier.color}08 100%)`,
              border:     `1px solid ${tier.color}40`,
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${tier.color}90` }}>
              LV
            </span>
            <span className="text-3xl font-black leading-none transition-all duration-500" style={{ color: tier.color }}>
              {level}
            </span>
          </div>

          {/* Tier + XP + progress bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div>
                <p className="text-base font-bold text-[#F0EDE8]">{levelTierLabel}</p>
                <p className="text-xs text-[#86968B] mt-0.5">{tier.icon} {ac.tiers[tier.key] ?? tier.key}</p>
              </div>
              <p className="text-2xl font-black tabular-nums shrink-0 transition-all duration-500" style={{ color: tier.color }}>
                {xp.toLocaleString()} <span className="text-sm font-semibold">XP</span>
              </p>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-[#86968B] mb-1.5">
                <span>{ac.journey.level} {level}</span>
                <span>{ac.journey.xpNeeded(xpToNextLevel)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#101A26] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${levelProgressPct}%`, backgroundColor: tier.color }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#445147] mt-1">
                <span>{xpInLevel} / 500 XP</span>
                <span>{ac.journey.level} {level + 1}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-[#2C3B38] bg-[#172530] p-1 w-fit">
        {(['library', 'journey'] as const).map(key => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === key
                ? 'bg-[#C8AA8F]/20 text-[#C8AA8F]'
                : 'text-[#86968B] hover:text-[#F0EDE8]'
            }`}
          >
            {ac.tabs[key]}
          </button>
        ))}
      </div>

      {/* ── LIBRARY TAB ──────────────────────────────────────────────────── */}
      {tab === 'library' && (
        <div className="flex flex-col gap-6">

          {/* Unlock banner */}
          {hasLockedCats && !snap.hasAnyAsset && (
            <div className="flex items-center gap-4 rounded-xl border border-[#C8AA8F]/40 bg-[#C8AA8F]/5 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C8AA8F]/15">
                <Lock size={20} className="text-[#C8AA8F]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#C8AA8F]">{ac.unlock.title}</p>
                <p className="mt-0.5 text-sm text-[#86968B]">{ac.unlock.body}</p>
              </div>
              <a
                href="/dashboard/properties"
                className="shrink-0 rounded-lg bg-[#C8AA8F] px-4 py-2 text-sm font-semibold text-[#101A26] hover:bg-[#D4B89A] transition-colors"
              >
                {ac.unlock.action}
              </a>
            </div>
          )}

          {/* ── Continue Watching ──────────────────────────────────────────── */}
          {lastWatchedVideo && !topCat && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#F0EDE8]">
                <Play size={13} className="text-[#C8AA8F]" />
                {ac.library.continueWatching}
              </h2>
              <div
                className="group flex items-center gap-4 rounded-xl border border-[#C8AA8F]/30 bg-gradient-to-r from-[#C8AA8F]/8 to-transparent p-3 cursor-pointer hover:border-[#C8AA8F]/50 transition-all"
                onClick={() => openVideo(lastWatchedVideo)}
              >
                {/* Thumbnail */}
                <div className="relative h-16 w-28 shrink-0 rounded-lg overflow-hidden bg-[#101A26] flex items-center justify-center">
                  {lastWatchedVideo.thumbnail_url ? (
                    <img
                      src={lastWatchedVideo.thumbnail_url}
                      alt={vidTitle(lastWatchedVideo)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <GraduationCap size={22} className="text-[#2C3B38]" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-all">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C8AA8F]/90">
                      <Play size={14} className="text-[#101A26]" style={{ marginInlineStart: '1px' }} />
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F0EDE8] truncate">{vidTitle(lastWatchedVideo)}</p>
                  {lastWatchedVideo.duration_seconds && (
                    <p className="text-xs text-[#86968B] mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {ac.library.minutes(Math.ceil(lastWatchedVideo.duration_seconds / 60))}
                    </p>
                  )}
                </div>
                {lastWatchedVideo.xp_value > 0 && (
                  <span className="shrink-0 rounded-lg bg-[#C8AA8F]/15 px-2.5 py-1 text-xs font-bold text-[#C8AA8F]">
                    +{lastWatchedVideo.xp_value} XP
                  </span>
                )}
              </div>
            </section>
          )}

          {/* ── Recommended for You ───────────────────────────────────────── */}
          {!topCat && recVideos.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#F0EDE8]">
                <Sparkles size={13} className="text-[#C8AA8F]" />
                {ac.recommendations.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recVideos.map(video => {
                  const cat    = catMap.get(video.category_id)
                  const locked = isCatLocked(cat?.lock_type, snap)
                  const trigger = activeTriggers.find(tr =>
                    tr.categories.some(slug => {
                      const c = categories.find(cc => cc.slug === slug)
                      return c?.id === video.category_id || c?.id === cat?.parent_id
                    })
                  )
                  return (
                    <VideoCard
                      key={video.id}
                      title={vidTitle(video)}
                      description={vidDesc(video)}
                      video={video}
                      completed={progressMap.get(video.id) ?? false}
                      locked={locked}
                      onPlay={() => openVideo(video)}
                      onLocked={showLockToast}
                      reasonText={trigger?.reason[isHe ? 'he' : 'en']}
                      ac={ac}
                    />
                  )
                })}
              </div>
            </section>
          )}

          {/* ── Category Navigation ───────────────────────────────────────── */}
          <div className="relative h-28 flex flex-col gap-2">

            {/* Row 1 — main categories */}
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => { setTopCat(null); setSubCat(null) }}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium border border-[#2C3B38] whitespace-nowrap transition-colors ${
                  !topCat
                    ? 'bg-[#C8AA8F]/20 text-[#C8AA8F]'
                    : 'bg-transparent text-[#86968B] hover:bg-[#2C3B38]/60 hover:text-[#F0EDE8]'
                }`}
              >
                {ac.library.all}
              </button>
              {topCats.map(cat => {
                const locked = isCatLocked(cat.lock_type, snap)
                const active = topCat === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => locked ? showLockToast() : selectTopCat(cat.id)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border border-[#2C3B38] whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#C8AA8F]/20 text-[#C8AA8F]'
                        : locked
                        ? 'bg-transparent text-[#445147] cursor-default'
                        : 'bg-transparent text-[#86968B] hover:bg-[#2C3B38]/60 hover:text-[#F0EDE8]'
                    }`}
                  >
                    {locked ? <Lock size={10} /> : (cat.icon && <span>{cat.icon}</span>)}
                    {catName(cat)}
                  </button>
                )
              })}
            </div>

            {/* Row 2 — sub-categories: absolute so it floats, never pushes video grid */}
            <div className={`absolute top-14 left-0 w-full h-12 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${!(topCat && subCats.length > 0) ? 'invisible' : ''}`}>
              <button
                onClick={() => setSubCat(null)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium border border-[#2C3B38] whitespace-nowrap transition-colors ${
                  !subCat
                    ? 'bg-[#C8AA8F]/20 text-[#C8AA8F]'
                    : 'bg-transparent text-[#86968B] hover:bg-[#2C3B38]/60 hover:text-[#F0EDE8]'
                }`}
              >
                {ac.library.all}
              </button>
              {subCats.map(sub => {
                const locked = isCatLocked(sub.lock_type, snap)
                const active = subCat === sub.id
                return (
                  <button
                    key={sub.id}
                    onClick={() => locked ? showLockToast() : selectSubCat(sub.id)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border border-[#2C3B38] whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[#C8AA8F]/20 text-[#C8AA8F]'
                        : locked
                        ? 'bg-transparent text-[#445147] cursor-default'
                        : 'bg-transparent text-[#86968B] hover:bg-[#2C3B38]/60 hover:text-[#F0EDE8]'
                    }`}
                  >
                    {locked ? <Lock size={10} /> : (sub.icon && <span>{sub.icon}</span>)}
                    {catName(sub)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Video grid */}
          <div className="mt-8">
            {filteredVideos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <GraduationCap size={40} className="text-[#2C3B38]" />
                <p className="text-[#86968B]">
                  {videos.length === 0 ? ac.emptyState : ac.library.noVideos}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVideos.map(video => {
                  const cat    = catMap.get(video.category_id)
                  const locked = isCatLocked(cat?.lock_type, snap)
                  return (
                    <VideoCard
                      key={video.id}
                      title={vidTitle(video)}
                      description={vidDesc(video)}
                      video={video}
                      completed={progressMap.get(video.id) ?? false}
                      locked={locked}
                      onPlay={() => openVideo(video)}
                      onLocked={showLockToast}
                      ac={ac}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── JOURNEY TAB ──────────────────────────────────────────────────── */}
      {tab === 'journey' && (
        <div className="flex flex-col gap-6">

          {/* Level-tier card */}
          <div
            className="rounded-xl border p-5 flex items-center gap-4"
            style={{ borderColor: `${tier.color}30`, backgroundColor: `${tier.color}08` }}
          >
            <div
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-center"
              style={{
                background: `linear-gradient(135deg, ${tier.color}25 0%, ${tier.color}08 100%)`,
                border:     `1px solid ${tier.color}40`,
              }}
            >
              <span className="text-2xl font-black leading-none" style={{ color: tier.color }}>{level}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${tier.color}80` }}>LV</span>
            </div>
            <div>
              <p className="text-lg font-bold text-[#F0EDE8]">{levelTierLabel}</p>
              <p className="text-sm mt-0.5" style={{ color: tier.color }}>
                {tier.icon} {ac.tiers[tier.key] ?? tier.key}
              </p>
              <p className="text-xs text-[#86968B] mt-1">
                {xp.toLocaleString()} {ac.journey.xp}
                {nextTier && <span className="mx-1">· {ac.journey.xpNeeded(nextTier.minXP - xp)}</span>}
              </p>
            </div>
          </div>

          {/* Tier progress bar */}
          {nextTier && (
            <div className="rounded-xl border border-[#2C3B38] bg-[#172530] p-4">
              <div className="flex justify-between text-xs text-[#86968B] mb-2">
                <span>{tier.icon} {ac.tiers[tier.key] ?? tier.key}</span>
                <span>{nextTier.icon} {ac.tiers[nextTier.key] ?? nextTier.key}</span>
              </div>
              <div className="h-2 rounded-full bg-[#101A26] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width:           `${Math.min(100, ((xp - tier.minXP) / (nextTier.minXP - tier.minXP)) * 100)}%`,
                    backgroundColor: tier.color,
                  }}
                />
              </div>
              <p className="text-right text-xs text-[#445147] mt-1.5">{xp} / {nextTier.minXP} XP</p>
            </div>
          )}

          {/* Recent XP Activity */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#F0EDE8]">{ac.journey.recentActivity}</h2>
            {recentEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center rounded-xl border border-dashed border-[#2C3B38]">
                <Star size={28} className="text-[#2C3B38]" />
                <p className="text-sm text-[#445147]">{ac.journey.noActivity}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {recentEvents.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl border border-[#2C3B38] bg-[#172530]/60 px-3 py-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#101A26] text-sm">
                      {event.icon}
                    </div>
                    <p className="flex-1 text-xs text-[#F0EDE8] truncate">{event.label}</p>
                    <span className="shrink-0 rounded-md bg-[#C8AA8F]/10 px-2 py-0.5 text-xs font-semibold text-[#C8AA8F]">
                      +{event.xp} XP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Milestones */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#F0EDE8]">{ac.journey.milestones}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {XP_MILESTONES.map(m => {
                const achieved = m.achieved(snap)
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                      achieved
                        ? 'border-[#C8AA8F]/30 bg-[#C8AA8F]/5'
                        : 'border-[#2C3B38] bg-[#172530] opacity-40'
                    }`}
                  >
                    <span className="text-2xl">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${achieved ? 'text-[#F0EDE8]' : 'text-[#86968B]'}`}>
                        {m.label[isHe ? 'he' : 'en']}
                      </p>
                      <p className="text-xs text-[#C8AA8F]">+{m.xp} XP</p>
                    </div>
                    {achieved
                      ? <CheckCircle2 size={16} className="shrink-0 text-[#C8AA8F]" />
                      : <Lock size={14} className="shrink-0 text-[#445147]" />
                    }
                  </div>
                )
              })}
            </div>
          </section>

          {/* Assignments */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-[#F0EDE8]">{ac.journey.assignments}</h2>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#2C3B38] px-5 py-10 text-center">
                <span className="text-3xl">📋</span>
                <div>
                  <p className="text-sm font-semibold text-[#86968B]">{ac.journey.comingSoon}</p>
                  <p className="mt-0.5 text-xs text-[#445147]">{ac.journey.noAssignments}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {tasks.map(task => {
                  const tb    = task.task_bank
                  const diff  = tb?.difficulty ?? 'easy'
                  const xpVal = TASK_XP[diff] ?? 25
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                        task.is_completed
                          ? 'border-[#2C3B38] bg-[#172530]/50 opacity-60'
                          : 'border-[#2C3B38] bg-[#172530]'
                      }`}
                    >
                      {task.is_completed
                        ? <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                        : <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#445147]" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F0EDE8] truncate">{tb?.title ?? '—'}</p>
                        {tb?.description && (
                          <p className="text-xs text-[#86968B] truncate">{tb.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${DIFF_STYLE[diff] ?? 'text-[#86968B] bg-[#2C3B38]'}`}>
                          {ac.journey.difficulty[diff] ?? diff}
                        </span>
                        <span className="text-xs text-[#C8AA8F]">+{xpVal} XP</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── VIDEO PLAYER MODAL ───────────────────────────────────────────── */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden bg-[#172530] border border-[#2C3B38] shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#2C3B38]">
              <p className="font-semibold text-[#F0EDE8] truncate">{vidTitle(playing)}</p>
              <button
                onClick={() => setPlay(null)}
                className="shrink-0 text-[#86968B] hover:text-[#F0EDE8] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video iframe */}
            <div className="aspect-video w-full bg-black">
              <iframe
                src={toEmbedUrl(playing.video_url)}
                className="h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-[#2C3B38]">
              {progressMap.get(playing.id) ? (
                /* Already completed state */
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">{ac.library.completed}</span>
                </div>
              ) : (
                /* Mark as Complete — prominent CTA */
                <div className="flex flex-col gap-2">
                  {vidDesc(playing) && (
                    <p className="text-xs text-[#86968B] truncate">{vidDesc(playing)}</p>
                  )}
                  <button
                    onClick={() => markComplete(playing.id, playing.xp_value)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] px-4 py-3 text-sm font-bold text-white transition-all"
                  >
                    <CheckCircle2 size={16} />
                    {ac.library.markDone}
                    {playing.xp_value > 0 && (
                      <span className="ml-1 rounded-md bg-white/20 px-2 py-0.5 text-xs font-black">
                        +{playing.xp_value} XP
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFETTI ─────────────────────────────────────────────────────── */}
      <ConfettiBurst active={confettiActive} />

      {/* ── LOCK TOAST ───────────────────────────────────────────────────── */}
      {lockToastVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-[#C8AA8F]/30 bg-[#172530] px-5 py-3 shadow-xl">
          <Lock size={14} className="shrink-0 text-[#C8AA8F]" />
          <p className="text-sm text-[#F0EDE8] whitespace-nowrap">{ac.unlock.lockedToast}</p>
        </div>
      )}
    </div>
  )
}

// ── VideoCard ─────────────────────────────────────────────────────────────────

interface VideoCardProps {
  video:          VodVideo
  title:          string
  description:    string | null | undefined
  completed:      boolean
  locked:         boolean
  onPlay:         () => void
  onLocked:       () => void
  reasonText?:    string
  ac:             T['academy']
}

function VideoCard({
  video, title, description, completed, locked,
  onPlay, onLocked, reasonText, ac,
}: VideoCardProps) {
  const mins = video.duration_seconds ? Math.ceil(video.duration_seconds / 60) : null

  return (
    <div
      className={`group relative flex flex-col rounded-xl border bg-[#172530] overflow-hidden transition-all ${
        locked
          ? 'border-[#2C3B38] opacity-60 cursor-default'
          : completed
          ? 'border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer'
          : 'border-[#2C3B38] hover:border-[#C8AA8F]/40 cursor-pointer'
      }`}
      onClick={locked ? onLocked : onPlay}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full bg-[#101A26] flex items-center justify-center overflow-hidden">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <GraduationCap size={32} className="text-[#2C3B38]" />
        )}

        {/* Hover play overlay */}
        {!locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/45 transition-all">
            <div className="opacity-0 group-hover:opacity-100 flex h-12 w-12 items-center justify-center rounded-full bg-[#C8AA8F]/90 transition-opacity">
              <Play size={20} className="text-[#101A26]" style={{ marginInlineStart: '2px' }} />
            </div>
          </div>
        )}

        {/* Lock overlay */}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/65">
            <Lock size={22} className="text-[#C8AA8F]" />
            <span className="text-[10px] font-bold text-[#C8AA8F] uppercase tracking-wider">
              {ac.library.locked}
            </span>
          </div>
        )}

        {/* Completed badge */}
        {completed && !locked && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white shadow">
            <CheckCircle2 size={11} />
            {ac.library.completed}
          </div>
        )}

        {/* Duration */}
        {mins && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-white">
            <Clock size={10} />
            {ac.library.minutes(mins)}
          </div>
        )}

        {/* XP badge */}
        {video.xp_value > 0 && !locked && (
          <div className="absolute top-2 left-2 flex items-center gap-0.5 rounded-md bg-[#C8AA8F]/90 px-1.5 py-0.5 text-xs font-bold text-[#101A26]">
            +{video.xp_value} XP
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1 p-3">
        <p className="text-sm font-medium text-[#F0EDE8] line-clamp-2">{title}</p>
        {description && (
          <p className="text-xs text-[#86968B] line-clamp-2">{description}</p>
        )}
        {reasonText && (
          <p className="mt-1 text-xs text-[#C8AA8F] italic">{reasonText}</p>
        )}
        {completed && !locked && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 size={10} />
            <span>{ac.library.completed}</span>
          </div>
        )}
      </div>
    </div>
  )
}
