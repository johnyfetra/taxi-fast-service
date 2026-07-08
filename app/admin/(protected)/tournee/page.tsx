'use client'
import { useEffect, useState, useMemo } from 'react'
import type { RouteWaypoint, Driver } from '@/lib/types'
import {
  IconRoute, IconPhone, IconWhatsApp, IconPackage,
  IconMoto, IconShopping, IconDriver, IconCalendar, IconX, IconCheck,
} from '@/components/icons'

interface PlanResult {
  waypoints: RouteWaypoint[]
  total_distance_km: number
  total_duration_min: number
  order_count: number
  date: string
}

const SERVICE_META = {
  taxi:    { label: 'Taxi-moto', color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',   Icon: IconMoto },
  colis:   { label: 'Colis',     color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',  Icon: IconPackage },
  courses: { label: 'Courses',   color: 'bg-green-100 text-green-700', dot: 'bg-green-500',  Icon: IconShopping },
} as const

type ViewMode = 'timeline' | 'colonnes' | 'groupes'

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDur(min: number): string {
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}min` : ''}`
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function clusterByProximity(waypoints: RouteWaypoint[], maxDistKm = 3): RouteWaypoint[][] {
  const visited = new Set<string>()
  const clusters: RouteWaypoint[][] = []

  for (const wp of waypoints) {
    if (visited.has(wp.order_id)) continue
    const cluster: RouteWaypoint[] = [wp]
    visited.add(wp.order_id)

    for (const other of waypoints) {
      if (visited.has(other.order_id)) continue
      const dist = haversine(wp.lat, wp.lng, other.lat, other.lng)
      if (dist <= maxDistKm) {
        cluster.push(other)
        visited.add(other.order_id)
      }
    }
    clusters.push(cluster)
  }

  return clusters
}

export default function TourneePage() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [result, setResult] = useState<PlanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewMode>('timeline')

  // Single assignment
  const [assigningWp, setAssigningWp] = useState<RouteWaypoint | null>(null)
  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAssigning, setBulkAssigning] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  // Group assignment
  const [assigningGroup, setAssigningGroup] = useState<RouteWaypoint[] | null>(null)

  const [drivers, setDrivers] = useState<Driver[]>([])
  const [assignLoading, setAssignLoading] = useState(false)

  const optimize = async () => {
    setLoading(true); setError(''); setResult(null); setSelected(new Set())
    try {
      const res = await fetch('/api/admin/route-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setResult(data)
    } catch { setError('Erreur réseau') }
    finally { setLoading(false) }
  }

  const loadDrivers = async () => {
    const res = await fetch('/api/admin/drivers')
    if (res.ok) setDrivers(await res.json())
  }

  useEffect(() => { optimize() }, [date])

  const openAssign = (wp: RouteWaypoint) => {
    setAssigningWp(wp)
    loadDrivers()
  }

  const openBulkAssign = () => {
    setShowBulkModal(true)
    loadDrivers()
  }

  const openGroupAssign = (group: RouteWaypoint[]) => {
    setAssigningGroup(group)
    loadDrivers()
  }

  const assign = async (driverId: string | null) => {
    if (!assigningWp) return
    setAssignLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${assigningWp.order_id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId }),
      })
      if (res.ok) {
        const driverName = driverId ? (drivers.find(d => d.id === driverId)?.name ?? null) : null
        setResult(prev => prev ? {
          ...prev,
          waypoints: prev.waypoints.map(w =>
            w.order_id === assigningWp.order_id
              ? { ...w, driver_id: driverId, driver_name: driverName }
              : w
          ),
        } : prev)
        setAssigningWp(null)
      }
    } finally { setAssignLoading(false) }
  }

  const bulkAssign = async (driverId: string) => {
    if (selected.size === 0) return
    setBulkAssigning(true)
    try {
      const res = await fetch('/api/admin/orders/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: [...selected], driver_id: driverId }),
      })
      if (res.ok) {
        const driverName = drivers.find(d => d.id === driverId)?.name ?? null
        setResult(prev => prev ? {
          ...prev,
          waypoints: prev.waypoints.map(w =>
            selected.has(w.order_id) ? { ...w, driver_id: driverId, driver_name: driverName } : w
          ),
        } : prev)
        setSelected(new Set())
        setShowBulkModal(false)
      }
    } finally { setBulkAssigning(false) }
  }

  const groupAssign = async (driverId: string) => {
    if (!assigningGroup) return
    setBulkAssigning(true)
    try {
      const orderIds = assigningGroup.map(w => w.order_id)
      const res = await fetch('/api/admin/orders/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: orderIds, driver_id: driverId }),
      })
      if (res.ok) {
        const driverName = drivers.find(d => d.id === driverId)?.name ?? null
        setResult(prev => prev ? {
          ...prev,
          waypoints: prev.waypoints.map(w =>
            orderIds.includes(w.order_id) ? { ...w, driver_id: driverId, driver_name: driverName } : w
          ),
        } : prev)
        setAssigningGroup(null)
      }
    } finally { setBulkAssigning(false) }
  }

  const toggleSelect = (orderId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!result) return
    const unassigned = result.waypoints.filter(w => !w.driver_id).map(w => w.order_id)
    if (selected.size === unassigned.length) setSelected(new Set())
    else setSelected(new Set(unassigned))
  }

  // Column view data
  const columnData = useMemo(() => {
    if (!result) return { unassigned: [], byDriver: {} as Record<string, { driver: Driver | null; wps: RouteWaypoint[] }> }
    const unassigned = result.waypoints.filter(w => !w.driver_id)
    const byDriver: Record<string, { driver: Driver | null; wps: RouteWaypoint[] }> = {}
    result.waypoints.filter(w => w.driver_id).forEach(w => {
      if (!byDriver[w.driver_id!]) {
        byDriver[w.driver_id!] = { driver: drivers.find(d => d.id === w.driver_id) ?? null, wps: [] }
      }
      byDriver[w.driver_id!].wps.push(w)
    })
    return { unassigned, byDriver }
  }, [result, drivers])

  // Groups view data (cluster unassigned colis by proximity)
  const groupsData = useMemo(() => {
    if (!result) return { groups: [], singles: [] }
    const unassignedColis = result.waypoints.filter(w => !w.driver_id && w.service === 'colis')
    const otherUnassigned = result.waypoints.filter(w => !w.driver_id && w.service !== 'colis')
    const clusters = clusterByProximity(unassignedColis)
    const groups = clusters.filter(c => c.length >= 2)
    const singles = [
      ...clusters.filter(c => c.length === 1).map(c => c[0]),
      ...otherUnassigned,
    ]
    return { groups, singles }
  }, [result])

  const disponibles = drivers.filter(d => d.status === 'disponible')
  const occupied = drivers.filter(d => d.status !== 'disponible')
  const currentAssigningModal = assigningWp || showBulkModal || assigningGroup

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-black">Planning des trajets</h1>
            <p className="text-xs text-gray-400 mt-0.5">Tous les services · optimisation automatique</p>
          </div>
          <div className="flex items-center gap-1.5 text-brand-red">
            <IconRoute size={16} />
            <span className="text-xs font-medium">TSP</span>
          </div>
        </div>

        {/* Date + refresh */}
        <div className="flex gap-2 mt-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1 bg-brand-gray border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-red"
          />
          <button
            onClick={optimize}
            disabled={loading}
            className="bg-brand-red text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 whitespace-nowrap hover:bg-red-700 transition-colors"
          >
            {loading ? '…' : 'Actualiser'}
          </button>
        </div>

        {/* View toggle */}
        {result && result.order_count > 0 && (
          <div className="flex gap-1 mt-3 bg-brand-gray rounded-xl p-1">
            {([
              { id: 'timeline', label: 'Chronologie' },
              { id: 'colonnes', label: 'Par conducteur' },
              { id: 'groupes',  label: 'Groupes colis' },
            ] as { id: ViewMode; label: string }[]).map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={[
                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  view === v.id ? 'bg-white text-brand-black shadow-sm' : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Body */}
      <div className={['flex-1 overflow-y-auto', selected.size > 0 ? 'pb-24' : ''].join(' ')}>
        {error && <p className="text-sm text-brand-red text-center py-6">{error}</p>}
        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            Calcul de la tournée optimisée…
          </div>
        )}

        {result && !loading && (
          <div className="px-4 py-4 flex flex-col gap-4">
            {result.order_count === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <IconCalendar size={24} className="text-gray-300" />
                </div>
                <p className="font-semibold text-brand-black">Aucune commande active</p>
                <p className="text-sm text-gray-400">
                  Aucun trajet planifié pour le {new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-brand-black text-white rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold">{result.order_count}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Commande{result.order_count > 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-brand-black">{result.total_distance_km}</p>
                    <p className="text-xs text-gray-400 mt-0.5">km total</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <p className="text-2xl font-bold text-brand-black">{fmtDur(result.total_duration_min)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">durée est.</p>
                  </div>
                </div>

                {/* Service breakdown */}
                <div className="flex gap-2 flex-wrap">
                  {(['taxi', 'colis', 'courses'] as const).map(s => {
                    const count = result.waypoints.filter(w => w.service === s).length
                    if (!count) return null
                    const meta = SERVICE_META[s]
                    return (
                      <span key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${meta.color}`}>
                        <meta.Icon size={12} />
                        {count} {meta.label}
                      </span>
                    )
                  })}
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                    {result.waypoints.filter(w => w.driver_id).length} affecté{result.waypoints.filter(w => w.driver_id).length > 1 ? 's' : ''}
                  </span>
                  {result.waypoints.filter(w => !w.driver_id).length > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                      {result.waypoints.filter(w => !w.driver_id).length} non affecté{result.waypoints.filter(w => !w.driver_id).length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* ─── TIMELINE VIEW ─── */}
                {view === 'timeline' && (
                  <>
                    {/* Select all unassigned */}
                    {result.waypoints.some(w => !w.driver_id) && (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={toggleSelectAll}
                          className="text-xs text-brand-red font-semibold hover:underline"
                        >
                          {selected.size === result.waypoints.filter(w => !w.driver_id).length && selected.size > 0
                            ? 'Tout désélectionner'
                            : 'Tout sélectionner (non affectés)'}
                        </button>
                        {selected.size > 0 && (
                          <span className="text-xs text-gray-500">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    )}

                    <div className="relative">
                      <div className="absolute left-[52px] top-4 bottom-4 w-px bg-gray-200" />
                      <div className="flex flex-col gap-3">
                        {result.waypoints.map((wp, i) => {
                          const meta = SERVICE_META[wp.service as keyof typeof SERVICE_META] ?? SERVICE_META.taxi
                          const intlPhone = '+261' + wp.customer_phone.replace(/^0/, '').replace(/\s/g, '')
                          const isAssigned = !!wp.driver_id
                          const isSelected = selected.has(wp.order_id)

                          return (
                            <div key={wp.order_id} className="flex gap-3">
                              {/* Time column */}
                              <div className="w-12 shrink-0 flex flex-col items-end pt-3.5 gap-0.5 z-10">
                                <span className="text-xs font-bold text-brand-black tabular-nums leading-none">
                                  {fmtTime(wp.estimated_arrival)}
                                </span>
                                {wp.requested_time && (
                                  <span className="text-[10px] text-gray-400 leading-none">
                                    req. {fmtTime(wp.requested_time)}
                                  </span>
                                )}
                              </div>

                              {/* Step dot */}
                              <div className="flex flex-col items-center shrink-0 z-10 pt-3">
                                <div className={`w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white ${meta.dot}`}>
                                  {i + 1}
                                </div>
                              </div>

                              {/* Card */}
                              <div className={[
                                'flex-1 bg-white rounded-2xl border p-4 shadow-sm min-w-0 transition-all',
                                isAssigned ? 'border-green-200' :
                                isSelected ? 'border-brand-red ring-1 ring-brand-red' : 'border-gray-100',
                              ].join(' ')}>

                                {/* Top row */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    {/* Checkbox for unassigned */}
                                    {!isAssigned && (
                                      <button
                                        onClick={() => toggleSelect(wp.order_id)}
                                        className={[
                                          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                                          isSelected ? 'bg-brand-red border-brand-red' : 'border-gray-300 hover:border-brand-red',
                                        ].join(' ')}
                                        aria-label="Sélectionner"
                                      >
                                        {isSelected && <IconCheck size={11} className="text-white" />}
                                      </button>
                                    )}
                                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${meta.color}`}>
                                      <meta.Icon size={11} />
                                      {meta.label}
                                    </span>
                                    <p className="font-semibold text-brand-black text-sm truncate">{wp.customer_name}</p>
                                  </div>
                                  {i > 0 && (
                                    <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                                      +{wp.duration_from_prev_min}min · {wp.distance_from_prev_km}km
                                    </span>
                                  )}
                                </div>

                                {/* Addresses */}
                                <div className="flex flex-col gap-1 mb-3">
                                  <div className="flex items-start gap-1.5 text-xs text-gray-600">
                                    <span className="w-2 h-2 rounded-full bg-brand-red mt-0.5 shrink-0" />
                                    <span className="truncate">{wp.label || 'Adresse non définie'}</span>
                                  </div>
                                  {wp.dropoff_label && (
                                    <div className="flex items-start gap-1.5 text-xs text-gray-600">
                                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-0.5 shrink-0" />
                                      <span className="truncate">{wp.dropoff_label}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Driver badge or assign button */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  {isAssigned ? (
                                    <button
                                      onClick={() => openAssign(wp)}
                                      className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors"
                                    >
                                      <IconDriver size={13} />
                                      {wp.driver_name ?? 'Conducteur assigné'}
                                      <IconCheck size={11} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openAssign(wp)}
                                      className="flex items-center gap-1.5 bg-brand-gray border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:border-brand-red hover:text-brand-red transition-colors"
                                    >
                                      <IconDriver size={13} />
                                      Affecter
                                    </button>
                                  )}
                                  <div className="flex gap-1.5">
                                    <a href={`tel:${intlPhone}`}
                                      className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                                      <IconPhone size={12} /> Appeler
                                    </a>
                                    <a href={`https://wa.me/${intlPhone.replace('+', '')}`} target="_blank" rel="noopener noreferrer"
                                      className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                                      <IconWhatsApp size={12} /> WA
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ─── COLUMN VIEW ─── */}
                {view === 'colonnes' && (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {/* Unassigned column */}
                    <div className="min-w-[280px] flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <p className="font-bold text-sm text-brand-black">Non affectés</p>
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-semibold">
                          {columnData.unassigned.length}
                        </span>
                      </div>
                      {columnData.unassigned.length === 0 ? (
                        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                          Tous les colis sont affectés
                        </div>
                      ) : (
                        columnData.unassigned.map(wp => (
                          <ColumnCard key={wp.order_id} wp={wp} onAssign={() => openAssign(wp)} />
                        ))
                      )}
                    </div>

                    {/* Driver columns */}
                    {Object.entries(columnData.byDriver).map(([dId, { driver, wps }]) => (
                      <div key={dId} className="min-w-[280px] flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <p className="font-bold text-sm text-brand-black">{driver?.name ?? 'Conducteur'}</p>
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                            {wps.length}
                          </span>
                        </div>
                        {driver && (
                          <p className="text-xs text-gray-400 -mt-2">{driver.phone}</p>
                        )}
                        {wps.map(wp => (
                          <ColumnCard key={wp.order_id} wp={wp} onAssign={() => openAssign(wp)} />
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* ─── GROUPS VIEW ─── */}
                {view === 'groupes' && (
                  <div className="flex flex-col gap-4">
                    {groupsData.groups.length === 0 && groupsData.singles.length === 0 && (
                      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-sm text-gray-400">
                        Aucun colis non affecté à regrouper
                      </div>
                    )}

                    {groupsData.groups.length > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {groupsData.groups.length} groupe{groupsData.groups.length > 1 ? 's' : ''} suggéré{groupsData.groups.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        {groupsData.groups.map((group, gi) => {
                          const totalDist = group.reduce((sum, wp, i) => {
                            if (i === 0) return sum
                            return sum + haversine(group[i-1].lat, group[i-1].lng, wp.lat, wp.lng)
                          }, 0)

                          return (
                            <div key={gi} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-bold text-sm text-brand-black">
                                    Groupe {gi + 1} — {group.length} colis proches
                                  </p>
                                  <p className="text-xs text-amber-700">
                                    Rayon ~{totalDist.toFixed(1)} km · Livrable ensemble
                                  </p>
                                </div>
                                <button
                                  onClick={() => openGroupAssign(group)}
                                  className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
                                >
                                  <IconDriver size={13} />
                                  Affecter le groupe
                                </button>
                              </div>
                              <div className="flex flex-col gap-2">
                                {group.map((wp, i) => (
                                  <div key={wp.order_id} className="bg-white rounded-xl p-3 flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                      {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm text-brand-black">{wp.customer_name}</p>
                                      <p className="text-xs text-gray-500 truncate">{wp.label}</p>
                                      {wp.dropoff_label && (
                                        <p className="text-xs text-blue-500 truncate">→ {wp.dropoff_label}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </>
                    )}

                    {groupsData.singles.length > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Trajets individuels
                          </p>
                        </div>
                        {groupsData.singles.map(wp => (
                          <div key={wp.order_id} className="bg-white rounded-2xl border border-gray-100 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-brand-black">{wp.customer_name}</p>
                                <p className="text-xs text-gray-500 truncate">{wp.label}</p>
                                {wp.dropoff_label && <p className="text-xs text-blue-500 truncate">→ {wp.dropoff_label}</p>}
                              </div>
                              {!wp.driver_id ? (
                                <button
                                  onClick={() => openAssign(wp)}
                                  className="flex items-center gap-1.5 bg-brand-gray border border-gray-200 text-gray-600 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:border-brand-red hover:text-brand-red transition-colors shrink-0"
                                >
                                  <IconDriver size={13} />
                                  Affecter
                                </button>
                              ) : (
                                <span className="flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0">
                                  <IconCheck size={11} />
                                  {wp.driver_name}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating bulk action bar */}
      {selected.size > 0 && view === 'timeline' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-brand-black text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4">
            <span className="text-sm font-semibold">{selected.size} commande{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}</span>
            <button
              onClick={openBulkAssign}
              className="bg-brand-red text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors"
            >
              Affecter →
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Assignment modal (single / bulk / group) */}
      {(assigningWp || showBulkModal || assigningGroup) && (
        <AssignModal
          title={
            showBulkModal ? `Affecter ${selected.size} commande${selected.size > 1 ? 's' : ''}` :
            assigningGroup ? `Affecter ${assigningGroup.length} colis du groupe` :
            `Affecter — ${assigningWp?.customer_name}`
          }
          subtitle={
            showBulkModal ? `${selected.size} commande${selected.size > 1 ? 's' : ''} sélectionnée${selected.size > 1 ? 's' : ''}` :
            assigningGroup ? assigningGroup.map(w => w.customer_name).join(', ') :
            assigningWp?.label ?? ''
          }
          currentDriverId={assigningWp?.driver_id ?? null}
          drivers={drivers}
          loading={assignLoading || bulkAssigning}
          onClose={() => { setAssigningWp(null); setShowBulkModal(false); setAssigningGroup(null) }}
          onAssign={(dId) => {
            if (showBulkModal) bulkAssign(dId)
            else if (assigningGroup) groupAssign(dId)
            else assign(dId)
          }}
          onUnassign={assigningWp ? () => assign(null) : undefined}
        />
      )}
    </div>
  )
}

function ColumnCard({ wp, onAssign }: { wp: RouteWaypoint; onAssign: () => void }) {
  const meta = SERVICE_META[wp.service as keyof typeof SERVICE_META] ?? SERVICE_META.taxi
  const intlPhone = '+261' + wp.customer_phone.replace(/^0/, '').replace(/\s/g, '')

  return (
    <div className={[
      'bg-white rounded-2xl border p-3 shadow-sm',
      wp.driver_id ? 'border-green-200' : 'border-gray-100',
    ].join(' ')}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.color}`}>
          <meta.Icon size={10} />
          {meta.label}
        </span>
        {wp.estimated_arrival && (
          <span className="text-[10px] text-gray-400 ml-auto tabular-nums">
            {new Date(wp.estimated_arrival).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <p className="font-semibold text-sm text-brand-black mb-0.5">{wp.customer_name}</p>
      <p className="text-xs text-gray-500 truncate mb-2">{wp.label}</p>
      {wp.dropoff_label && <p className="text-xs text-blue-500 truncate mb-2">→ {wp.dropoff_label}</p>}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onAssign}
          className={[
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-1 justify-center',
            wp.driver_id
              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              : 'bg-brand-gray border border-gray-200 text-gray-600 hover:border-brand-red hover:text-brand-red',
          ].join(' ')}
        >
          <IconDriver size={12} />
          {wp.driver_id ? (wp.driver_name ?? 'Assigné') : 'Affecter'}
        </button>
        <a href={`tel:${intlPhone}`} className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition-colors">
          <IconPhone size={11} />
        </a>
      </div>
    </div>
  )
}

function AssignModal({
  title, subtitle, currentDriverId, drivers, loading, onClose, onAssign, onUnassign,
}: {
  title: string
  subtitle: string
  currentDriverId: string | null
  drivers: Driver[]
  loading: boolean
  onClose: () => void
  onAssign: (driverId: string) => void
  onUnassign?: () => void
}) {
  const disponibles = drivers.filter(d => d.status === 'disponible')
  const occupied = drivers.filter(d => d.status !== 'disponible')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-brand-black">{title}</h2>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{subtitle}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <IconX size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-3">
          {onUnassign && currentDriverId && (
            <button
              onClick={onUnassign}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-red-200 text-brand-red hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <IconX size={16} />
              Retirer l&apos;affectation
            </button>
          )}

          {disponibles.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Disponibles</p>
              {disponibles.map(d => (
                <button
                  key={d.id}
                  onClick={() => onAssign(d.id)}
                  disabled={loading}
                  className={[
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                    currentDriverId === d.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-brand-red hover:bg-red-50',
                  ].join(' ')}
                >
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    {d.type === 'moto' ? <IconMoto size={16} className="text-green-700" /> : <IconDriver size={16} className="text-green-700" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-black text-sm">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.phone}</p>
                  </div>
                  {currentDriverId === d.id && <IconCheck size={16} className="text-green-600 shrink-0" />}
                </button>
              ))}
            </>
          )}

          {occupied.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">En course / Hors ligne</p>
              {occupied.map(d => (
                <button
                  key={d.id}
                  onClick={() => onAssign(d.id)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 opacity-60 hover:opacity-80 hover:border-gray-300 transition-all text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    {d.type === 'moto' ? <IconMoto size={16} className="text-gray-500" /> : <IconDriver size={16} className="text-gray-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-black text-sm">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.status === 'en_course' ? 'En course' : 'Hors ligne'} · {d.phone}</p>
                  </div>
                </button>
              ))}
            </>
          )}

          {drivers.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              Aucun conducteur enregistré.{' '}
              <a href="/admin/conducteurs" className="text-brand-red font-semibold hover:underline">
                Ajouter →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
