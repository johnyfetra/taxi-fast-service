import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { LocationSchema } from '@/lib/validation'
import { createAdminClient } from '@/lib/supabase/admin'

const CancelSchema = z.object({
  service: z.enum(['taxi', 'colis', 'courses']),
  pickup: LocationSchema,
  dropoff: LocationSchema.optional(),
  price_offered: z.number().nullable().optional(),
  cancellation_reason: z.string().min(1).max(200),
})

function mockUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const parsed = CancelSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
  }

  const { service, pickup, dropoff, price_offered, cancellation_reason } = parsed.data

  const supabase = createAdminClient()
  if (!supabase) {
    const id = mockUuid()
    console.warn('[cancel] Supabase non configuré — raison:', cancellation_reason)
    return NextResponse.json({ id })
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      service,
      customer_name: '—',
      customer_phone: '—',
      pickup,
      dropoff: dropoff ?? null,
      price_offered: price_offered ?? null,
      cancellation_reason,
      status: 'client_cancelled',
      details: {},
    })
    .select('id')
    .single()

  if (error || !order) {
    console.error('[cancel] insert error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
  }

  return NextResponse.json({ id: order.id })
}
