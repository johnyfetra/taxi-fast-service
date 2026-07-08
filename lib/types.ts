export type ServiceType = 'taxi' | 'colis' | 'courses'

export type OrderStatus =
  | 'client_accepted'
  | 'client_countered'
  | 'confirmed'
  | 'in_progress'
  | 'done'
  | 'cancelled'

export interface Coords {
  lat: number
  lng: number
}

export interface Location {
  label: string
  lat: number
  lng: number
  geolocated?: boolean
}

export interface PricingRule {
  service: ServiceType
  base_price: number
  price_per_km: number
  min_price: number
  extras: Record<string, number>
}

export interface Order {
  id: string
  service: ServiceType
  customer_name: string
  customer_phone: string
  pickup: Location | null
  dropoff: Location | null
  distance_km: number | null
  duration_min: number | null
  price_offered: number | null
  counter_offer: number | null
  details: {
    size?: 'petit' | 'moyen' | 'grand'
    quantity?: number
    description?: string
    quartier?: string
  }
  status: OrderStatus
  created_at: string
}

export interface EstimateResult {
  distance_km: number | null
  duration_min: number | null
  price: number | null
  fallback: boolean
  label?: string
}
