'use client'
import dynamic from 'next/dynamic'
import Badge from '@/components/ui/Badge'
import { IconPhone, IconWhatsApp } from '@/components/icons'
import type { Order, OrderStatus } from '@/lib/types'

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false })

interface Props {
  order: Order
  onStatusChange: (id: string, status: OrderStatus) => void
}

const WA_NUMBER = '261346143066'

function fmt(n: number): string {
  return n.toLocaleString('fr-MG')
}

const statusActions: { label: string; next: OrderStatus }[] = [
  { label: '✓ Confirmer', next: 'confirmed' },
  { label: '🏍️ En course', next: 'in_progress' },
  { label: '✅ Terminé', next: 'done' },
  { label: '✗ Annuler', next: 'cancelled' },
]

export default function OrderCard({ order, onStatusChange }: Props) {
  const serviceLabel =
    order.service === 'taxi' ? '🏍️ Taxi-moto' : order.service === 'colis' ? '📦 Colis' : '🛒 Courses'

  const waMessage = encodeURIComponent(
    `Bonjour ${order.customer_name}, commande ${order.service} confirmée !`
  )

  const availableActions = statusActions.filter((a) => {
    if (order.status === 'done' || order.status === 'cancelled') return false
    if (a.next === 'confirmed') return ['client_accepted', 'client_countered'].includes(order.status)
    if (a.next === 'in_progress') return order.status === 'confirmed'
    if (a.next === 'done') return order.status === 'in_progress'
    if (a.next === 'cancelled') return true // status is already known not to be 'done'/'cancelled'
    return false
  })

  return (
    <div
      className={[
        'bg-white rounded-2xl border p-4 flex flex-col gap-3',
        order.status === 'client_countered' ? 'border-brand-red' : 'border-gray-200',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-brand-black text-sm">{serviceLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Badge status={order.status} />
      </div>

      {/* Prix */}
      {order.status === 'client_countered' ? (
        <div className="flex items-center gap-3 bg-red-50 rounded-xl px-3 py-2">
          <div className="text-center">
            <p className="text-xs text-gray-500">Proposé</p>
            <p className="font-semibold text-gray-600 text-sm">{fmt(order.price_offered!)} Ar</p>
          </div>
          <span className="text-gray-400">→</span>
          <div className="text-center">
            <p className="text-xs text-gray-500">Contre-offre</p>
            <p className="font-bold text-brand-red">{fmt(order.counter_offer!)} Ar</p>
          </div>
        </div>
      ) : order.price_offered ? (
        <p className="text-sm font-semibold text-brand-black">
          💰 {fmt(order.price_offered)} Ar
          {order.distance_km && (
            <span className="text-gray-400 font-normal"> · {order.distance_km} km</span>
          )}
          {order.duration_min && (
            <span className="text-gray-400 font-normal"> · {order.duration_min} min</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-gray-500">Prix sur devis</p>
      )}

      {/* Adresses + carte du trajet */}
      <div className="flex flex-col gap-2 text-sm">
        {order.pickup && (
          <div className="flex items-start gap-1.5 text-gray-700">
            <span className="w-2 h-2 rounded-full bg-brand-red mt-1 flex-shrink-0" />
            {order.pickup.label}
          </div>
        )}
        {order.dropoff && (
          <div className="flex items-start gap-1.5 text-gray-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
            {order.dropoff.label}
          </div>
        )}
        {order.pickup && order.dropoff && order.service !== 'courses' && (
          <RouteMap pickup={order.pickup} dropoff={order.dropoff} />
        )}
      </div>

      {/* Client */}
      <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-sm text-brand-black">{order.customer_name}</p>
          <p className="text-xs text-gray-500">{order.customer_phone}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`tel:+261${order.customer_phone.replace(/\s/g, '').replace(/^0/, '')}`}
            className="w-10 h-10 rounded-xl bg-brand-gray border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-brand-black transition-colors"
            aria-label={`Appeler ${order.customer_name}`}
          >
            <IconPhone size={18} />
          </a>
          <a
            href={`https://wa.me/${WA_NUMBER}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
            aria-label={`WhatsApp ${order.customer_name}`}
          >
            <IconWhatsApp size={18} />
          </a>
        </div>
      </div>

      {/* Actions */}
      {availableActions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          {availableActions.map((action) => (
            <button
              key={action.next}
              onClick={() => onStatusChange(order.id, action.next)}
              className={[
                'flex-1 min-w-[80px] py-2 px-3 rounded-xl text-xs font-semibold transition-all min-h-9',
                action.next === 'cancelled'
                  ? 'border border-gray-300 text-gray-600 hover:border-red-300 hover:text-brand-red'
                  : 'bg-brand-black text-white hover:bg-gray-800',
              ].join(' ')}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
