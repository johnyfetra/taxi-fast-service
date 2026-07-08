'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { Driver, Order, DriverOrderStatus } from '@/lib/types'
import { IconDriver, IconPhone, IconWhatsApp, IconMoto, IconBike } from '@/components/icons'

const STATUS_DOT: Record<Driver['status'], string> = {
  disponible: 'bg-green-500',
  en_course:  'bg-blue-500',
  hors_ligne: 'bg-gray-400',
}
const STATUS_LABEL: Record<Driver['status'], string> = {
  disponible: 'Disponible',
  en_course:  'En course',
  hors_ligne: 'Hors ligne',
}
const DRIVER_STATUS_META: Record<DriverOrderStatus, { label: string; color: string }> = {
  'assigné':  { label: 'Assigné',    color: 'bg-purple-100 text-purple-700' },
  'accepté':  { label: 'Accepté',    color: 'bg-blue-100 text-blue-700' },
  'occupé':   { label: 'Occupé',     color: 'bg-gray-100 text-gray-500' },
  'en_cours': { label: 'En cours',   color: 'bg-orange-100 text-orange-700' },
  'livré':    { label: 'Livré',      color: 'bg-green-100 text-green-700' },
  'problème': { label: 'Problème',   color: 'bg-red-100 text-red-700' },
  'rejeté':   { label: 'Rejeté',     color: 'bg-gray-100 text-gray-400' },
}

const SVC_COLOR: Record<string, string> = {
  taxi:    'bg-blue-100 text-blue-700',
  colis:   'bg-amber-100 text-amber-700',
  courses: 'bg-green-100 text-green-700',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [drRes, ordRes] = await Promise.all([
        fetch('/api/admin/drivers'),
        fetch(`/api/admin/orders?driver_id=${id}`),
      ])
      if (drRes.ok) {
        const drivers: Driver[] = await drRes.json()
        setDriver(drivers.find(d => d.id === id) ?? null)
      }
      if (ordRes.ok) setOrders(await ordRes.json())
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chargement…</div>
  if (!driver) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Conducteur introuvable</div>

  const intlPhone = '+261' + driver.phone.replace(/^0/, '').replace(/\s/g, '')
  const delivered = orders.filter(o => o.driver_status === 'livré').length
  const problems  = orders.filter(o => o.driver_status === 'problème').length
  const active    = orders.filter(o => !['livré', 'rejeté', 'occupé'].includes(o.driver_status ?? '')).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <a href="/admin/conducteurs" className="text-sm text-gray-400 hover:text-brand-black">← Conducteurs</a>
        </div>
        <h1 className="text-xl font-bold text-brand-black">{driver.name}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-gray flex items-center justify-center">
              {driver.type === 'moto' ? <IconMoto size={24} className="text-gray-500" /> : <IconBike size={24} className="text-gray-500" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-brand-black text-lg">{driver.name}</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${driver.status === 'disponible' ? 'bg-green-100 text-green-700' : driver.status === 'en_course' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[driver.status]}`} />
                  {STATUS_LABEL[driver.status]}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{driver.phone} · {driver.type === 'moto' ? 'Moto' : 'Vélo'}</p>
              {driver.notes && <p className="text-xs text-gray-400 mt-1 italic">{driver.notes}</p>}
            </div>
          </div>

          {/* Contact */}
          <div className="flex gap-2 mt-4">
            <a href={`tel:${intlPhone}`}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              <IconPhone size={15} /> Appeler
            </a>
            <a href={`https://wa.me/${intlPhone.replace('+', '')}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
              <IconWhatsApp size={15} /> WhatsApp
            </a>
          </div>

          {/* PIN */}
          {driver.pin_code && (
            <div className="mt-4 bg-brand-gray rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Code PIN conducteur</p>
                <p className="font-mono font-bold text-brand-black text-xl tracking-widest mt-0.5">{driver.pin_code}</p>
              </div>
              <p className="text-xs text-gray-400">Login: {driver.phone}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-brand-black">{orders.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total</p>
          </div>
          <div className="bg-green-50 rounded-2xl border border-green-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{delivered}</p>
            <p className="text-xs text-green-600 mt-0.5">Livrés</p>
          </div>
          <div className={`rounded-2xl border p-4 text-center ${problems > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
            <p className={`text-2xl font-bold ${problems > 0 ? 'text-brand-red' : 'text-gray-400'}`}>{problems}</p>
            <p className={`text-xs mt-0.5 ${problems > 0 ? 'text-red-500' : 'text-gray-400'}`}>Problèmes</p>
          </div>
        </div>

        {/* Active orders */}
        {active > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">En cours</p>
            <div className="flex flex-col gap-2">
              {orders.filter(o => !['livré', 'rejeté', 'occupé'].includes(o.driver_status ?? '')).map(o => (
                <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SVC_COLOR[o.service] ?? ''}`}>{o.service}</span>
                      <p className="font-semibold text-brand-black text-sm">{o.customer_name}</p>
                    </div>
                    {o.driver_status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${DRIVER_STATUS_META[o.driver_status]?.color}`}>
                        {DRIVER_STATUS_META[o.driver_status]?.label}
                      </span>
                    )}
                  </div>
                  {o.pickup && <p className="text-xs text-gray-500 truncate">↳ {o.pickup.label}</p>}
                  {o.dropoff && <p className="text-xs text-gray-500 truncate">→ {o.dropoff.label}</p>}
                  <p className="text-xs text-gray-400 mt-1">{fmt(o.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All assignments */}
        {orders.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Toutes les commandes assignées</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {orders.map(o => (
                <div key={o.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-black truncate">{o.customer_name}</p>
                    <p className="text-xs text-gray-400">{fmt(o.created_at)} · {o.service}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {o.driver_status && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DRIVER_STATUS_META[o.driver_status]?.color}`}>
                        {DRIVER_STATUS_META[o.driver_status]?.label}
                      </span>
                    )}
                    {o.price_offered && (
                      <span className="text-xs font-semibold text-gray-500">{o.price_offered.toLocaleString('fr-MG')} Ar</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
