import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const store = await cookies()
  const session = store.get('tfs_client')?.value
  if (session) {
    const [phone] = session.split(':')
    if (phone) {
      const admin = createAdminClient()
      if (admin) {
        await admin
          .from('customer_accounts')
          .update({ session_token: null, session_expires_at: null })
          .eq('phone', phone)
      }
    }
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('tfs_client', '', { maxAge: 0, path: '/' })
  return res
}
