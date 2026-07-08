'use client'
import { useEffect, useRef, useState } from 'react'
import type { Location } from '@/lib/types'

interface Props {
  pickup: Location | null
  dropoff: Location | null
  onPickupChange: (loc: Location) => void
  onDropoffChange: (loc: Location) => void
}

const TANA_CENTER: [number, number] = [-18.9137, 47.5361]
const ZOOM = 13

// Pin SVG minimaliste — rouge pour départ, bleu pour arrivée
const PIN_SVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 9.625 14 22 14 22S28 23.625 28 14C28 6.27 21.73 0 14 0z"
      fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
  </svg>`

export default function LeafletMap({ pickup, dropoff, onPickupChange, onDropoffChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pickupMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dropoffMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLayerRef = useRef<any>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance_km: number; duration_min: number } | null>(null)
  // Guard synchrone pour React StrictMode (double-invocation des effects en dev)
  const initializingRef = useRef(false)

  useEffect(() => {
    if (!mapRef.current) return
    // Vérifier si Leaflet a déjà attaché une instance à ce div
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((mapRef.current as any)._leaflet_id) return
    if (initializingRef.current) return
    initializingRef.current = true

    const initMap = async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      // Guard secondaire post-await (React StrictMode peut avoir déjà unmount)
      if (!mapRef.current) { initializingRef.current = false; return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapRef.current as any)._leaflet_id) { initializingRef.current = false; return }

      const makeIcon = (color: string) =>
        L.divIcon({
          html: PIN_SVG(color),
          className: '',
          iconSize: [28, 36],
          iconAnchor: [14, 36],
          popupAnchor: [0, -36],
        })

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map)

      map.setView(TANA_CENTER, ZOOM)

      mapInstanceRef.current = {
        L,
        map,
        redIcon: makeIcon('#D81F26'),
        blueIcon: makeIcon('#1F6ED8'),
      }

      // Clic sur la carte → poser l'arrivée si pas encore définie, sinon le départ
      map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng
        const { reverseGeocode } = await import('@/lib/photon')
        const feat = await reverseGeocode(lat, lng)
        const label = feat?.label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        if (!dropoffMarkerRef.current) {
          onDropoffChange({ label, lat, lng })
        } else {
          onPickupChange({ label, lat, lng })
        }
      })
    }

    initMap()

    return () => {
      if (mapInstanceRef.current?.map) {
        mapInstanceRef.current.map.remove()
        mapInstanceRef.current = null
      }
      initializingRef.current = false
    }
    // onPickupChange / onDropoffChange sont des callbacks stables (useCallback dans le parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mettre à jour le marqueur de départ
  useEffect(() => {
    const instance = mapInstanceRef.current
    if (!instance) return

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove()
      pickupMarkerRef.current = null
    }

    if (pickup) {
      const m = instance.L
        .marker([pickup.lat, pickup.lng], { icon: instance.redIcon, draggable: true })
        .addTo(instance.map)
        .bindTooltip('Départ', { permanent: false, direction: 'top' })

      m.on('dragend', async () => {
        const pos = m.getLatLng()
        const { reverseGeocode } = await import('@/lib/photon')
        const feat = await reverseGeocode(pos.lat, pos.lng)
        const label = feat?.label ?? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`
        onPickupChange({ label, lat: pos.lat, lng: pos.lng })
      })

      pickupMarkerRef.current = m
      if (!dropoff) instance.map.setView([pickup.lat, pickup.lng], Math.max(instance.map.getZoom(), 15))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup])

  // Mettre à jour le marqueur d'arrivée
  useEffect(() => {
    const instance = mapInstanceRef.current
    if (!instance) return

    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove()
      dropoffMarkerRef.current = null
    }

    if (dropoff) {
      const m = instance.L
        .marker([dropoff.lat, dropoff.lng], { icon: instance.blueIcon, draggable: true })
        .addTo(instance.map)
        .bindTooltip('Arrivée', { permanent: false, direction: 'top' })

      m.on('dragend', async () => {
        const pos = m.getLatLng()
        const { reverseGeocode } = await import('@/lib/photon')
        const feat = await reverseGeocode(pos.lat, pos.lng)
        const label = feat?.label ?? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`
        onDropoffChange({ label, lat: pos.lat, lng: pos.lng })
      })

      dropoffMarkerRef.current = m
    }

    if (pickup && dropoff) {
      instance.map.fitBounds(
        [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]],
        { padding: [48, 48], maxZoom: 16 }
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropoff])

  // Draw route polyline when both pickup and dropoff are set
  useEffect(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }
    setRouteInfo(null)
    if (!pickup || !dropoff) return

    const drawRoute = async () => {
      const { getRoute } = await import('@/lib/osrm')
      const result = await getRoute(pickup, dropoff)
      const instance = mapInstanceRef.current
      if (!instance) return

      if (result.geometry) {
        const layer = instance.L.geoJSON(result.geometry, {
          style: { color: '#D81F26', weight: 4, opacity: 0.7, lineJoin: 'round', lineCap: 'round' },
        }).addTo(instance.map)
        routeLayerRef.current = layer
      }

      setRouteInfo({
        distance_km: result.distance_km,
        duration_min: Math.max(1, Math.round(result.duration_seconds / 60)),
      })
    }

    drawRoute()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng])

  const fmtDuration = (min: number) =>
    min >= 60 ? `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ''}` : `${min} min`

  return (
    <div className="flex flex-col gap-0">
      <div
        ref={mapRef}
        className="w-full rounded-t-2xl overflow-hidden border border-gray-200 shadow-sm"
        style={{ height: '240px' }}
        aria-label="Carte de la course"
      />
      {routeInfo && (
        <div className="flex items-center justify-center gap-4 bg-white border border-t-0 border-gray-200 rounded-b-2xl px-4 py-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-black">
            <span className="text-base">📏</span>
            {routeInfo.distance_km} km
          </span>
          <span className="w-px h-4 bg-gray-200" />
          <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-black">
            <span className="text-base">⏱</span>
            {fmtDuration(routeInfo.duration_min)}
          </span>
        </div>
      )}
    </div>
  )
}
