import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notifyAdminAll, notifyClientAll } from '@/lib/notify'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { driver_id } = body

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .update({
      driver_id: driver_id ?? null,
      driver_status: driver_id ? 'assigné' : null,
    })
    .eq('id', id)
    .select('id, driver_id, driver_status')
    .single()

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

  if (!driver_id) {
    // Unassigning — free up previous driver if any
    const { data: prev } = await admin.from('orders').select('driver_id').eq('id', id).single()
    if (prev?.driver_id) await admin.from('drivers').update({ status: 'disponible' }).eq('id', prev.driver_id)
  } else {
    // Fetch order + driver details for notifications
    const [{ data: fullOrder }, { data: driverData }] = await Promise.all([
      admin.from('orders').select('customer_name, customer_phone, service').eq('id', id).single(),
      admin.from('drivers').select('name').eq('id', driver_id).single(),
    ])
    if (fullOrder && driverData) {
      const svc = fullOrder.service === 'taxi' ? 'Taxi-moto' : fullOrder.service === 'colis' ? 'Colis' : 'Courses'
      const shortId = id.slice(0, 8)
      notifyAdminAll(
        `👤 Conducteur assigné`,
        `${driverData.name} → ${svc} · ${fullOrder.customer_name} #${shortId}`,
        id,
      ).catch(() => {})
      notifyClientAll(
        fullOrder.customer_phone,
        `🛵 Conducteur assigné`,
        `${driverData.name} prend en charge votre commande #${shortId}. Il vous contactera bientôt.`,
        id,
      ).catch(() => {})
    }
  }

  return NextResponse.json(order)
}
