'use client'
import { useEffect, useRef, useState } from 'react'
import type { Location } from '@/lib/types'

interface Props {
  pickup: Location | null
  dropoff: Location | null
  onPickupChange: (loc: Location) => void
  onDropoffChange: (loc: Location) => void
  userPosition?: { lat: number; lng: number } | null
  userLabel?: string | null
}

const TANA_CENTER: [number, number] = [-18.9137, 47.5361]
const ZOOM = 13

// Pin SVG avec lettre — A rouge pour départ, B bleu pour arrivée
const PIN_SVG = (color: string, letter: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 26 16 26S32 27 32 16C32 7.16 24.84 0 16 0z"
      fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="16" y="21" text-anchor="middle" dominant-baseline="middle"
      font-family="system-ui,-apple-system,sans-serif"
      font-size="14" font-weight="800" fill="white" letter-spacing="0">${letter}</text>
  </svg>`

// Marqueur "Vous ici" — juste le point pulsant + CTA compact, sans carte
function buildYouHereHTML(): string {
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:0;pointer-events:auto;user-select:none">
    <button class="you-use-as-pickup" style="
      padding:6px 11px;border-radius:20px;margin-bottom:5px;
      background:linear-gradient(135deg,#D81F26,#b91c1c);
      color:white;border:none;cursor:pointer;
      font-size:11px;font-weight:700;font-family:system-ui,-apple-system,sans-serif;
      display:flex;align-items:center;gap:5px;
      box-shadow:0 2px 10px rgba(216,31,38,0.4);
      white-space:nowrap;
    ">
      Partir d'ici
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>
    <div style="width:2px;height:6px;background:rgba(0,0,0,0.18)"></div>
    <div style="position:relative;width:14px;height:14px;display:flex;align-items:center;justify-content:center">
      <div style="position:absolute;width:28px;height:28px;border-radius:50%;background:#3B82F6;opacity:0.2;animation:youPulse 2s ease-out infinite;pointer-events:none"></div>
      <div style="width:13px;height:13px;border-radius:50%;background:#3B82F6;border:2.5px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.55)"></div>
    </div>
    <style>@keyframes youPulse{0%{transform:scale(1);opacity:.25}70%{transform:scale(2.6);opacity:0}100%{transform:scale(2.6);opacity:0}}</style>
  </div>`
}

