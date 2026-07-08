'use client'
import { useEffect, useState } from 'react'
import type { DailyRevenue } from '@/lib/types'
import { IconTrendUp, IconMoto, IconPackage, IconShopping } from '@/components/icons'

function formatAr(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return Math.round(n / 1000) + 'k'
  return n.toString()
}

function BarChart({ data }: { data: DailyRevenue[] }) {
  if (!data.length) return <div className="h-32 flex items-center justify-center text-xs text-gray-400">Aucune donnée</div>
  const maxRev = Math.max(...data.map(d => d.revenue_ar), 1)
  const reversed = [...data].reverse().slice(-14)
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {reversed.map((d) => {
        const h = Math.max((d.revenue_ar / maxRev) * 100, d.revenue_ar > 0 ? 4 : 2)
        const date = new Date(d.day)
        const label = (date.getMonth() + 1) + '/' + date.getDate()
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-brand-black text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {formatAr(d.revenue_ar)} Ar
            </div>
            <div
              style={{ height: `${h}%` }}
              className={`w-full rounded-t-md ${d.revenue_ar > 0 ? 'bg-brand-red' : 'bg-gray-200'}`}
            />
            <span className="text-[9px] text-gray-400 leading-none">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<DailyRevenue[]>([])
  const [period, setPeriod] = useState<'day' | 'month'>('day')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/analytics?period=${period}&limit=30`)
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [period])

  const today = data[0]
  const total30 = data.reduce((s, d) => s + d.revenue_ar, 0)
  const totalOrders = data.reduce((s, d) => s + d.order_count, 0)
  const totalTaxi = data.reduce((s, d) => s + (d.taxi_count ?? 0), 0)
  const totalColis = data.reduce((s, d) => s + (d.colis_count ?? 0), 0)
  const totalCourses = data.reduce((s, d) => s + (d.courses_count ?? 0), 0)

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <h1 className="text-lg font-bold text-brand-black">Analytics</h1>

      {/* Period toggle */}
      <div className="flex gap-2">
        {(['day', 'month'] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${period === p ? 'bg-brand-red text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {p === 'day' ? '30 derniers jours' : '12 derniers mois'}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brand-black text-white rounded-2xl p-4 col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <IconTrendUp size={14} className="text-brand-red" />
            <span className="text-xs text-gray-400">CA total ({period === 'day' ? '30j' : '12 mois'})</span>
          </div>
          <p className="text-2xl font-black">{formatAr(total30)} <span className="text-sm font-normal text-gray-400">Ar</span></p>
          <p className="text-xs text-gray-500 mt-1">{totalOrders} commandes</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100">
          <div className="flex items-center gap-1.5 mb-1">
            <IconMoto size={14} className="text-brand-red" />
            <span className="text-xs text-gray-500">Taxi</span>
          </div>
          <p className="text-xl font-bold text-brand-black">{totalTaxi}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 border border-gray-100">
          <div className="flex items-center gap-1.5 mb-1">
            <IconPackage size={14} className="text-brand-red" />
            <span className="text-xs text-gray-500">Colis</span>
          </div>
          <p className="text-xl font-bold text-brand-black">{totalColis}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-brand-black mb-4">Revenus par {period === 'day' ? 'jour' : 'mois'}</h2>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-xs text-gray-400">Chargement…</div>
        ) : (
          <BarChart data={data} />
        )}
      </div>

      {/* Today detail */}
      {today && period === 'day' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-brand-black mb-3">Aujourd&apos;hui</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">CA</span>
              <span className="font-semibold">{formatAr(today.revenue_ar)} Ar</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Commandes</span>
              <span className="font-semibold">{today.order_count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Taxi</span>
              <span className="font-semibold">{today.taxi_count ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Colis</span>
              <span className="font-semibold">{today.colis_count ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Courses</span>
              <span className="font-semibold">{today.courses_count ?? 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
