'use client'
import { useEffect, useRef, useState } from 'react'
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
  const [routeInfo, setRouteInfo] = useState<{ distance_km: number | null; duration_min: number } | null>(null)

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
        if (!mapInstanceRef.current) return

        if (result.geometry) {
          L.geoJSON(result.geometry, {
            style: { color: '#D81F26', weight: 3, opacity: 0.7, lineJoin: 'round', lineCap: 'round' },
          }).addTo(map)
        }

        const dur = Math.max(1, Math.round(result.duration_seconds / 60))
        const fmtDur = dur >= 60
          ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? `&nbsp;${dur % 60}min` : ''}`
          : `${dur}&nbsp;min`

        const InfoControl = L.Control.extend({
          onAdd() {
            const div = L.DomUtil.create('div')
            div.setAttribute('style', [
              'background:rgba(255,255,255,0.95)',
              'backdrop-filter:blur(6px)',
              'border-radius:8px',
              'padding:4px 10px',
              'display:flex',
              'gap:8px',
              'align-items:center',
              'font-size:11px',
              'font-weight:700',
              'color:#0D0D0F',
              'box-shadow:0 2px 8px rgba(0,0,0,0.16)',
              'border:1px solid rgba(0,0,0,0.07)',
              'pointer-events:none',
              'margin:6px',
            ].join(';'))
            const distIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D81F26" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/></svg>`
            const clockIcon = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D81F26" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 15.5"/></svg>`
            div.innerHTML =
              `<span style="display:inline-flex;align-items:center;gap:4px">${distIcon}&nbsp;${result.distance_km}&nbsp;km</span>` +
              `<span style="width:1px;height:12px;background:#E5E7EB;display:inline-block"></span>` +
              `<span style="display:inline-flex;align-items:center;gap:4px">${clockIcon}&nbsp;${fmtDur}</span>`
            return div
          },
          onRemove() {},
        })

        new InfoControl({ position: 'bottomleft' }).addTo(map)
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
