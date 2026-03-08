import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AcademyClient from '@/components/dashboard/AcademyClient'
import { TASK_XP, type UserSnapshot } from '@/lib/academy'

type RawTask = {
  id: string
  is_completed: boolean
  task_id: string
  task_bank: {
    title: string
    description: string | null
    difficulty: string | null
    category: string | null
  } | null
}

export default async function AcademyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: videosRaw },
    { data: categoriesRaw },
    { data: progressRaw },
    { data: xpEventsRaw },
    { data: liabilities },
    { data: investments },
    { data: properties },
    { data: pension },
    { data: meetings },
    { data: tasksRaw },
  ] = await Promise.all([
    // Published videos from new vod_videos table
    supabase
      .from('vod_videos')
      .select('id, title_he, title_en, description_he, description_en, video_url, thumbnail_url, duration_seconds, xp_value, display_order, category_id')
      .eq('is_published', true)
      .order('display_order'),

    // Full category tree
    supabase
      .from('vod_categories')
      .select('id, slug, name_he, name_en, parent_id, lock_type, icon, display_order')
      .eq('is_active', true)
      .order('display_order'),

    // Watch progress from new user_vod_progress table
    supabase
      .from('user_vod_progress')
      .select('video_id, completed')
      .eq('user_id', user.id),

    // Video XP already earned
    supabase
      .from('user_xp_events')
      .select('xp_amount')
      .eq('user_id', user.id)
      .eq('event_type', 'video_completed'),

    supabase.from('liabilities').select('id').eq('user_id', user.id),
    supabase.from('investments').select('id, asset_type').eq('user_id', user.id),
    supabase.from('properties').select('id').eq('user_id', user.id),
    supabase.from('pension_accounts').select('id').eq('user_id', user.id),
    supabase.from('meetings').select('id').eq('user_id', user.id),
    supabase
      .from('client_tasks')
      .select('id, is_completed, task_id, task_bank(title, description, difficulty, category)')
      .eq('user_id', user.id),
  ])

  const tasks = (tasksRaw ?? []) as unknown as RawTask[]
  const inv   = investments ?? []

  const completedTaskXP = tasks
    .filter(t => t.is_completed)
    .reduce((sum, t) => sum + (TASK_XP[t.task_bank?.difficulty ?? 'easy'] ?? 25), 0)

  const videoXP = (xpEventsRaw ?? []).reduce((sum, e) => sum + (e.xp_amount ?? 0), 0)

  const snap: UserSnapshot = {
    liabilityCount:   (liabilities ?? []).length,
    totalLiabilities: 0,
    stockCount:       inv.filter(i => ['stock', 'etf', 'fund'].includes(i.asset_type ?? '')).length,
    cryptoCount:      inv.filter(i => i.asset_type === 'crypto').length,
    propertyCount:    (properties ?? []).length,
    pensionCount:     (pension ?? []).length,
    meetingCount:     (meetings ?? []).length,
    completedTaskXP,
    videoXP,
    hasAnyAsset:
      (properties ?? []).length > 0 || inv.length > 0 || (pension ?? []).length > 0,
  }

  return (
    <AcademyClient
      videos={videosRaw ?? []}
      categories={categoriesRaw ?? []}
      progress={progressRaw ?? []}
      tasks={tasks}
      snap={snap}
      userId={user.id}
    />
  )
}
