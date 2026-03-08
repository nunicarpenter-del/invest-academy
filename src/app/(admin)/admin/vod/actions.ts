'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface VideoInput {
  category_id:      string
  title_he:         string
  title_en?:        string
  video_url?:       string
  thumbnail_url?:   string
  duration_seconds?: number
  xp_value:         number
  display_order:    number
  description_he?:  string
  description_en?:  string
}

export async function addVideo(input: VideoInput) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('vod_videos').insert({ ...input, is_published: true })
  if (error) throw error
  revalidatePath('/admin/vod')
}

export async function updateVideo(id: string, input: Partial<VideoInput>) {
  const supabase = createAdminClient()
  const payload = { ...input }
  if (!payload.video_url) delete payload.video_url
  const { error } = await supabase.from('vod_videos').update(payload).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/vod')
}

export async function togglePublished(id: string, is_published: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('vod_videos').update({ is_published }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/vod')
}

export async function deleteVideo(id: string) {
  const supabase = createAdminClient()
  // Remove progress records first to avoid FK constraint
  await supabase.from('user_vod_progress').delete().eq('video_id', id)
  const { error } = await supabase.from('vod_videos').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/vod')
}
