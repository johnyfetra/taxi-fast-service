import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const { phone, pin } = body

  if (!phone?.trim() || !pin?.trim()) {
    return NextResponse.json({ error: 'Téléphone et PIN requis' }, { status: 400 })
  }

  // Normalize phone: remove spaces
  const normalizedPhone = phone.trim().replace(/\s/g, '')

  const { data: drivers } = await admin
    .from('drivers')
    .select('id, name, phone, pin_code, type, status')
    .or(`phone.eq.${phone.trim()},phone.eq.${normalizedPhone}`)
    .limit(5)

  const driver = drivers?.find(d => {
    const dp = d.phone.replace(/\s/g, '')
    const qp = normalizedPhone
    return dp === qp && d.pin_code === pin.trim()
  })

  if (!driver) {
    return NextResponse.json({ error: 'Téléphone ou PIN incorrect' }, { status: 401 })
  }

  // Generate session token
  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await admin
    .from('drivers')
    .update({ session_token: token, session_expires_at: expires })
    .eq('id', driver.id)

  const res = NextResponse.json({ ok: true, driver: { id: driver.id, name: driver.name, type: driver.type, status: driver.status } })
  res.cookies.set('tfs_driver', `${driver.id}:${token}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  })
  return res
}
