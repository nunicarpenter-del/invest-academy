import { createAdminClient } from '@/lib/supabase/admin'
import VodManagerClient from '@/components/admin/VodManagerClient'
import { AlertTriangle } from 'lucide-react'

export default async function AdminVodPage() {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (e) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-[#F0EDE8]">VOD Manager</h1>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-300">Admin client not configured</p>
              <p className="mt-2 rounded-lg bg-[#101A26] px-3 py-2 font-mono text-xs text-[#C8AA8F]">
                Add to <strong>.env.local</strong>:<br />
                SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
              </p>
              <p className="text-xs text-amber-400/60">Restart the dev server after saving.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const results = await Promise.allSettled([
    supabase
      .from('vod_videos')
      .select('id, category_id, title_he, title_en, duration_seconds, xp_value, display_order, is_published')
      .order('display_order'),
    supabase
      .from('vod_categories')
      .select('id, name_he, name_en, parent_id')
      .eq('is_active', true)
      .order('display_order'),
  ])

  const videos     = results[0].status === 'fulfilled' ? (results[0].value.data ?? []) : []
  const categories = results[1].status === 'fulfilled' ? (results[1].value.data ?? []) : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#F0EDE8]">VOD Manager</h1>
        <p className="mt-0.5 text-sm text-[#86968B]">
          {videos.length} video{videos.length !== 1 ? 's' : ''} across {categories.length} categories
        </p>
      </div>
      <VodManagerClient videos={videos} categories={categories} />
    </div>
  )
}
