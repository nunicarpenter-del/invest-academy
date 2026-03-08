/**
 * Google Calendar API helpers — uses REST directly (no googleapis package).
 *
 * Required environment variables:
 *   GOOGLE_CLIENT_ID       – OAuth2 Client ID from Google Cloud Console
 *   GOOGLE_CLIENT_SECRET   – OAuth2 Client Secret
 *   NEXT_PUBLIC_APP_URL    – e.g. http://localhost:3000 (no trailing slash)
 *
 * Redirect URI must be added in Google Cloud Console:
 *   {NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback
 */

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL  ?? ''
const REDIRECT_URI  = `${APP_URL}/api/auth/google-calendar/callback`

export const GCAL_SCOPES = ['https://www.googleapis.com/auth/calendar.events']

// ── OAuth2 ────────────────────────────────────────────────────────────────────

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         GCAL_SCOPES.join(' '),
    access_type:   'offline',
    prompt:        'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export interface TokenResponse {
  access_token:  string
  refresh_token?: string
  expires_in:    number
  token_type:    string
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${err}`)
  }
  return res.json()
}

// ── Calendar Events ───────────────────────────────────────────────────────────

export interface CalendarEvent {
  id?:          string
  summary:      string
  description?: string
  location?:    string
  start: { dateTime: string; timeZone?: string }
  end:   { dateTime: string; timeZone?: string }
}

async function calendarFetch(
  path: string,
  method: string,
  accessToken: string,
  body?: object
): Promise<Response> {
  return fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ id: string }> {
  const res = await calendarFetch('/calendars/primary/events', 'POST', accessToken, event)
  if (!res.ok) throw new Error(`Create event failed: ${await res.text()}`)
  return res.json()
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEvent
): Promise<void> {
  const res = await calendarFetch(`/calendars/primary/events/${eventId}`, 'PUT', accessToken, event)
  if (!res.ok) throw new Error(`Update event failed: ${await res.text()}`)
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await calendarFetch(`/calendars/primary/events/${eventId}`, 'DELETE', accessToken)
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Delete event failed: ${await res.text()}`)
  }
}

// ── Token freshness ───────────────────────────────────────────────────────────

/** Returns true if the token expires within the next 5 minutes */
export function isTokenExpired(expiryDate: number | null): boolean {
  if (!expiryDate) return true
  return Date.now() > expiryDate - 5 * 60 * 1000
}
