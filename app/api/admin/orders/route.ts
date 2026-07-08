import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const driver_id = searchParams.get('driver_id')

  let query = admin
    .from('orders')
    .select('id, service, customer_name, customer_phone, pickup, dropoff, price_offered, distance_km, duration_min, status, driver_id, driver_status, created_at')
    .order('created_at', { ascending: false })

  if (driver_id) query = query.eq('driver_id', driver_id)

  const { data, error } = await query.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
