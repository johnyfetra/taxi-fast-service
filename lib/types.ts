export type ServiceType = 'taxi' | 'colis' | 'courses'

export type OrderStatus =
  | 'client_accepted'
  | 'client_countered'
  | 'client_cancelled'
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
    pickup_schedule?: 'now' | 'later'
    pickup_datetime?: string
  }
  status: OrderStatus
  cancellation_reason: string | null
  driver_id: string | null
  driver_status: DriverOrderStatus | null
  created_at: string
}

export interface GeoJsonLineString {
  type: 'LineString'
  coordinates: [number, number][]
}

export interface EstimateResult {
  distance_km: number | null
  duration_min: number | null
  price: number | null
  fallback: boolean
  label?: string
  geometry?: GeoJsonLineString | null
  min_price?: number | null
  price_per_km?: number | null
}

export type DriverStatus = 'disponible' | 'en_course' | 'hors_ligne'
export type DriverOrderStatus = 'assigné' | 'accepté' | 'occupé' | 'en_cours' | 'livré' | 'problème' | 'rejeté'

export interface Driver {
  id: string
  name: string
  phone: string
  type: 'moto' | 'velo'
  status: DriverStatus
  vehicle_id: string | null
  notes: string | null
  pin_code: string | null
  session_token: string | null
  session_expires_at: string | null
  created_at: string
  updated_at: string
}

export type VehicleStatus = 'disponible' | 'en_course' | 'maintenance' | 'hors_service'
export type VehicleType = 'moto' | 'velo'

export interface Vehicle {
  id: string
  type: VehicleType
  label: string
  plate: string | null
  status: VehicleStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  customer_phone: string
  customer_name: string
  total_orders: number
  completed_orders: number
  total_revenue_ar: number
  first_order_at: string
  last_order_at: string
}

export interface DailyRevenue {
  day: string
  order_count: number
  taxi_count: number
  colis_count: number
  courses_count: number
  revenue_ar: number
}

export interface MonthlyRevenue {
  month: string
  order_count: number
  revenue_ar: number
}

export interface RouteWaypoint {
  order_id: string
  service: ServiceType
  lat: number
  lng: number
  label: string
  dropoff_label: string | null
  customer_name: string
  customer_phone: string
  distance_from_prev_km: number
  duration_from_prev_min: number
  requested_time: string | null
  estimated_arrival: string | null
  driver_id: string | null
  driver_name: string | null
}

export interface RoutePlan {
  id: string
  planned_date: string
  vehicle_id: string | null
  order_sequence: string[]
  waypoints: RouteWaypoint[]
  total_distance_km: number | null
  total_duration_min: number | null
  algorithm: string
  created_at: string
}
