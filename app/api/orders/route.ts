import { NextRequest, NextResponse } from 'next/server'
import { OrderSchema } from '@/lib/validation'
import { checkRateLimit } from '@/lib/rateLimit'
import { getRoute } from '@/lib/osrm'
import { calculatePrice, calculateDuration } from '@/lib/pricing'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdmin } from '@/lib/whatsapp'
import type { PricingRule } from '@/lib/types'

const FALLBACK_RULES: Record<string, PricingRule> = {
  taxi: { service: 'taxi', base_price: 3000, price_per_km: 1500, min_price: 5000, extras: {} },
  colis: { service: 'colis', base_price: 2000, price_per_km: 1200, min_price: 4000, extras: { moyen: 2000, grand: 5000 } },
}

function mockUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = OrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Honeypot — réponse silencieuse
  if (data.honeypot !== '') {
    return NextResponse.json({ id: mockUuid() })
  }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Trop de demandes. Veuillez réessayer dans une heure.' },
      { status: 429 }
    )
  }

  let price_offered: number | null = null
  let distance_km: number | null = null
  let duration_min: number | null = null

  if (data.service !== 'courses' && data.dropoff) {
    try {
      const route = await getRoute(data.pickup, data.dropoff)
      const supabase = createAdminClient()
      let rule: PricingRule | null = null

      if (supabase) {
        const { data: dbRule, error } = await supabase
          .from('pricing_rules')
          .select('*')
          .eq('service', data.service)
          .single()
        if (!error && dbRule) rule = dbRule as PricingRule
      }
      rule ??= FALLBACK_RULES[data.service] ?? null

      if (rule) {
        const result = calculatePrice(rule, {
          service: data.service,
          distance_km: route.distance_km,
          details: data.details,
        })
        price_offered = result.price
        distance_km = route.distance_km
        duration_min = calculateDuration(route.distance_km)
      }
    } catch (err) {
      console.error('[orders] pricing recalc error:', err)
    }
  }

  const counter_offer = data.decision.type === 'counter' ? data.decision.counter_offer : null
  const status = data.decision.type === 'accepted' ? 'client_accepted' : 'client_countered'

  const supabase = createAdminClient()

  if (!supabase) {
    // Dev mode : pas de Supabase configuré, on retourne un ID mock
    const id = mockUuid()
    console.warn('[orders] Supabase non configuré — commande non persistée. ID mock:', id)
    try {
      await notifyAdmin({
        id,
        service: data.service,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        pickupLabel: data.pickup.label,
        dropoffLabel: data.dropoff?.label ?? '',
        distanceKm: distance_km,
        durationMin: duration_min,
        priceOffered: price_offered,
        counterOffer: counter_offer,
      })
    } catch (e) {
      console.error('[orders] WhatsApp notification failed (non-fatal):', e)
    }
    return NextResponse.json({ id })
  }

  const { data: order, error: insertError } = await supabase
    .from('orders')
    .insert({
      service: data.service,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      pickup: data.pickup,
      dropoff: data.dropoff ?? null,
      distance_km,
      duration_min,
      price_offered,
      counter_offer,
      details: data.details ?? {},
      status,
    })
    .select('id')
    .single()

  if (insertError || !order) {
    console.error('[orders] insert error:', insertError)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande. Veuillez réessayer.' },
      { status: 500 }
    )
  }

  try {
    await notifyAdmin({
      id: order.id,
      service: data.service,
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      pickupLabel: data.pickup.label,
      dropoffLabel: data.dropoff?.label ?? '',
      distanceKm: distance_km,
      durationMin: duration_min,
      priceOffered: price_offered,
      counterOffer: counter_offer,
    })
  } catch (e) {
    console.error('[orders] WhatsApp notification failed (non-fatal):', e)
  }

  // Upsert customer tracking account (create only if phone not seen before)
  let access_code: string | null = null
  try {
    const { data: existing } = await supabase
      .from('customer_accounts')
      .select('access_code')
      .eq('phone', data.customer_phone)
      .single()
    if (existing?.access_code) {
      access_code = existing.access_code
    } else {
      access_code = Math.floor(100000 + Math.random() * 900000).toString()
      await supabase
        .from('customer_accounts')
        .insert({ phone: data.customer_phone, access_code })
    }
  } catch (e) {
    console.error('[orders] customer account upsert failed (non-fatal):', e)
  }

  return NextResponse.json({ id: order.id, access_code })
}
