const PHOTON_BASE = 'https://photon.komoot.io'
const TIMEOUT_MS = 5000
// Bounding box Antananarivo — lon_min,lat_min,lon_max,lat_max
const BBOX = '47.4,-19.0,47.7,-18.7'

export interface PhotonFeature {
  label: string
  lat: number
  lng: number
}

interface PhotonFeatureRaw {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    city?: string
    county?: string
    country?: string
  }
}

interface PhotonGeoJSON {
  features?: PhotonFeatureRaw[]
}

function parseFeature(f: PhotonFeatureRaw): PhotonFeature | null {
  if (!f?.geometry?.coordinates) return null
  const [lng, lat] = f.geometry.coordinates
  const p = f.properties ?? {}
  const parts = [p.name, p.city ?? p.county].filter(Boolean)
  const label = parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  return { label, lat, lng }
}

export async function searchAddress(query: string): Promise<PhotonFeature[]> {
  if (!query.trim()) return []

  const url = `${PHOTON_BASE}/api?q=${encodeURIComponent(query)}&limit=5&lang=fr&bbox=${BBOX}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (!res.ok) return []
    const data: PhotonGeoJSON = await res.json()
    return (data.features ?? []).map(parseFeature).filter((f): f is PhotonFeature => f !== null)
  } catch {
    clearTimeout(timer)
    return []
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<PhotonFeature | null> {
  const url = `${PHOTON_BASE}/reverse?lat=${lat}&lon=${lng}&limit=1&lang=fr`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (!res.ok) return null
    const data: PhotonGeoJSON = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null
    return parseFeature(feature)
  } catch {
    clearTimeout(timer)
    return null
  }
}
