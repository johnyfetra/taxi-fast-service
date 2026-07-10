'use client'
import { useEffect, useRef } from 'react'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeControlRef = useRef<any>(null)
  const routeReqRef = useRef(0)
  // Guard synchrone pour React StrictMode (double-invocation des effects en dev)
  const initializingRef = useRef(false)
  // Miroir des props pour que initMap() puisse lire les valeurs initiales sans deps
  const pickupRef = useRef<Location | null>(pickup)
  const dropoffRef = useRef<Location | null>(dropoff)
  const onPickupChangeRef = useRef(onPickupChange)
  const onDropoffChangeRef = useRef(onDropoffChange)
  pickupRef.current = pickup
  dropoffRef.current = dropoff
  onPickupChangeRef.current = onPickupChange
  onDropoffChangeRef.current = onDropoffChange

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

      const redIcon = makeIcon('#D81F26')
      const blueIcon = makeIcon('#1F6ED8')

      mapInstanceRef.current = { L, map, redIcon, blueIcon }

      // Clic sur la carte → poser l'arrivée si pas encore définie, sinon le départ
      map.on('click', async (e: { latlng: { lat: number; lng: number } }) => {
        const { lat, lng } = e.latlng
        const { reverseGeocode } = await import('@/lib/photon')
        const feat = await reverseGeocode(lat, lng)
        const label = feat?.label ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        if (!dropoffMarkerRef.current) {
          onDropoffChangeRef.current({ label, lat, lng })
        } else {
          onPickupChangeRef.current({ label, lat, lng })
        }
      })

      // Placer les marqueurs déjà définis au moment de l'init (évite la race condition)
      const initPickup = pickupRef.current
      const initDropoff = dropoffRef.current

      if (initPickup) {
        const m = L.marker([initPickup.lat, initPickup.lng], { icon: redIcon, draggable: true })
          .addTo(map)
          .bindTooltip('Départ', { permanent: false, direction: 'top' })
        m.on('dragend', async () => {
          const pos = m.getLatLng()
          const { reverseGeocode } = await import('@/lib/photon')
          const feat = await reverseGeocode(pos.lat, pos.lng)
          const label = feat?.label ?? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`
          onPickupChangeRef.current({ label, lat: pos.lat, lng: pos.lng })
        })
        pickupMarkerRef.current = m
        if (!initDropoff) map.setView([initPickup.lat, initPickup.lng], Math.max(map.getZoom(), 15))
      }

      if (initDropoff) {
        const m = L.marker([initDropoff.lat, initDropoff.lng], { icon: blueIcon, draggable: true })
          .addTo(map)
          .bindTooltip('Arrivée', { permanent: false, direction: 'top' })
        m.on('dragend', async () => {
          const pos = m.getLatLng()
          const { reverseGeocode } = await import('@/lib/photon')
          const feat = await reverseGeocode(pos.lat, pos.lng)
          const label = feat?.label ?? `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`
          onDropoffChangeRef.current({ label, lat: pos.lat, lng: pos.lng })
        })
        dropoffMarkerRef.current = m
      }

      if (initPickup && initDropoff) {
        map.fitBounds(
          [[initPickup.lat, initPickup.lng], [initDropoff.lat, initDropoff.lng]],
          { padding: [48, 48], maxZoom: 16 }
        )
      }
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

  // Draw route polyline + floating info badge when both pickup and dropoff are set
  useEffect(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }
    if (routeControlRef.current) {
      routeControlRef.current.remove()
      routeControlRef.current = null
    }
    if (!pickup || !dropoff) return

    const reqId = ++routeReqRef.current
    const drawRoute = async () => {
      const { getRoute } = await import('@/lib/osrm')
      const result = await getRoute(pickup, dropoff)
      if (routeReqRef.current !== reqId) return // résultat obsolète, une requête plus récente a pris le relais
      const instance = mapInstanceRef.current
      if (!instance) return

      if (result.geometry) {
        routeLayerRef.current = instance.L.geoJSON(result.geometry, {
          style: { color: '#D81F26', weight: 4, opacity: 0.7, lineJoin: 'round', lineCap: 'round' },
        }).addTo(instance.map)
      }

      const dur = Math.max(1, Math.round(result.duration_seconds / 60))
      const fmtDur = dur >= 60
        ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? `&nbsp;${dur % 60}min` : ''}`
        : `${dur}&nbsp;min`

      // Label positionné au milieu du tracé
      let midLat = (pickup.lat + dropoff.lat) / 2
      let midLng = (pickup.lng + dropoff.lng) / 2
      if (result.geometry?.type === 'LineString') {
        const coords = result.geometry.coordinates as [number, number][]
        if (coords.length > 0) {
          const m = coords[Math.floor(coords.length / 2)]
          midLng = m[0]; midLat = m[1]
        }
      }

      const labelHtml =
        `<div style="position:relative;width:0;height:0">` +
          `<div style="` +
            `position:absolute;transform:translate(-50%,-50%);` +
            `display:flex;align-items:center;gap:7px;white-space:nowrap;` +
            `background:rgba(13,13,15,0.88);` +
            `backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);` +
            `border-radius:12px;padding:7px 13px;` +
            `box-shadow:0 4px 20px rgba(0,0,0,0.38);` +
          `">` +
            `<span style="font-size:15px;font-weight:800;color:#fff;letter-spacing:-0.02em">${fmtDur}</span>` +
            `<span style="width:1px;height:14px;background:rgba(255,255,255,0.2);display:inline-block"></span>` +
            `<span style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.65)">${result.distance_km}&nbsp;km</span>` +
          `</div>` +
        `</div>`

      const labelIcon = instance.L.divIcon({
        html: labelHtml,
        className: '',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      })

      const labelMarker = instance.L.marker([midLat, midLng], {
        icon: labelIcon,
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(instance.map)

      routeControlRef.current = labelMarker
    }

    drawRoute()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
      style={{ height: '240px' }}
      aria-label="Carte de la course"
    />
  )
}
