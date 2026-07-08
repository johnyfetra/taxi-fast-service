import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function POST(_req: NextRequest) {
  const store = await cookies()
  const session = store.get('tfs_driver')?.value
  if (session) {
    const [driverId] = session.split(':')
    const admin = createAdminClient()
    if (admin && driverId) {
      await admin.from('drivers').update({ session_token: null, session_expires_at: null }).eq('id', driverId)
    }
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('tfs_driver', '', { maxAge: 0, path: '/' })
  return res
}
