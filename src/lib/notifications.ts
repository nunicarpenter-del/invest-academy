import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationType = 'meeting_reminder' | 'engagement_nudge' | 'welcome' | 'upgrade_prompt'
export type NotificationChannel = 'email' | 'whatsapp' | 'in_app'

/**
 * Insert a notification record into the DB.
 * Always succeeds from the caller's perspective; errors are thrown.
 */
export async function createNotificationRecord(
  supabase: SupabaseClient,
  userId: string,
  type: NotificationType,
  message: string,
  channel: NotificationChannel,
  triggeredBy: 'system' | 'admin' = 'admin',
): Promise<void> {
  const { error } = await supabase.from('notification_log').insert({
    user_id:      userId,
    type,
    message,
    channel,
    triggered_by: triggeredBy,
    status:       'pending',
  })
  if (error) throw error
}

/**
 * Placeholder for external delivery (Twilio / SendGrid).
 * TODO: Replace stubs with real API calls when credentials are added.
 *
 * WhatsApp via Twilio:
 *   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
 *   await client.messages.create({
 *     from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_FROM,
 *     to:   'whatsapp:' + recipient,
 *     body: message,
 *   })
 *
 * Email via SendGrid:
 *   const sgMail = require('@sendgrid/mail')
 *   sgMail.setApiKey(process.env.SENDGRID_API_KEY)
 *   await sgMail.send({
 *     to:      recipient,
 *     from:    process.env.SENDGRID_FROM_EMAIL,
 *     subject: 'InvestAcademy',
 *     text:    message,
 *   })
 */
export async function sendExternalNotification(
  channel: 'email' | 'whatsapp',
  recipient: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  // Stub — log to console until real credentials are wired up
  console.log(`[notifications] channel=${channel} recipient=${recipient} message=${message}`)
  return { success: true }
}
