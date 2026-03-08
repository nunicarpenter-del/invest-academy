import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminShell from '@/components/admin/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Strict guard — only admins may access /admin/*
  if (profile?.role !== 'admin') redirect('/dashboard')

  const displayName = profile.full_name ?? user.email?.split('@')[0] ?? 'Admin'

  return (
    <AdminShell userName={displayName}>
      {children}
    </AdminShell>
  )
}
