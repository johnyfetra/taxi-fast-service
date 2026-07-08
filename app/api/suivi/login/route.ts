import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const { phone, code } = body

  if (!phone?.trim() || !code?.trim()) {
    return NextResponse.json({ error: 'Téléphone et code requis' }, { status: 400 })
  }

  const normalized = phone.trim().replace(/\s/g, '')

  const { data: accounts } = await admin
    .from('customer_accounts')
    .select('phone, access_code')
    .or(`phone.eq.${phone.trim()},phone.eq.${normalized}`)
    .limit(3)

  const account = accounts?.find(a => {
    const ap = a.phone.replace(/\s/g, '')
    return ap === normalized && a.access_code === code.trim()
  })

  if (!account) {
    return NextResponse.json({ error: 'Téléphone ou code incorrect' }, { status: 401 })
  }

  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  await admin
    .from('customer_accounts')
    .update({ session_token: token, session_expires_at: expires })
    .eq('phone', account.phone)

  const res = NextResponse.json({ ok: true })
  res.cookies.set('tfs_client', `${account.phone}:${token}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
