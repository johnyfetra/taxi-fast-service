import type { Coords } from './types'
import { fallbackRoute } from './geo'

const OSRM_BASE = 'https://router.project-osrm.org'
const TIMEOUT_MS = 5000

export interface RouteResult {
  distance_km: number
  duration_seconds: number
  fallback: boolean
}

export async function getRoute(origin: Coords, destination: Coords): Promise<RouteResult> {
  // OSRM expects longitude before latitude
  const url =
    `${OSRM_BASE}/route/v1/driving/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?overview=false`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)

    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('OSRM no route found')

    const route = data.routes[0]
    return {
      distance_km: Math.round((route.distance / 1000) * 10) / 10,
      duration_seconds: Math.round(route.duration),
      fallback: false,
    }
  } catch (err) {
    clearTimeout(timer)
    console.error('[osrm] fallback to haversine:', err instanceof Error ? err.message : String(err))
    const fb = fallbackRoute(origin, destination)
    return {
      distance_km: fb.distance_km,
      duration_seconds: (fb.duration_min / 1.5) * 60,
      fallback: true,
    }
  }
}
