'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type OrderStatus =
  | 'client_accepted' | 'client_countered' | 'client_cancelled'
  | 'confirmed' | 'in_progress' | 'done' | 'cancelled'
type DriverOrderStatus = 'assigné' | 'accepté' | 'occupé' | 'en_cours' | 'livré' | 'problème' | 'rejeté'

interface TrackingOrder {
  id: string
  service: 'taxi' | 'colis' | 'courses'
  pickup: { label: string } | null
  dropoff: { label: string } | null
  price_offered: number | null
  distance_km: number | null
  duration_min: number | null
  status: OrderStatus
  driver_status: DriverOrderStatus | null
  driver_name: string | null
  created_at: string
  details?: Record<string, unknown>
}

const STATUS_STEPS: { status: OrderStatus; label: string; done: (s: OrderStatus) => boolean }[] = [
  { status: 'client_accepted', label: 'Demande envoyée', done: () => true },
  { status: 'confirmed',        label: 'Confirmée',        done: s => ['confirmed','in_progress','done'].includes(s) },
  { status: 'in_progress',      label: 'En livraison',     done: s => ['in_progress','done'].includes(s) },
  { status: 'done',             label: 'Livrée',           done: s => s === 'done' },
]

const STATUS_LABEL: Record<OrderStatus, { label: string; color: string }> = {
  client_accepted:  { label: 'En attente',     color: 'bg-yellow-100 text-yellow-700' },
  client_countered: { label: 'En attente',     color: 'bg-yellow-100 text-yellow-700' },
  client_cancelled: { label: 'Annulée',        color: 'bg-gray-100 text-gray-400' },
  confirmed:        { label: 'Confirmée',      color: 'bg-blue-100 text-blue-700' },
  in_progress:      { label: 'En livraison',   color: 'bg-orange-100 text-orange-700' },
  done:             { label: 'Livrée',         color: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Annulée',        color: 'bg-gray-100 text-gray-400' },
}

const DRIVER_STATUS_LABEL: Record<DriverOrderStatus, string> = {
  assigné:  'Conducteur assigné',
  accepté:  'Conducteur en route',
  occupé:   'Conducteur occupé',
  en_cours: 'En cours de livraison',
  livré:    'Livré',
  problème: 'Problème signalé',
  rejeté:   'Rejeté',
}

const SERVICE_LABEL: Record<string, string> = {
  taxi: 'Taxi-moto', colis: 'Livraison colis', courses: 'Courses',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SuiviPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<TrackingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [currentCode, setCurrentCode] = useState('')
  const [newCode, setNewCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [codeSuccess, setCodeSuccess] = useState(false)
  const [savingCode, setSavingCode] = useState(false)
  const [toast, setToast] = useState<{ title: string; body: string | null } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = (title: string, body: string | null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ title, body })
    toastTimer.current = setTimeout(() => setToast(null), 5000)
  }

  useEffect(() => {
    fetch('/api/suivi/orders')
      .then(async r => {
        if (r.status === 401) { router.push('/login'); return }
        const d = await r.json()
        setPhone(d.phone ?? '')
        setOrders(d.orders ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  // Realtime notifications for this client
  useEffect(() => {
    if (!phone) return
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('client-notifs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient=eq.${phone}`,
      }, payload => {
        const n = payload.new as { title: string; body: string | null }
        showToast(n.title, n.body)
        // Reload orders to reflect new status
        fetch('/api/suivi/orders')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setOrders(d.orders ?? []) })
          .catch(() => {})
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [phone])

  const logout = async () => {
    await fetch('/api/suivi/logout', { method: 'POST' })
    router.push('/login')
  }

  const saveCode = async () => {
    setCodeError(''); setSavingCode(true); setCodeSuccess(false)
    try {
      const res = await fetch('/api/suivi/change-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_code: currentCode, new_code: newCode }),
      })
      const d = await res.json()
      if (!res.ok) { setCodeError(d.error ?? 'Erreur'); return }
      setCodeSuccess(true)
      setCurrentCode(''); setNewCode('')
    } catch { setCodeError('Erreur réseau') }
    finally { setSavingCode(false) }
  }

  const active = orders.filter(o => !['done', 'cancelled', 'client_cancelled'].includes(o.status))
  const past   = orders.filter(o =>  ['done', 'cancelled', 'client_cancelled'].includes(o.status))

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Notification toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-[#0D0D0F] rounded-2xl p-4 shadow-xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center shrink-0 mt-0.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-snug">{toast.title}</p>
              {toast.body && <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{toast.body}</p>}
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-500 hover:text-gray-300 transition-colors shrink-0"
              aria-label="Fermer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#0D0D0F] px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-white font-bold text-base">Mes commandes</p>
            <p className="text-gray-500 text-xs">{phone}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(s => !s)}
              className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
              aria-label="Paramètres"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </button>
            <button onClick={logout} className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
              Déconnexion
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white font-bold text-lg">{orders.length}</p>
            <p className="text-gray-500 text-[10px]">Total</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-orange-400 font-bold text-lg">{active.length}</p>
            <p className="text-gray-500 text-[10px]">En cours</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold text-lg">{past.filter(o => o.status === 'done').length}</p>
            <p className="text-gray-500 text-[10px]">Livrées</p>
          </div>
        </div>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-100 px-4 py-5">
          <h2 className="font-bold text-brand-black mb-4 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><circle cx="12" cy="12" r="3"/></svg>
            Modifier mon code de suivi
          </h2>
          <div className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              value={currentCode}
              onChange={e => setCurrentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Code actuel (6 chiffres)"
              className="bg-brand-gray border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red"
            />
            <input
              type="text"
              inputMode="numeric"
              value={newCode}
              onChange={e => setNewCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Nouveau code (6 chiffres)"
              className="bg-brand-gray border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-red"
            />
            {codeError && <p className="text-sm text-brand-red">{codeError}</p>}
            {codeSuccess && <p className="text-sm text-green-600">Code modifié avec succès !</p>}
            <button
              onClick={saveCode}
              disabled={savingCode || currentCode.length !== 6 || newCode.length !== 6}
              className="bg-brand-red text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40 hover:bg-red-700 transition-colors"
            >
              {savingCode ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Orders */}
      <div className="px-4 py-4 flex flex-col gap-4">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Chargement…</div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-gray-300">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <p className="font-semibold text-brand-black">Aucune commande</p>
            <p className="text-sm text-gray-400">Vos futures commandes apparaîtront ici</p>
            <a href="/commander" className="bg-brand-red text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
              Commander maintenant
            </a>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">En cours</p>
                {active.map(order => <OrderCard key={order.id} order={order} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">Historique</p>
                {past.map(order => <OrderCard key={order.id} order={order} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function OrderCard({ order }: { order: TrackingOrder }) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = STATUS_LABEL[order.status]
  const isCancelled = ['cancelled', 'client_cancelled'].includes(order.status)
  const isDone = order.status === 'done'

  return (
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isDone ? 'opacity-80' : ''}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs font-medium">
                {SERVICE_LABEL[order.service] ?? order.service}
              </span>
            </div>
            <p className="text-xs text-gray-400">{fmtDate(order.created_at)}</p>
          </div>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Driver status banner */}
        {order.driver_status && !isCancelled && (
          <div className={[
            'mt-2 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl',
            order.driver_status === 'livré'    ? 'bg-green-50 text-green-700' :
            order.driver_status === 'en_cours' ? 'bg-orange-50 text-orange-700' :
            order.driver_status === 'problème' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700',
          ].join(' ')}>
            <span className={[
              'w-2 h-2 rounded-full',
              order.driver_status === 'en_cours' ? 'bg-orange-500 animate-pulse' :
              order.driver_status === 'livré'    ? 'bg-green-500' :
              'bg-blue-500',
            ].join(' ')} />
            {DRIVER_STATUS_LABEL[order.driver_status]}
            {order.driver_name && ` · ${order.driver_name}`}
          </div>
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 flex flex-col gap-3">
          {/* Route */}
          {(order.pickup || order.dropoff) && (
            <div className="flex flex-col gap-1.5">
              {order.pickup && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-brand-red mt-1 shrink-0" />
                  <span>{order.pickup.label}</span>
                </div>
              )}
              {order.dropoff && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                  <span>{order.dropoff.label}</span>
                </div>
              )}
            </div>
          )}

          {/* Chips */}
          <div className="flex gap-2 flex-wrap">
            {order.price_offered && (
              <span className="bg-brand-gray text-brand-black px-2.5 py-1 rounded-lg text-xs font-semibold">
                {order.price_offered.toLocaleString('fr-MG')} Ar
              </span>
            )}
            {order.distance_km && (
              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs">
                {order.distance_km} km
              </span>
            )}
            {order.duration_min && (
              <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs">
                ~{order.duration_min} min
              </span>
            )}
          </div>

          {/* Progress steps */}
          {!isCancelled && (
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, i) => {
                const done = step.done(order.status)
                const isCurrent = order.status === step.status ||
                  (i === 1 && order.status === 'client_countered') ||
                  (i === 0 && order.status === 'client_accepted')
                return (
                  <div key={step.status} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <div className={[
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px]',
                        done ? 'bg-green-500 border-green-500 text-white' :
                        isCurrent ? 'border-brand-red bg-red-50' : 'border-gray-300 bg-white',
                      ].join(' ')}>
                        {done && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </div>
                      <p className={`text-[9px] text-center leading-tight max-w-[50px] ${done ? 'text-green-600' : isCurrent ? 'text-brand-red font-semibold' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-0.5 mb-4 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Order ID */}
          <p className="text-[10px] text-gray-400 font-mono">#{order.id.slice(0, 8)}</p>
        </div>
      )}
    </div>
  )
}
