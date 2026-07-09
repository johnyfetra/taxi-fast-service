'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, DriverOrderStatus } from '@/lib/types'

const SERVICE_META = {
  taxi:    { label: 'Taxi-moto', color: 'bg-blue-100 text-blue-700',   border: 'border-blue-200' },
  colis:   { label: 'Colis',     color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
  courses: { label: 'Courses',   color: 'bg-green-100 text-green-700', border: 'border-green-200' },
} as const

const STATUS_META: Record<DriverOrderStatus, { label: string; color: string }> = {
  'assigné':   { label: 'Nouvelle commande', color: 'bg-purple-100 text-purple-700' },
  'accepté':   { label: 'Acceptée',          color: 'bg-blue-100 text-blue-700' },
  'occupé':    { label: 'Occupé',            color: 'bg-gray-100 text-gray-500' },
  'en_cours':  { label: 'En cours',          color: 'bg-orange-100 text-orange-700' },
  'livré':     { label: 'Livré',             color: 'bg-green-100 text-green-700' },
  'problème':  { label: 'Problème',          color: 'bg-red-100 text-red-700' },
  'rejeté':    { label: 'Rejeté',            color: 'bg-gray-100 text-gray-400' },
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

type OrderWithStatus = Order & { driver_status: DriverOrderStatus | null }

const NEXT_ACTIONS: Record<DriverOrderStatus, { label: string; next: DriverOrderStatus; variant: string }[]> = {
  'assigné':  [
    { label: '✓ Accepter',  next: 'accepté', variant: 'bg-green-500 text-white' },
    { label: '✕ Occupé',   next: 'occupé',  variant: 'bg-gray-200 text-gray-700 dark:bg-[#2A2A2C] dark:text-gray-300' },
  ],
  'accepté':  [{ label: '▶ Démarrer', next: 'en_cours', variant: 'bg-blue-500 text-white' }],
  'en_cours': [
    { label: '✓ Livré',    next: 'livré',    variant: 'bg-green-500 text-white' },
    { label: '⚠ Problème', next: 'problème', variant: 'bg-orange-400 text-white' },
    { label: '✕ Rejeter',  next: 'rejeté',   variant: 'bg-gray-200 text-gray-700 dark:bg-[#2A2A2C] dark:text-gray-300' },
  ],
  'occupé':   [],
  'livré':    [],
  'problème': [{ label: '▶ Reprendre', next: 'en_cours', variant: 'bg-blue-500 text-white' }],
  'rejeté':   [],
}

export default function DriverDashboard() {
  const [orders, setOrders] = useState<OrderWithStatus[]>([])
  const [history, setHistory] = useState<Partial<OrderWithStatus>[]>([])
  const [loading, setLoading] = useState(true)
  const [driverName, setDriverName] = useState('')
  const [driverId, setDriverId] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [tab, setTab] = useState<'today' | 'history'>('today')
  const [showPinChange, setShowPinChange] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)
  const [savingPin, setSavingPin] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/chauffeur/orders')
    if (res.status === 401) { window.location.href = '/login'; return }
    if (res.ok) {
      const data = await res.json()
      setOrders(data.orders ?? [])
      setHistory(data.history ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Get driver info from cookie (client-side read)
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('tfs_driver='))
    if (cookie) {
      const id = cookie.split('=')[1]?.split(':')[0]
      if (id) setDriverId(id)
    }
    load()
  }, [load])

  // Supabase Realtime — listen for new assignments
  useEffect(() => {
    if (!driverId) return
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('driver-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `driver_id=eq.${driverId}`,
      }, () => { load() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [driverId, load])

  // Fetch driver name from order data or cookie
  useEffect(() => {
    if (orders.length > 0 && !driverName) {
      // Try to get from API
      fetch('/api/admin/drivers')
        .then(r => r.ok ? r.json() : [])
        .then((drivers: Array<{id: string; name: string}>) => {
          const d = drivers.find(dr => dr.id === driverId)
          if (d) setDriverName(d.name)
        })
        .catch(() => {})
    }
  }, [orders, driverId, driverName])

  const updateStatus = async (orderId: string, status: DriverOrderStatus) => {
    setUpdating(orderId)
    try {
      const res = await fetch(`/api/chauffeur/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_status: status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrders(prev => {
          // If rejeté or occupé: remove from active list
          if (['rejeté', 'occupé'].includes(updated.driver_status)) {
            return prev.filter(o => o.id !== orderId)
          }
          return prev.map(o => o.id === orderId ? { ...o, driver_status: updated.driver_status, status: updated.status } : o)
        })
        if (updated.driver_status === 'livré') await load()
      }
    } finally { setUpdating(null) }
  }

  const logout = async () => {
    await fetch('/api/chauffeur/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const savePin = async () => {
    setPinError(''); setSavingPin(true); setPinSuccess(false)
    try {
      const res = await fetch('/api/chauffeur/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
      })
      const d = await res.json()
      if (!res.ok) { setPinError(d.error ?? 'Erreur'); return }
      setPinSuccess(true); setCurrentPin(''); setNewPin('')
    } catch { setPinError('Erreur réseau') }
    finally { setSavingPin(false) }
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0A0A0B] flex flex-col">
      {/* Header */}
      <header className="bg-[#0D0D0F] px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-bold text-base">{driverName || 'Conducteur'}</p>
            <p className="text-gray-500 text-xs capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPinChange(s => !s)}
              className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center"
              aria-label="Changer le PIN"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </button>
            <button onClick={logout} className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
              Déconnexion
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white font-bold text-lg">{orders.length}</p>
            <p className="text-gray-500 text-[10px]">Actives</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold text-lg">{orders.filter(o => o.driver_status === 'livré').length + history.filter(h => h.driver_status === 'livré').length}</p>
            <p className="text-gray-500 text-[10px]">Livrées</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-orange-400 font-bold text-lg">{orders.filter(o => o.driver_status === 'problème').length}</p>
            <p className="text-gray-500 text-[10px]">Problèmes</p>
          </div>
        </div>
      </header>

      {/* PIN change panel */}
      {showPinChange && (
        <div className="bg-white dark:bg-[#141416] border-b border-gray-100 dark:border-[#1E1E20] px-4 py-5">
          <h2 className="font-bold text-brand-black dark:text-white mb-3 text-sm">Modifier mon PIN</h2>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="PIN actuel (4 chiffres)"
              className="bg-brand-gray dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#2A2A2C] dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red"
            />
            <input
              type="text"
              inputMode="numeric"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Nouveau PIN (4 chiffres)"
              className="bg-brand-gray dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#2A2A2C] dark:text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red"
            />
            {pinError && <p className="text-xs text-brand-red">{pinError}</p>}
            {pinSuccess && <p className="text-xs text-green-600">PIN modifié avec succès !</p>}
            <button
              onClick={savePin}
              disabled={savingPin || currentPin.length !== 4 || newPin.length !== 4}
              className="bg-brand-red text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-red-700 transition-colors"
            >
              {savingPin ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white dark:bg-[#141416] border-b border-gray-100 dark:border-[#1E1E20]">
        {(['today', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 py-3 text-sm font-semibold transition-colors',
              tab === t ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400',
            ].join(' ')}
          >
            {t === 'today' ? `Aujourd'hui (${orders.length})` : `Historique (${history.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Chargement…</div>
        ) : tab === 'today' ? (
          orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-white dark:bg-[#141416] flex items-center justify-center shadow-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                </svg>
              </div>
              <p className="font-semibold text-brand-black dark:text-white">Aucune commande assignée</p>
              <p className="text-sm text-gray-400">L&apos;admin vous assignera des trajets</p>
            </div>
          ) : (
            orders.map(order => {
              const svc = SERVICE_META[order.service as keyof typeof SERVICE_META] ?? SERVICE_META.taxi
              const st = order.driver_status ? STATUS_META[order.driver_status] : null
              const actions = order.driver_status ? (NEXT_ACTIONS[order.driver_status] ?? []) : []
              const intlPhone = '+261' + order.customer_phone.replace(/^0/, '').replace(/\s/g, '')
              const isNew = order.driver_status === 'assigné'

              return (
                <div
                  key={order.id}
                  className={[
                    'bg-white dark:bg-[#141416] rounded-2xl shadow-sm overflow-hidden',
                    isNew ? 'ring-2 ring-purple-400 ring-offset-1' : '',
                  ].join(' ')}
                >
                  {/* New assignment banner */}
                  {isNew && (
                    <div className="bg-purple-500 px-4 py-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-white text-xs font-bold tracking-wide">NOUVELLE COMMANDE ASSIGNÉE</span>
                    </div>
                  )}

                  <div className="p-4">
                    {/* Top */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${svc.color}`}>{svc.label}</span>
                        {st && <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.color}`}>{st.label}</span>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{fmtTime(order.created_at)}</span>
                    </div>

                    {/* Customer */}
                    <p className="font-bold text-brand-black dark:text-white mb-1">{order.customer_name}</p>

                    {/* Route */}
                    <div className="flex flex-col gap-1.5 mb-3">
                      {order.pickup && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 rounded-full bg-brand-red mt-1 shrink-0" />
                          <span>{order.pickup.label}</span>
                        </div>
                      )}
                      {order.dropoff && (
                        <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                          <span>{order.dropoff.label}</span>
                        </div>
                      )}
                    </div>

                    {/* Info chips */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {order.distance_km && (
                        <span className="bg-gray-100 dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                          {order.distance_km} km
                        </span>
                      )}
                      {order.duration_min && (
                        <span className="bg-gray-100 dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                          ~{order.duration_min} min
                        </span>
                      )}
                      {order.price_offered && (
                        <span className="bg-brand-gray dark:bg-[#1C1C1E] text-brand-black dark:text-white px-2.5 py-1 rounded-lg text-xs font-semibold">
                          {order.price_offered.toLocaleString('fr-MG')} Ar
                        </span>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="flex gap-2 mb-2">
                      <a
                        href={`tel:${intlPhone}`}
                        className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#1C1C1E] text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-sm font-medium"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                        Appeler
                      </a>
                      <a
                        href={`https://wa.me/${intlPhone.replace('+', '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-xl text-sm font-medium"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        WA
                      </a>
                    </div>

                    {/* Actions */}
                    {actions.length > 0 && (
                      <div className="flex gap-2">
                        {actions.map(action => (
                          <button
                            key={action.next}
                            onClick={() => updateStatus(order.id, action.next)}
                            disabled={updating === order.id}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${action.variant}`}
                          >
                            {updating === order.id ? '…' : action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )
        ) : (
          // History tab
          history.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">Aucun historique</div>
          ) : (
            history.map(order => (
              <div key={order.id} className="bg-white dark:bg-[#141416] rounded-2xl p-4 shadow-sm opacity-70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-brand-black dark:text-white text-sm">{order.customer_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{order.service}</p>
                  </div>
                  {order.driver_status && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_META[order.driver_status]?.color ?? ''}`}>
                      {STATUS_META[order.driver_status]?.label}
                    </span>
                  )}
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}
