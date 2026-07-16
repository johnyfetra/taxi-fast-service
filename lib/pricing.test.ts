import { describe, it, expect } from 'vitest'
import { roundTo500, calculatePrice, calculateDuration } from './pricing'
import type { PricingRule } from './types'

const taxiRule: PricingRule = {
  service: 'taxi',
  base_price: 3000,
  price_per_km: 1500,
  min_price: 5000,
  extras: {},
}

const colisRule: PricingRule = {
  service: 'colis',
  base_price: 2000,
  price_per_km: 1200,
  min_price: 4000,
  extras: { moyen: 2000, grand: 5000 },
}

const coursesRule: PricingRule = {
  service: 'courses',
  base_price: 0,
  price_per_km: 0,
  min_price: 3000,
  extras: {},
}

describe('roundTo500', () => {
  it('multiple exact de 500 inchangé', () => expect(roundTo500(5000)).toBe(5000))
  it('arrondit au-dessus', () => expect(roundTo500(10300)).toBe(10500))
  it('1 Ar → 500', () => expect(roundTo500(1)).toBe(500))
  it('0 → 0', () => expect(roundTo500(0)).toBe(0))
})

describe('calculatePrice — taxi', () => {
  it('trajet court sous le minimum', () => {
    // 1km : 3000 + 1500 = 4500 < min 5000 → 5000
    const { price } = calculatePrice(taxiRule, { service: 'taxi', distance_km: 1 })
    expect(price).toBe(5000)
  })

  it('trajet normal 5km', () => {
    // 3000 + 5 × 1500 = 10500, déjà multiple de 500
    const { price } = calculatePrice(taxiRule, { service: 'taxi', distance_km: 5 })
    expect(price).toBe(10500)
  })

  it('arrondi aux 500', () => {
    // 4km : 3000 + 6000 = 9000, déjà ok
    const { price } = calculatePrice(taxiRule, { service: 'taxi', distance_km: 4.1 })
    // 3000 + 4.1 × 1500 = 3000 + 6150 = 9150 → arrondi à 9500
    expect(price).toBe(9500)
  })

  it('distance 0', () => {
    const { price } = calculatePrice(taxiRule, { service: 'taxi', distance_km: 0 })
    expect(price).toBe(5000) // min_price
  })
})

describe('calculatePrice — colis', () => {
  it('colis petit × 1 — pas d\'extra', () => {
    // 2000 + 3 × 1200 = 5600, arrondi = 6000
    const { price } = calculatePrice(colisRule, { service: 'colis', distance_km: 3, details: { size: 'petit', quantity: 1 } })
    expect(price).toBe(6000)
  })

  it('colis moyen × 1', () => {
    // 2000 + 3 × 1200 + 2000 = 7600 → 8000
    const { price } = calculatePrice(colisRule, { service: 'colis', distance_km: 3, details: { size: 'moyen', quantity: 1 } })
    expect(price).toBe(8000)
  })

  it('colis moyen × 3', () => {
    // 2000 + 3 × 1200 + 2000 × 3 = 3600 + 2000 + 6000 = 11600 → 12000
    const { price } = calculatePrice(colisRule, { service: 'colis', distance_km: 3, details: { size: 'moyen', quantity: 3 } })
    expect(price).toBe(12000)
  })

  it('colis grand × 1', () => {
    // 2000 + 3 × 1200 + 5000 = 10600 → 11000
    const { price } = calculatePrice(colisRule, { service: 'colis', distance_km: 3, details: { size: 'grand', quantity: 1 } })
    expect(price).toBe(11000)
  })
})

describe('calculatePrice — courses', () => {
  it('retourne toujours min_price', () => {
    const { price, breakdown } = calculatePrice(coursesRule, { service: 'courses', distance_km: 10 })
    expect(price).toBe(3000)
    expect(breakdown).toBe('Devis')
  })
})

describe('calculateDuration', () => {
  it('6.67km → 25 min', () => {
    // 6.67/20*60 = 20.01 → ceil(20.01/5)*5 = ceil(4.002)*5 = 25
    expect(calculateDuration(6.67)).toBe(25)
  })

  it('10km → 30 min', () => {
    // 10/20*60 = 30 → ceil(30/5)*5 = 30
    expect(calculateDuration(10)).toBe(30)
  })

  it('1km → 5 min minimum', () => {
    // 1/20*60 = 3 → ceil(3/5)*5 = 5
    expect(calculateDuration(1)).toBe(5)
  })

  it('31.4km → 95 min', () => {
    // 31.4/20*60 = 94.2 → ceil(94.2/5)*5 = 95
    expect(calculateDuration(31.4)).toBe(95)
  })
})
