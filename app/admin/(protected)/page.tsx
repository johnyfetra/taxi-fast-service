'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import OrderCard from '@/components/admin/OrderCard'
import type { Order, OrderStatus } from '@/lib/types'

function todayStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active'>('active')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const interactedRef = useRef(false)

  const supabase = createClient()

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
  }, [])

  // Layout guards against null supabase — this never renders without it
  if (!supabase) return null

  const playSound = useCallback(() => {
    if (!interactedRef.current || !audioRef.current) return
    audioRef.current.play().catch(() => {})
  }, [])

  // Initial load
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', todayStart())
        .order('created_at', { ascending: false })
      setOrders((data as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('orders-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders((prev) => [payload.new as Order, ...prev])
          playSound()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, playSound])

  const handleStatusChange = useCallback(
    async (id: string, status: OrderStatus) => {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        alert('Erreur lors de la mise à jour du statut')
      }
    },
    []
  )

  const ACTIVE_STATUSES: OrderStatus[] = ['client_accepted', 'client_countered', 'confirmed', 'in_progress']
  const displayed = filter === 'active'
    ? orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
    : orders

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length

  return (
    // First interaction enables audio
    <div
      className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-4"
      onClick={() => { interactedRef.current = true }}
    >
      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Commandes du jour</h1>
          <p className="text-xs text-gray-500">{orders.length} au total · {activeCount} actives</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('active')}
            className={[
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              filter === 'active' ? 'bg-brand-red text-white' : 'bg-white border border-gray-200 text-gray-600',
            ].join(' ')}
          >
            Actives {activeCount > 0 && `(${activeCount})`}
          </button>
          <button
            onClick={() => setFilter('all')}
            className={[
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
              filter === 'all' ? 'bg-brand-red text-white' : 'bg-white border border-gray-200 text-gray-600',
            ].join(' ')}
          >
            Toutes
          </button>
        </div>
      </div>

      {/* Tarifs link */}
      <a
        href="/admin/tarifs"
        className="bg-white rounded-2xl border border-gray-200 px-4 py-3 text-sm flex items-center justify-between hover:border-gray-300 transition-colors"
      >
        <span className="font-medium text-brand-black">⚙️ Gérer les tarifs</span>
        <span className="text-gray-400">→</span>
      </a>

      {/* Orders list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {filter === 'active' ? 'Aucune commande active' : 'Aucune commande aujourd\'hui'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayed.map((order) => (
            <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}
