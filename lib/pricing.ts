import type { PricingRule, ServiceType } from './types'

export interface PriceInput {
  service: ServiceType
  distance_km: number
  details?: {
    size?: 'petit' | 'moyen' | 'grand'
    quantity?: number
  }
}

export interface PriceResult {
  price: number
  breakdown: string
}

export function roundTo500(n: number): number {
  return Math.ceil(n / 500) * 500
}

export function calculateDuration(osrmSeconds: number): number {
  const minutes = (osrmSeconds / 60) * 1.5
  return Math.ceil(minutes / 5) * 5
}

export function calculatePrice(rule: PricingRule, input: PriceInput): PriceResult {
  if (input.service === 'courses') {
    return { price: rule.min_price, breakdown: 'Devis' }
  }

  const qty = input.details?.quantity ?? 1
  let extras = 0
  if (input.details?.size && input.details.size !== 'petit') {
    const extraPerUnit = rule.extras[input.details.size] ?? 0
    extras = extraPerUnit * qty
  }

  const raw = rule.base_price + input.distance_km * rule.price_per_km + extras
  const price = roundTo500(Math.max(rule.min_price, raw))

  const breakdown =
    `${rule.base_price} + ${input.distance_km.toFixed(1)}km × ${rule.price_per_km}` +
    (extras > 0 ? ` + extras ${extras}` : '') +
    ` = ${Math.round(raw)} → ${price}`

  return { price, breakdown }
}
