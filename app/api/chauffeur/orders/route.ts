import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function getDriverId(): Promise<string | null> {
  const store = await cookies()
  const session = store.get('tfs_driver')?.value
  if (!session) return null
  const [driverId, token] = session.split(':')
  if (!driverId || !token) return null

  const admin = createAdminClient()
  if (!admin) return null

  const { data } = await admin
    .from('drivers')
    .select('id, session_token, session_expires_at')
    .eq('id', driverId)
    .eq('session_token', token)
    .single()

  if (!data) return null
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) return null
  return driverId
}

export async function GET() {
  const driverId = await getDriverId()
  if (!driverId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('orders')
    .select('id, service, customer_name, customer_phone, pickup, dropoff, price_offered, distance_km, duration_min, details, status, driver_status, created_at')
    .eq('driver_id', driverId)
    .gte('created_at', today + 'T00:00:00Z')
    .lte('created_at', today + 'T23:59:59Z')
    .not('driver_status', 'in', '("rejeté","livré")')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also fetch all assigned orders (not just today, for history)
  const { data: history } = await admin
    .from('orders')
    .select('id, service, customer_name, driver_status, created_at')
    .eq('driver_id', driverId)
    .in('driver_status', ['rejeté', 'livré'])
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ orders: data ?? [], history: history ?? [] })
}
