import { NextRequest, NextResponse } from 'next/server'
import { EstimateSchema } from '@/lib/validation'
import { getRoute } from '@/lib/osrm'
import { calculatePrice, calculateDuration } from '@/lib/pricing'
import { createAdminClient } from '@/lib/supabase/admin'
import type { PricingRule } from '@/lib/types'

// Used when Supabase is not configured
const FALLBACK_RULES: Record<string, PricingRule> = {
  taxi: { service: 'taxi', base_price: 3000, price_per_km: 1500, min_price: 5000, extras: {} },
  colis: { service: 'colis', base_price: 2000, price_per_km: 1200, min_price: 4000, extras: { moyen: 2000, grand: 5000 } },
}

async function getPricingRule(service: string): Promise<PricingRule | null> {
  const supabase = createAdminClient()
  if (supabase) {
    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('service', service)
      .single()
    if (!error && data) return data as PricingRule
    console.error('[estimate] pricing_rules fetch error:', error)
  }
  return FALLBACK_RULES[service] ?? null
}

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const parsed = EstimateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { service, pickup, dropoff, details } = parsed.data

  if (service === 'courses') {
    return NextResponse.json({
      label: 'Prix sur devis',
      price: null,
      distance_km: null,
      duration_min: null,
      fallback: false,
    })
  }

  try {
    const route = await getRoute(pickup, dropoff)
    const rule = await getPricingRule(service)

    if (!rule) {
      return NextResponse.json(
        { error: 'Tarifs non disponibles, veuillez réessayer' },
        { status: 500 }
      )
    }

    const priceResult = calculatePrice(rule, {
      service,
      distance_km: route.distance_km,
      details,
    })

    const duration_min = calculateDuration(route.distance_km)

    return NextResponse.json({
      distance_km: route.distance_km,
      duration_min,
      price: priceResult.price,
      fallback: route.fallback,
      geometry: route.geometry,
      min_price: rule.min_price,
      price_per_km: rule.price_per_km,
    })
  } catch (err) {
    console.error('[estimate] unexpected error:', err)
    return NextResponse.json(
      { error: 'Erreur de calcul, veuillez réessayer' },
      { status: 500 }
    )
  }
}
