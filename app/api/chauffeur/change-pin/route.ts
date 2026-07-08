import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const store = await cookies()
  const session = store.get('tfs_driver')?.value
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const [driverId, token] = session.split(':')
  if (!driverId || !token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const { data: driver } = await admin
    .from('drivers')
    .select('id, pin_code, session_expires_at')
    .eq('id', driverId)
    .eq('session_token', token)
    .single()

  if (!driver) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (driver.session_expires_at && new Date(driver.session_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { current_pin, new_pin } = body

  if (!current_pin?.trim() || !new_pin?.trim()) {
    return NextResponse.json({ error: 'PIN actuel et nouveau PIN requis' }, { status: 400 })
  }

  if (driver.pin_code !== current_pin.trim()) {
    return NextResponse.json({ error: 'PIN actuel incorrect' }, { status: 400 })
  }

  const newPin = new_pin.trim()
  if (!/^\d{4}$/.test(newPin)) {
    return NextResponse.json({ error: 'Le nouveau PIN doit contenir exactement 4 chiffres' }, { status: 400 })
  }

  await admin
    .from('drivers')
    .update({ pin_code: newPin })
    .eq('id', driverId)

  return NextResponse.json({ ok: true })
}
