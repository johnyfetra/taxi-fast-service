import { NextRequest, NextResponse } from 'next/server'

const PHOTON_BASE = 'https://photon.komoot.io'
// Bounding box Antananarivo: lon_min,lat_min,lon_max,lat_max
const BBOX = '47.4,-19.0,47.7,-18.7'

interface PhotonFeatureRaw {
  properties: {
    name?: string
    street?: string
    housenumber?: string
    district?: string
    city?: string
    county?: string
    state?: string
    country?: string
    postcode?: string
    osm_value?: string
  }
  geometry: { coordinates: [number, number] }
}

function buildLabel(p: PhotonFeatureRaw['properties']): string {
  // Quartier = street name, district, or place name
  const quartier = (p.housenumber && p.street)
    ? `${p.housenumber} ${p.street}`
    : p.street ?? p.district ?? p.name

  const parts = [quartier, p.city ?? p.county, p.state].filter(Boolean)
  return parts.join(', ') || 'Lieu inconnu'
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim()
  const type = searchParams.get('type') ?? 'search'

  if (type === 'reverse') {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    if (!lat || !lng) return NextResponse.json({ error: 'lat/lng required' }, { status: 400 })
    try {
      const url = `${PHOTON_BASE}/reverse?lat=${lat}&lon=${lng}&lang=fr`
      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) return NextResponse.json(null)
      const data = await res.json()
      const feat = data?.features?.[0] as PhotonFeatureRaw | undefined
      if (!feat) return NextResponse.json(null)
      const [lng2, lat2] = feat.geometry.coordinates
      return NextResponse.json({ label: buildLabel(feat.properties), lat: lat2, lng: lng2 })
    } catch {
      return NextResponse.json(null)
    }
  }

  // type === 'search'
  if (!q || q.length < 2) return NextResponse.json([])
  try {
    const url = `${PHOTON_BASE}/api?q=${encodeURIComponent(q)}&limit=6&lang=fr&bbox=${BBOX}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return NextResponse.json([])
    const data = await res.json()
    const features: PhotonFeatureRaw[] = data?.features ?? []
    const results = features.map((f) => {
      const [lng2, lat2] = f.geometry.coordinates
      return { label: buildLabel(f.properties), lat: lat2, lng: lng2 }
    })
    return NextResponse.json(results)
  } catch {
    return NextResponse.json([])
  }
}