export default function LeafletMap({ pickup, dropoff, onPickupChange, onDropoffChange, userPosition, userLabel }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pickupMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dropoffMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeLayerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routeControlRef = useRef<any>(null)
  const routeReqRef = useRef(0)
  const [routeInfo, setRouteInfo] = useState<{ duration: string; distance: string } | null>(null)
  // Guard synchrone pour React StrictMode (double-invocation des effects en dev)
  const initializingRef = useRef(false)
  // Miroir des props pour que initMap() puisse lire les valeurs initiales sans deps
  const pickupRef = useRef<Location | null>(pickup)
  const dropoffRef = useRef<Location | null>(dropoff)
  const userPositionRef = useRef(userPosition)
  const userLabelRef = useRef(userLabel)
  const onPickupChangeRef = useRef(onPickupChange)
  const onDropoffChangeRef = useRef(onDropoffChange)
  pickupRef.current = pickup
  dropoffRef.current = dropoff
  userPositionRef.current = userPosition
  userLabelRef.current = userLabel
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

      const makeIcon = (color: string, letter: string) =>
        L.divIcon({
          html: PIN_SVG(color, letter),
          className: '',
          iconSize: [32, 42],
          iconAnchor: [16, 42],
          popupAnchor: [0, -42],
        })

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 19,
      }).addTo(map)

      // Démarrer vue monde puis fly vers la position — effet réaliste
      map.setView([0, 25], 2)

      const redIcon = makeIcon('#D81F26', 'A')
      const blueIcon = makeIcon('#1F6ED8', 'B')
      const makeYouIcon = () => L.divIcon({
        html: buildYouHereHTML(),
        className: '',
        iconSize: [120, 60],
        iconAnchor: [60, 60],
      })

      mapInstanceRef.current = { L, map, redIcon, blueIcon, makeYouIcon }

      // Si userPosition déjà connue au moment de l'init, fly avec délai (après rendu)
      const initUserPos = userPositionRef.current
      if (initUserPos && !pickupRef.current && !dropoffRef.current) {
        setTimeout(() => {
          map.flyTo([initUserPos.lat, initUserPos.lng], 15, { animate: true, duration: 2.2, easeLinearity: 0.12 })
        }, 300)
        const m = L.marker([initUserPos.lat, initUserPos.lng], {
          icon: makeYouIcon(),
          interactive: true,
          keyboard: false,
          zIndexOffset: 500,
        }).addTo(map)
        // CTA "Utiliser comme départ"
        const el = m.getElement()
        if (el) {
          const btn = el.querySelector('.you-use-as-pickup') as HTMLElement | null
          if (btn) {
            L.DomEvent.on(btn, 'click', (e) => {
              L.DomEvent.stopPropagation(e)
              const p = userPositionRef.current
              if (p) onPickupChangeRef.current({ label: userLabelRef.current ?? 'Ma position', lat: p.lat, lng: p.lng })
              if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null }
            })
          }
        }
        userMarkerRef.current = m
      }

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

  // Marqueur "Vous ici" — réactif si la géoloc arrive après l'init de la carte
  useEffect(() => {
    const instance = mapInstanceRef.current
    if (!instance || !userPosition) return

    // Départ déjà défini → pas besoin du bouton "Partir d'ici"
    if (pickupRef.current) return

    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }

    const m = instance.L.marker([userPosition.lat, userPosition.lng], {
      icon: instance.makeYouIcon(),
      interactive: true,
      keyboard: false,
      zIndexOffset: 500,
    }).addTo(instance.map)

    // CTA "Utiliser comme départ"
    const el = m.getElement()
    if (el) {
      const btn = el.querySelector('.you-use-as-pickup') as HTMLElement | null
      if (btn) {
        instance.L.DomEvent.on(btn, 'click', (e: Event) => {
          instance.L.DomEvent.stopPropagation(e)
          const p = userPositionRef.current
          if (p) onPickupChangeRef.current({ label: userLabelRef.current ?? 'Ma position', lat: p.lat, lng: p.lng })
          if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null }
        })
      }
    }
    userMarkerRef.current = m

    // Fly vers la position — effet monde → local
    if (!pickupRef.current && !dropoffRef.current) {
      instance.map.flyTo([userPosition.lat, userPosition.lng], 15, {
        animate: true,
        duration: 2.2,
        easeLinearity: 0.12,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPosition])

  // Mettre à jour le marqueur de départ
  useEffect(() => {
    const instance = mapInstanceRef.current
    if (!instance) return

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove()
      pickupMarkerRef.current = null
    }

    if (pickup) {
      // Supprimer le marker "Vous ici" dès que le départ est défini
      if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null }

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

  // Draw route polyline — info badge géré en React state (overlay en haut de carte)
  useEffect(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }
    setRouteInfo(null)
    if (!pickup || !dropoff) return

    const reqId = ++routeReqRef.current
    const drawRoute = async () => {
      const { getRoute } = await import('@/lib/osrm')
      const result = await getRoute(pickup, dropoff)
      if (routeReqRef.current !== reqId) return
      const instance = mapInstanceRef.current
      if (!instance) return

      if (result.geometry) {
        routeLayerRef.current = instance.L.geoJSON(result.geometry, {
          style: { color: '#D81F26', weight: 4, opacity: 0.7, lineJoin: 'round', lineCap: 'round' },
        }).addTo(instance.map)
      }

      const dur = Math.max(1, Math.round(result.duration_seconds / 60))
      const fmtDur = dur >= 60
        ? `${Math.floor(dur / 60)}h ${dur % 60 > 0 ? `${dur % 60}min` : ''}`
        : `${dur} min`

      setRouteInfo({ duration: fmtDur, distance: String(result.distance_km) })
    }

    drawRoute()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng])

  const labelParts = userLabel ? userLabel.split(',').map(s => s.trim()) : []
  const street = labelParts[0] ?? null
  const district = labelParts[1] ?? null

  return (
    <div className="relative w-full">

      {/* Pill info trajet — en haut de la carte, rouge/noir/blanc */}
      {routeInfo && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl pointer-events-none"
          style={{
            background: 'rgba(13,13,15,0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D81F26', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            {routeInfo.duration}
          </span>
          <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>
            {routeInfo.distance} km
          </span>
        </div>
      )}

      {/* Pill position utilisateur — masquée si trajet ou départ défini */}
      {!routeInfo && !pickup && (street || district) && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-3.5 py-2 rounded-2xl pointer-events-none"
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 2px 16px rgba(0,0,0,0.09)',
            maxWidth: 'calc(100% - 32px)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="#3b82f6" />
            <circle cx="12" cy="12" r="8" stroke="#3b82f6" strokeWidth="1.5" opacity="0.3" />
            <line x1="12" y1="2" x2="12" y2="5" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12" y1="19" x2="12" y2="22" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="2" y1="12" x2="5" y2="12" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="19" y1="12" x2="22" y2="12" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="truncate" style={{ maxWidth: '230px', letterSpacing: '-0.01em' }}>
            {street && <span className="text-[11.5px] text-gray-500">{street}</span>}
            {street && district && <span className="text-[11.5px] text-gray-400"> · </span>}
            {district && <span className="text-[12px] font-bold text-gray-800">{district}</span>}
          </span>
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-[#2A2A2C] shadow-sm"
        style={{ height: '420px' }}
        aria-label="Carte de la course"
      />
    </div>
  )
}
