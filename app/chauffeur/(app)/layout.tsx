import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function DriverAppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies()
  const session = store.get('tfs_driver')?.value

  if (!session) redirect('/login')

  const [driverId, token] = session.split(':')
  if (!driverId || !token) redirect('/login')

  const admin = createAdminClient()
  if (!admin) redirect('/login')

  const { data: driver } = await admin
    .from('drivers')
    .select('id, name, session_token, session_expires_at')
    .eq('id', driverId)
    .eq('session_token', token)
    .single()

  if (!driver) redirect('/login')
  if (driver.session_expires_at && new Date(driver.session_expires_at) < new Date()) redirect('/login')

  return <>{children}</>
}
