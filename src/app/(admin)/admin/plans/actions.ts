'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createNotificationRecord, sendExternalNotification } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'

export async function upsertServicePlan(data: {
  id?: string
  user_id: string
  plan_name: string
  total_sessions: number
  start_date: string
  end_date?: string | null
  notes?: string | null
}) {
  const supabase = createAdminClient()

  if (data.id) {
    const { error } = await supabase
      .from('service_plans')
      .update({
        plan_name:      data.plan_name,
        total_sessions: data.total_sessions,
        start_date:     data.start_date,
        end_date:       data.end_date ?? null,
        notes:          data.notes ?? null,
        is_active:      true,
      })
      .eq('id', data.id)
    if (error) throw error
  } else {
    // Deactivate any previous active plan for this user
    await supabase
      .from('service_plans')
      .update({ is_active: false })
      .eq('user_id', data.user_id)
      .eq('is_active', true)

    const { error } = await supabase.from('service_plans').insert({
      user_id:        data.user_id,
      plan_name:      data.plan_name,
      total_sessions: data.total_sessions,
      start_date:     data.start_date,
      end_date:       data.end_date ?? null,
      notes:          data.notes ?? null,
      is_active:      true,
    })
    if (error) throw error
  }

  revalidatePath('/admin/plans')
}

export async function sendNotificationAction(data: {
  user_id:   string
  recipient: string   // email or phone
  type:      'meeting_reminder' | 'engagement_nudge' | 'welcome' | 'upgrade_prompt'
  message:   string
  channel:   'email' | 'whatsapp' | 'in_app'
}) {
  const supabase = createAdminClient()

  await createNotificationRecord(supabase, data.user_id, data.type, data.message, data.channel, 'admin')

  if (data.channel === 'email' || data.channel === 'whatsapp') {
    await sendExternalNotification(data.channel, data.recipient, data.message)
  }

  // Mark the notification as sent
  await supabase
    .from('notification_log')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('user_id', data.user_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  revalidatePath('/admin/plans')
}
