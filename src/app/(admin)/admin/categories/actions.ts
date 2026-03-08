'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface CategoryInput {
  slug:          string
  name_he:       string
  name_en?:      string
  parent_id?:    string | null
  icon?:         string
  lock_type?:    string | null
  display_order: number
}

export async function addCategory(input: CategoryInput) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('vod_categories').insert({ ...input, is_active: true })
  if (error) throw error
  revalidatePath('/admin/categories')
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('vod_categories').update(input).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/categories')
}

export async function toggleCategoryActive(id: string, is_active: boolean) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('vod_categories').update({ is_active }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/categories')
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient()
  // Check for child categories or videos first
  const [{ count: childCount }, { count: videoCount }] = await Promise.all([
    supabase.from('vod_categories').select('*', { count: 'exact', head: true }).eq('parent_id', id),
    supabase.from('vod_videos').select('*', { count: 'exact', head: true }).eq('category_id', id),
  ])
  if ((childCount ?? 0) > 0) throw new Error('לא ניתן למחוק קטגוריה עם תת-קטגוריות.')
  if ((videoCount ?? 0) > 0) throw new Error('לא ניתן למחוק קטגוריה שיש בה סרטונים.')

  const { error } = await supabase.from('vod_categories').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/categories')
}
