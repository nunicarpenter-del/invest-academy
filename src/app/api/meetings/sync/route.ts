import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  refreshAccessToken, isTokenExpired, type CalendarEvent,
} from '@/lib/google-calendar'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await req.json()
  const { meetingId, action } = body as { meetingId: string; action: 'create' | 'update' | 'delete' }

  // Get user's Google tokens
  const { data: tokenRow } = await supabase
    .from('google_calendar_tokens')
    .select('access_token, refresh_token, expiry_date')
    .eq('user_id', user.id)
    .single()

  if (!tokenRow) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
  }

  // Refresh token if expired
  let accessToken = tokenRow.access_token
  if (isTokenExpired(tokenRow.expiry_date)) {
    if (!tokenRow.refresh_token) {
      return NextResponse.json({ error: 'Token expired, please reconnect Google Calendar' }, { status: 401 })
    }
    try {
      const refreshed  = await refreshAccessToken(tokenRow.refresh_token)
      accessToken      = refreshed.access_token
      const newExpiry  = Date.now() + refreshed.expires_in * 1000
      await supabase.from('google_calendar_tokens').update({
        access_token: refreshed.access_token,
        expiry_date:  newExpiry,
        updated_at:   new Date().toISOString(),
      }).eq('user_id', user.id)
    } catch {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 401 })
    }
  }

  // Get meeting details
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, title, meeting_type, meeting_format, date_time, location, notes, google_event_id')
    .eq('id', meetingId)
    .eq('user_id', user.id)
    .single()

  if (!meeting && action !== 'delete') {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
  }

  try {
    if (action === 'delete') {
      const { data: meetingForDelete } = await supabase
        .from('meetings')
        .select('google_event_id')
        .eq('id', meetingId)
        .eq('user_id', user.id)
        .single()

      if (meetingForDelete?.google_event_id) {
        await deleteCalendarEvent(accessToken, meetingForDelete.google_event_id)
        await supabase.from('meetings').update({ google_event_id: null }).eq('id', meetingId)
      }
      return NextResponse.json({ ok: true })
    }

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Build event end time (+1 hour from start)
    const startDt  = new Date(meeting.date_time)
    const endDt    = new Date(startDt.getTime() + 60 * 60 * 1000)
    const tz       = Intl.DateTimeFormat().resolvedOptions().timeZone

    const calEvent: CalendarEvent = {
      summary:     meeting.title,
      description: [
        meeting.notes ?? '',
        meeting.meeting_format === 'zoom' ? '📹 Zoom Meeting' : '🏢 Frontal Meeting',
      ].filter(Boolean).join('\n'),
      location:    meeting.location ?? undefined,
      start: { dateTime: startDt.toISOString(), timeZone: tz },
      end:   { dateTime: endDt.toISOString(),   timeZone: tz },
    }

    if (action === 'create' || !meeting.google_event_id) {
      const created = await createCalendarEvent(accessToken, calEvent)
      await supabase.from('meetings').update({ google_event_id: created.id }).eq('id', meetingId)
      return NextResponse.json({ ok: true, google_event_id: created.id })
    } else {
      await updateCalendarEvent(accessToken, meeting.google_event_id, calEvent)
      return NextResponse.json({ ok: true })
    }
  } catch (err) {
    console.error('[meetings/sync]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
