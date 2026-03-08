'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function assignTask(userId: string, taskBankId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_tasks')
    .insert({ user_id: userId, task_id: taskBankId, is_completed: false })
  if (error) throw error
  revalidatePath('/admin/users')
}

export async function assignAgent(userId: string, agentId: string | null) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ agent_id: agentId })
    .eq('id', userId)
  if (error) throw error
  revalidatePath('/admin/users')
}
