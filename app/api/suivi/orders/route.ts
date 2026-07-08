import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function verifySession(): Promise<string | null> {
  const store = await cookies()
  const session = store.get('tfs_client')?.value
  if (!session) return null

  const [phone, token] = session.split(':')
  if (!phone || !token) return null

  const admin = createAdminClient()
  if (!admin) return null

  const { data } = await admin
    .from('customer_accounts')
    .select('phone, session_expires_at')
    .eq('phone', phone)
    .eq('session_token', token)
    .single()

  if (!data) return null
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) return null

  return phone
}

export async function GET() {
  const phone = await verifySession()
  if (!phone) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const { data: orders, error } = await admin
    .from('orders')
    .select('id, service, pickup, dropoff, price_offered, distance_km, duration_min, status, driver_status, driver_id, created_at, details')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolve driver names
  const driverIds = [...new Set((orders ?? []).map(o => o.driver_id).filter(Boolean))] as string[]
  let driverMap: Record<string, string> = {}
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from('drivers')
      .select('id, name')
      .in('id', driverIds)
    drivers?.forEach(d => { driverMap[d.id] = d.name })
  }

  const enriched = (orders ?? []).map(o => ({
    ...o,
    driver_name: o.driver_id ? (driverMap[o.driver_id] ?? null) : null,
  }))

  return NextResponse.json({ phone, orders: enriched })
}
