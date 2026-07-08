import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function SuiviAppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies()
  const session = store.get('tfs_client')?.value

  if (!session) redirect('/login')

  const [phone, token] = session.split(':')
  if (!phone || !token) redirect('/login')

  const admin = createAdminClient()
  if (!admin) redirect('/login')

  const { data: account } = await admin
    .from('customer_accounts')
    .select('phone, session_token, session_expires_at')
    .eq('phone', phone)
    .eq('session_token', token)
    .single()

  if (!account) redirect('/login')
  if (account.session_expires_at && new Date(account.session_expires_at) < new Date()) redirect('/login')

  return <>{children}</>
}
