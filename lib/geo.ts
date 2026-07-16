import type { Coords } from './types'

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function fallbackRoute(a: Coords, b: Coords): { distance_km: number; duration_min: number } {
  const km = haversineKm(a, b) * 1.4
  const distance_km = Math.round(km * 10) / 10
  // km/20kmh arrondi aux 5 min (vitesse pessimiste taxi-moto)
  const duration_min = Math.max(5, Math.ceil(km / 20 * 60 / 5) * 5)
  return { distance_km, duration_min }
}
