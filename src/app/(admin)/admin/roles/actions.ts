'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { matchesEmailPattern, validateEmailPattern } from '@/lib/admin-utils'
import { revalidatePath } from 'next/cache'

export async function addRoleRule(pattern: string, role: string, description: string) {
  const validationError = validateEmailPattern(pattern)
  if (validationError) throw new Error(validationError)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('role_email_rules')
    .insert({ pattern: pattern.toLowerCase().trim(), role, description: description || null })
  if (error) throw error
  revalidatePath('/admin/roles')
}

export async function deleteRoleRule(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('role_email_rules').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/roles')
}

/**
 * Applies role rules to all registered users.
 *
 * Matching uses strict logic (matchesEmailPattern):
 *   - Exact email: "user@company.com" only matches that address
 *   - Domain suffix: "@company.com" matches any email at that domain
 *
 * Rules are evaluated in insertion order; the first match wins.
 * Paginates through all auth users to handle > 1000 accounts.
 */
export async function applyRulesToAll(): Promise<{ updated: number }> {
  const supabase = createAdminClient()

  const { data: rules } = await supabase
    .from('role_email_rules')
    .select('pattern, role')
    .order('created_at')

  if (!rules?.length) return { updated: 0 }

  // Paginate through all auth users
  let allUsers: { id: string; email?: string }[] = []
  let page = 1
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !users?.length) break
    allUsers = allUsers.concat(users)
    if (users.length < 1000) break
    page++
  }

  if (!allUsers.length) return { updated: 0 }

  let updated = 0
  for (const user of allUsers) {
    const email = (user.email ?? '').toLowerCase()
    const match = rules.find(r => matchesEmailPattern(email, r.pattern))
    if (!match) continue

    const { error } = await supabase
      .from('profiles')
      .update({ role: match.role })
      .eq('id', user.id)
    if (!error) updated++
  }

  revalidatePath('/admin/roles')
  revalidatePath('/admin/users')
  return { updated }
}

export async function setUserRole(userId: string, role: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
  revalidatePath('/admin/users')
  revalidatePath('/admin/roles')
}
