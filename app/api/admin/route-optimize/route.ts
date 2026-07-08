import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { RouteWaypoint } from '@/lib/types'

interface OsrmTableResponse {
  durations: number[][]
  distances: number[][]
}

function nearestNeighbor(distMatrix: number[][], start = 0): number[] {
  const n = distMatrix.length
  const visited = new Array(n).fill(false)
  const path: number[] = [start]
  visited[start] = true
  for (let i = 1; i < n; i++) {
    const last = path[path.length - 1]
    let best = -1
    let bestDist = Infinity
    for (let j = 0; j < n; j++) {
      if (!visited[j] && distMatrix[last][j] < bestDist) {
        best = j
        bestDist = distMatrix[last][j]
      }
    }
    if (best >= 0) { path.push(best); visited[best] = true }
  }
  return path
}

function addMinutes(isoStr: string, min: number): string {
  return new Date(new Date(isoStr).getTime() + min * 60000).toISOString()
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'non configuré' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const date: string = body.date ?? new Date().toISOString().slice(0, 10)

  // Fetch all active orders for the date (all services)
  const { data: orders, error } = await admin
    .from('orders')
    .select('id, service, pickup, dropoff, customer_name, customer_phone, status, details, driver_id, created_at')
    .in('service', ['taxi', 'colis', 'courses'])
    .gte('created_at', date + 'T00:00:00Z')
    .lte('created_at', date + 'T23:59:59Z')
    .not('status', 'in', '("cancelled","done")')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!orders || orders.length === 0) {
    return NextResponse.json({ waypoints: [], total_distance_km: 0, total_duration_min: 0, order_count: 0, date })
  }

  // Resolve driver names
  const driverIds = [...new Set(orders.map(o => o.driver_id).filter(Boolean))]
  const driverMap: Record<string, string> = {}
  if (driverIds.length > 0) {
    const { data: drivers } = await admin.from('drivers').select('id, name').in('id', driverIds)
    if (drivers) drivers.forEach(d => { driverMap[d.id] = d.name })
  }

  // Build coordinate list from pickup points
  const coords = orders
    .filter(o => o.pickup?.lat && o.pickup?.lng)
    .map(o => ({
      order_id: o.id,
      service: o.service,
      lat: o.pickup.lat,
      lng: o.pickup.lng,
      label: o.pickup.label ?? '',
      dropoff_label: o.dropoff?.label ?? null,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      driver_id: o.driver_id ?? null,
      driver_name: o.driver_id ? (driverMap[o.driver_id] ?? null) : null,
      // Requested pickup time: from details or created_at
      requested_time: o.details?.pickup_datetime ?? null,
    }))

  if (coords.length === 0) {
    return NextResponse.json({ waypoints: [], total_distance_km: 0, total_duration_min: 0, order_count: 0, date })
  }

  // Call OSRM table API
  const coordStr = coords.map(c => `${c.lng},${c.lat}`).join(';')
  let distMatrix: number[][] = []
  let durMatrix: number[][] = []
  try {
    const osrmRes = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coordStr}?annotations=distance,duration`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (osrmRes.ok) {
      const osrmData: OsrmTableResponse = await osrmRes.json()
      distMatrix = osrmData.distances.map(row => row.map(d => d / 1000))
      durMatrix = osrmData.durations.map(row => row.map(d => Math.round(d / 60)))
    }
  } catch { /* OSRM unavailable */ }

  // Fallback: haversine
  if (distMatrix.length === 0) {
    const n = coords.length
    distMatrix = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (__, j) => {
        if (i === j) return 0
        const R = 6371
        const dLat = (coords[j].lat - coords[i].lat) * Math.PI / 180
        const dLng = (coords[j].lng - coords[i].lng) * Math.PI / 180
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(coords[i].lat * Math.PI / 180) * Math.cos(coords[j].lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.4
      })
    )
    durMatrix = distMatrix.map(row => row.map(d => Math.round(d / 15 * 60)))
  }

  // Optimize with nearest neighbor
  const order = nearestNeighbor(distMatrix)

  // Build waypoints with cumulative time estimates
  // Start: now + 10 min (driver departure buffer)
  const startIso = addMinutes(new Date().toISOString(), 10)
  let cumulativeTime = startIso
  const SERVICE_STOP_MIN = 5 // stop time per waypoint

  const waypoints: RouteWaypoint[] = order.map((idx, pos) => {
    const distFromPrev = pos === 0 ? 0 : Math.round(distMatrix[order[pos - 1]][idx] * 10) / 10
    const durFromPrev = pos === 0 ? 0 : (durMatrix[order[pos - 1]]?.[idx] ?? 0)

    if (pos > 0) {
      cumulativeTime = addMinutes(cumulativeTime, durFromPrev + SERVICE_STOP_MIN)
    }

    return {
      order_id: coords[idx].order_id,
      service: coords[idx].service,
      lat: coords[idx].lat,
      lng: coords[idx].lng,
      label: coords[idx].label,
      dropoff_label: coords[idx].dropoff_label,
      customer_name: coords[idx].customer_name,
      customer_phone: coords[idx].customer_phone,
      distance_from_prev_km: distFromPrev,
      duration_from_prev_min: durFromPrev,
      requested_time: coords[idx].requested_time,
      estimated_arrival: cumulativeTime,
      driver_id: coords[idx].driver_id,
      driver_name: coords[idx].driver_name,
    }
  })

  const total_distance_km = Math.round(waypoints.reduce((s, w) => s + w.distance_from_prev_km, 0) * 10) / 10
  const total_duration_min = waypoints.reduce((s, w) => s + w.duration_from_prev_min, 0)

  return NextResponse.json({ waypoints, total_distance_km, total_duration_min, date, order_count: coords.length })
}
