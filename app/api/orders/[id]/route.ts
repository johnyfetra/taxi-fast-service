import { NextRequest, NextResponse } from 'next/server'
import { StatusUpdateSchema } from '@/lib/validation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdminAll, notifyClientAll } from '@/lib/notify'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 })
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = StatusUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const adminDb = createAdminClient()
  const orderInfo = adminDb
    ? (await adminDb.from('orders').select('customer_name, customer_phone, service, pickup').eq('id', id).single()).data
    : null

  const { data, error } = await supabase
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) {
    console.error('[orders/patch] update error:', error)
    return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 })
  }

  // Notifications (fire-and-forget)
  if (orderInfo) {
    const shortId = id.slice(0, 8)
    const svc = orderInfo.service === 'taxi' ? 'Taxi-moto' : orderInfo.service === 'colis' ? 'Colis' : 'Courses'

    if (parsed.data.status === 'confirmed') {
      notifyAdminAll(`✅ Commande confirmée`, `${svc} · ${orderInfo.customer_name}`, id).catch(() => {})
      notifyClientAll(orderInfo.customer_phone,
        `✅ Commande confirmée !`,
        `Votre ${svc.toLowerCase()} #${shortId} est confirmée. Un conducteur va être assigné.`,
        id,
      ).catch(() => {})
    } else if (parsed.data.status === 'in_progress') {
      notifyAdminAll(`🚗 En cours`, `${svc} · ${orderInfo.customer_name}`, id).catch(() => {})
      notifyClientAll(orderInfo.customer_phone,
        `🚗 Livraison en cours`,
        `Votre conducteur est en route pour votre ${svc.toLowerCase()}.`,
        id,
      ).catch(() => {})
    } else if (parsed.data.status === 'done') {
      notifyAdminAll(`📦 Livré`, `${svc} · ${orderInfo.customer_name}`, id).catch(() => {})
      notifyClientAll(orderInfo.customer_phone,
        `📦 Livré !`,
        `Votre commande #${shortId} a été livrée. Merci pour votre confiance.`,
        id,
      ).catch(() => {})
    }
  }

  return NextResponse.json(data)
}
