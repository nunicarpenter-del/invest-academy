'use client'

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface VideoProgress {
  video_id:  string
  completed: boolean
}

interface Options {
  initialProgress: VideoProgress[]
  initialVideoXP:  number
  userId:          string
}

export interface UseAcademyDataReturn {
  /** Live map of video_id → completed (optimistically updated) */
  progressMap:         Map<string, boolean>
  /** Current video-earned XP (optimistically updated) */
  videoXP:             number
  /** Mark a video complete — idempotent, optimistic, rolls back on error */
  handleVideoComplete: (videoId: string, xpValue: number) => Promise<void>
  /** True while a Supabase write is in flight */
  isPending:           boolean
}

/**
 * Manages Academy progress and XP on the client side.
 *
 * Strategy:
 *  1. Initialise from server-rendered props (zero round-trips on first load).
 *  2. On handleVideoComplete: optimistic update → parallel Supabase writes.
 *  3. If either write fails: rollback to previous state.
 *  4. In-flight ref prevents duplicate submissions for the same video.
 */
export function useAcademyData({
  initialProgress,
  initialVideoXP,
  userId,
}: Options): UseAcademyDataReturn {
  const [progressMap, setProgressMap] = useState<Map<string, boolean>>(
    () => new Map(initialProgress.map(p => [p.video_id, p.completed])),
  )
  const [videoXP, setVideoXP]     = useState(initialVideoXP)
  const [isPending, setIsPending] = useState(false)

  // Tracks video IDs currently being written to Supabase
  const inFlight = useRef(new Set<string>())

  const handleVideoComplete = useCallback(
    async (videoId: string, xpValue: number) => {
      // Guard 1 — already marked complete
      if (progressMap.get(videoId) === true) return
      // Guard 2 — request already in flight for this video
      if (inFlight.current.has(videoId)) return

      inFlight.current.add(videoId)

      // ── Optimistic update ───────────────────────────────────────────────
      setProgressMap(prev => new Map(prev).set(videoId, true))
      setVideoXP(prev => prev + xpValue)
      setIsPending(true)

      const supabase = createClient()

      try {
        // Write both tables in parallel
        const [{ error: progressError }, { error: xpError }] = await Promise.all([
          supabase.from('user_vod_progress').upsert(
            { user_id: userId, video_id: videoId, completed: true, xp_awarded: true },
            { onConflict: 'user_id,video_id' },
          ),
          supabase.from('user_xp_events').insert({
            user_id:    userId,
            event_type: 'video_completed',
            ref_id:     videoId,
            xp_amount:  xpValue,
          }),
        ])

        if (progressError || xpError) throw progressError ?? xpError
      } catch {
        // ── Rollback on any error ─────────────────────────────────────────
        setProgressMap(prev => {
          const next = new Map(prev)
          next.delete(videoId)
          return next
        })
        setVideoXP(prev => prev - xpValue)
      } finally {
        inFlight.current.delete(videoId)
        setIsPending(false)
      }
    },
    [progressMap, userId],
  )

  return { progressMap, videoXP, handleVideoComplete, isPending }
}
