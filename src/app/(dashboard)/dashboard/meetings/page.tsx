import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MeetingsClient, { type Meeting } from '@/components/dashboard/MeetingsClient'

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const gcalStatus = (params?.gcal as string) ?? null

  const [{ data: meetingsData }, { data: propertiesData }, { data: gcalToken }] = await Promise.all([
    supabase
      .from('meetings')
      .select('id, title, meeting_type, meeting_format, date_time, location, notes, related_property_id, google_event_id')
      .eq('user_id', user.id)
      .order('date_time', { ascending: true }),
    supabase
      .from('properties')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
    supabase
      .from('google_calendar_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .single(),
  ])

  return (
    <MeetingsClient
      initialMeetings={(meetingsData ?? []) as Meeting[]}
      properties={propertiesData ?? []}
      userId={user.id}
      gcalConnected={!!gcalToken}
      gcalStatus={gcalStatus}
    />
  )
}
