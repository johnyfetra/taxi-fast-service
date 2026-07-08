import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import type { DriverOrderStatus } from '@/lib/types'
import { notifyAdminAll, notifyClientAll } from '@/lib/notify'

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

const VALID_STATUSES: DriverOrderStatus[] = ['accepté', 'occupé', 'en_cours', 'livré', 'problème', 'rejeté']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const driverId = await getDriverId()
  if (!driverId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { driver_status } = body

  if (!VALID_STATUSES.includes(driver_status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  // Verify this order belongs to this driver (fetch full details for notifications)
  const { data: order } = await admin
    .from('orders')
    .select('id, driver_id, customer_name, customer_phone, service')
    .eq('id', id)
    .eq('driver_id', driverId)
    .single()

  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const updates: Record<string, unknown> = { driver_status }

  // Sync admin status
  if (driver_status === 'livré') {
    updates.status = 'done'
    updates.completed_at = new Date().toISOString()
    // Free up driver
    await admin.from('drivers').update({ status: 'disponible' }).eq('id', driverId)
  } else if (driver_status === 'rejeté' || driver_status === 'occupé') {
    updates.driver_id = null
    updates.driver_status = driver_status === 'occupé' ? 'occupé' : 'rejeté'
    await admin.from('drivers').update({ status: 'disponible' }).eq('id', driverId)
  } else if (driver_status === 'en_cours') {
    updates.status = 'in_progress'
  } else if (driver_status === 'accepté') {
    updates.status = 'confirmed'
    await admin.from('drivers').update({ status: 'en_course' }).eq('id', driverId)
  }

  const { data, error } = await admin
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select('id, driver_status, status')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch driver name for notifications
  const { data: driver } = await admin.from('drivers').select('name').eq('id', driverId).single()
  const driverName = driver?.name ?? 'Le conducteur'
  const svc = order.service === 'taxi' ? 'Taxi-moto' : order.service === 'colis' ? 'Colis' : 'Courses'
  const shortId = id.slice(0, 8)

  const NOTIFS: Partial<Record<DriverOrderStatus, { admin: string; client?: string }>> = {
    accepté:  { admin: `✅ ${driverName} a accepté · ${svc} · ${order.customer_name}`, client: `✅ Votre conducteur ${driverName} a accepté votre commande #${shortId}.` },
    en_cours: { admin: `🚗 ${driverName} est en route · ${order.customer_name}`,       client: `🚗 ${driverName} est en route vers vous !` },
    livré:    { admin: `📦 Livré par ${driverName} · ${order.customer_name}`,           client: `📦 Votre commande #${shortId} a été livrée. Merci !` },
    problème: { admin: `⚠️ Problème signalé par ${driverName} · ${order.customer_name}`, client: `⚠️ Un problème a été signalé sur votre commande. Nous vous contactons.` },
    rejeté:   { admin: `❌ ${driverName} a rejeté · ${svc} · ${order.customer_name}` },
    occupé:   { admin: `🔄 ${driverName} était occupé · réassignation requise · ${order.customer_name}` },
  }

  const notif = NOTIFS[driver_status as DriverOrderStatus]
  if (notif) {
    notifyAdminAll(notif.admin, `#${shortId}`, id).catch(() => {})
    if (notif.client) {
      notifyClientAll(order.customer_phone, notif.client, `#${shortId}`, id).catch(() => {})
    }
  }

  return NextResponse.json(data)
}
