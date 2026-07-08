import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const { order_ids, driver_id } = body

  if (!Array.isArray(order_ids) || order_ids.length === 0) {
    return NextResponse.json({ error: 'order_ids requis' }, { status: 400 })
  }

  if (!driver_id) {
    return NextResponse.json({ error: 'driver_id requis' }, { status: 400 })
  }

  const { error } = await admin
    .from('orders')
    .update({ driver_id, driver_status: 'assigné' })
    .in('id', order_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, assigned: order_ids.length })
}
