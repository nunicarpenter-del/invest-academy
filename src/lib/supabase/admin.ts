import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses RLS.
 * Use only in Server Components, Route Handlers, and Server Actions.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Admin client is not configured. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL if missing) to .env.local, then restart the dev server.',
    )
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
