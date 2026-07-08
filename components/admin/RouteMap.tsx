'use client'
import { useEffect, useRef } from 'react'
import type { Location } from '@/lib/types'

interface Props {
  pickup: Location
  dropoff: Location
}

const PIN_SVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.625 14 22 14 22S28 23.625 28 14C28 6.27 21.73 0 14 0z"
      fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
  </svg>`

export default function RouteMap({ pickup, dropoff }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  const initializingRef = useRef(false)

  useEffect(() => {
    if (!mapRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((mapRef.current as any)._leaflet_id) return
    if (initializingRef.current) return
    initializingRef.current = true

    const init = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      if (!mapRef.current) { initializingRef.current = false; return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapRef.current as any)._leaflet_id) { initializingRef.current = false; return }

      const makeIcon = (color: string) =>
        L.divIcon({
          html: PIN_SVG(color),
          className: '',
          iconSize: [22, 28],
          iconAnchor: [11, 28],
        })

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)

      L.marker([pickup.lat, pickup.lng], { icon: makeIcon('#D81F26') })
        .addTo(map)
        .bindTooltip(pickup.label, { direction: 'top' })

      L.marker([dropoff.lat, dropoff.lng], { icon: makeIcon('#1F6ED8') })
        .addTo(map)
        .bindTooltip(dropoff.label, { direction: 'top' })

      map.fitBounds(
        [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]],
        { padding: [28, 28], maxZoom: 15 }
      )

      mapInstanceRef.current = { L, map }

      try {
        const { getRoute } = await import('@/lib/osrm')
        const result = await getRoute(pickup, dropoff)
        if (result.geometry && mapInstanceRef.current) {
          mapInstanceRef.current.L.geoJSON(result.geometry, {
            style: { color: '#D81F26', weight: 3, opacity: 0.7, lineJoin: 'round', lineCap: 'round' },
          }).addTo(map)
        }
      } catch { /* silent — markers remain visible */ }
    }

    init()

    return () => {
      if (mapInstanceRef.current?.map) {
        mapInstanceRef.current.map.remove()
        mapInstanceRef.current = null
      }
      initializingRef.current = false
    }
  // pickup/dropoff come from immutable order data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-gray-200"
      style={{ height: '140px' }}
      aria-label={`Trajet : ${pickup.label} → ${dropoff.label}`}
    />
  )
}
