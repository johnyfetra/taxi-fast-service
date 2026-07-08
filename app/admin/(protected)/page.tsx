'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, OrderStatus, ServiceType, DailyRevenue } from '@/lib/types'
import OrderCard from '@/components/admin/OrderCard'
import NotificationBell from '@/components/admin/NotificationBell'
import { IconSearch, IconTrendUp, IconMoto, IconPackage, IconShopping, IconDownload } from '@/components/icons'

function todayStart(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
}
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1000) return Math.round(n / 1000) + 'k'
  return n.toString()
}
function fmtDate(iso: string): string {
  const d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate()
}

function LineChart({ data }: { data: DailyRevenue[] }) {
  if (!data.length) return <div className="h-40 flex items-center justify-center text-xs text-gray-300">Aucune donnée</div>
  const sorted = [...data].reverse().slice(-14)
  const W = 600, H = 180, PAD = { top: 12, right: 16, bottom: 32, left: 48 }
  const innerW = W - PAD.left - PAD.right, innerH = H - PAD.top - PAD.bottom
  const maxRev = Math.max(...sorted.map(d => d.revenue_ar), 1)
  const xS = (i: number) => PAD.left + (i / Math.max(sorted.length - 1, 1)) * innerW
  const yS = (v: number) => PAD.top + innerH - (v / maxRev) * innerH
  const pts = sorted.map((d, i) => ({ x: xS(i), y: yS(d.revenue_ar), d }))
  let lp = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = (pts[i-1].x + pts[i].x) / 2
    lp += ` C ${cpx} ${pts[i-1].y} ${cpx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  const ap = lp + ` L ${pts[pts.length-1].x} ${PAD.top+innerH} L ${pts[0].x} ${PAD.top+innerH} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lg-rev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D81F26" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#D81F26" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line x1={PAD.left} y1={yS(maxRev*t)} x2={W-PAD.right} y2={yS(maxRev*t)} stroke="#F0F0F0" strokeWidth="1"/>
          <text x={PAD.left-6} y={yS(maxRev*t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9CA3AF">{fmt(Math.round(maxRev*t))}</text>
        </g>
      ))}
      <path d={ap} fill="url(#lg-rev)"/>
      <path d={lp} fill="none" stroke="#D81F26" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(({x, y, d}, i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="white" stroke="#D81F26" strokeWidth="2"/>
          {(sorted.length <= 10 || i % 2 === 0) && (
            <text x={x} y={H-4} textAnchor="middle" fontSize="9" fill="#9CA3AF">{fmtDate(d.day)}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

function DonutChart({ taxi, colis, courses }: { taxi: number; colis: number; courses: number }) {
  const total = taxi + colis + courses
  if (!total) return <div className="h-full flex items-center justify-center text-xs text-gray-400">Aucune donnée</div>
  const R = 52, CX = 70, CY = 70, SW = 18
  const segs = [
    { value: taxi, color: '#D81F26', label: 'Taxi' },
    { value: colis, color: '#0D0D0F', label: 'Colis' },
    { value: courses, color: '#9CA3AF', label: 'Courses' },
  ]
  let cum = -Math.PI / 2
  const arcs = segs.map(s => {
    const a = (s.value / total) * 2 * Math.PI
    const x1 = CX + R * Math.cos(cum), y1 = CY + R * Math.sin(cum)
    cum += a
    const x2 = CX + R * Math.cos(cum), y2 = CY + R * Math.sin(cum)
    return { ...s, d: `M ${x1} ${y1} A ${R} ${R} 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2}`, pct: Math.round((s.value/total)*100) }
  })
  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 140 140" className="w-36 h-36">
        {arcs.map(a => <path key={a.label} d={a.d} fill="none" stroke={a.color} strokeWidth={SW}/>)}
        <text x={CX} y={CY-6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#0D0D0F">{total}</text>
        <text x={CX} y={CY+10} textAnchor="middle" fontSize="9" fill="#9CA3AF">commandes</text>
      </svg>
      <div className="flex flex-col gap-1.5 w-full">
        {arcs.map(a => (
          <div key={a.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: a.color}}/>
              <span className="text-gray-600">{a.label}</span>
            </div>
            <span className="font-semibold text-brand-black">{a.value} <span className="text-gray-400">({a.pct}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

const SC: Record<string, {label: string; cls: string}> = {
  client_accepted:  {label:'Reçue',        cls:'bg-blue-50 text-blue-700'},
  client_countered: {label:'Contre-offre', cls:'bg-amber-50 text-amber-700'},
  confirmed:        {label:'Confirmée',    cls:'bg-indigo-50 text-indigo-700'},
  in_progress:      {label:'En cours',     cls:'bg-purple-50 text-purple-700'},
  done:             {label:'Terminée',     cls:'bg-green-50 text-green-700'},
  cancelled:        {label:'Annulée',      cls:'bg-gray-100 text-gray-500'},
}
const SVC_ICON: Record<string, string> = {taxi:'🏍️', colis:'📦', courses:'🛒'}
const ACTIVE: OrderStatus[] = ['client_accepted','client_countered','confirmed','in_progress']

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<DailyRevenue[]>([])
  const [filter, setFilter] = useState<'active'|'all'>('active')
  const [svcFilter, setSvcFilter] = useState<'all'|ServiceType>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'table'|'cards'>('table')
  const audioRef = useRef<HTMLAudioElement|null>(null)
  const interactedRef = useRef(false)
  const supabase = createClient()

  useEffect(() => { audioRef.current = new Audio('/notification.mp3') }, [])
  if (!supabase) return null

  const playSound = useCallback(() => {
    if (!interactedRef.current || !audioRef.current) return
    audioRef.current.play().catch(() => {})
  }, [])

  useEffect(() => {
    supabase.from('orders').select('*').gte('created_at', todayStart()).order('created_at', {ascending:false})
      .then(({data}) => { setOrders((data as Order[]) ?? []); setLoading(false) })
  }, [supabase])

  useEffect(() => {
    fetch('/api/admin/analytics?period=day&limit=14')
      .then(r => r.json()).then(d => setChartData(Array.isArray(d) ? d : [])).catch(()=>{})
  }, [])

  useEffect(() => {
    const ch = supabase.channel('orders-admin-v2')
      .on('postgres_changes', {event:'INSERT', schema:'public', table:'orders'}, p => {
        setOrders(prev => [p.new as Order, ...prev]); playSound()
      })
      .on('postgres_changes', {event:'UPDATE', schema:'public', table:'orders'}, p => {
        setOrders(prev => prev.map(o => o.id === p.new.id ? p.new as Order : o))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, playSound])

  const handleStatusChange = useCallback(async (id: string, status: OrderStatus) => {
    await fetch(`/api/orders/${id}`, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status})})
  }, [])

  const done = orders.filter(o => o.status === 'done')
  const caJour = done.reduce((s, o) => s + (o.counter_offer ?? o.price_offered ?? 0), 0)
  const taxiCount = orders.filter(o => o.service === 'taxi').length
  const colisCount = orders.filter(o => o.service === 'colis').length
  const coursesCount = orders.filter(o => o.service === 'courses').length
  const activeCount = orders.filter(o => ACTIVE.includes(o.status)).length

  let displayed = filter === 'active' ? orders.filter(o => ACTIVE.includes(o.status)) : orders
  if (svcFilter !== 'all') displayed = displayed.filter(o => o.service === svcFilter)
  if (search.trim()) {
    const q = search.toLowerCase()
    displayed = displayed.filter(o =>
      o.customer_name.toLowerCase().includes(q) || o.customer_phone.includes(q) ||
      o.pickup?.label?.toLowerCase().includes(q) || o.dropoff?.label?.toLowerCase().includes(q)
    )
  }

  return (
    <div className="flex flex-col min-h-screen" onClick={() => { interactedRef.current = true }}>
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Dashboard</h1>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center text-xs font-bold text-white">ZO</div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-brand-black leading-none">Admin</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">TFS</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 flex flex-col gap-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-brand-black text-white rounded-2xl p-5 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-brand-red/20 rounded-xl flex items-center justify-center">
                <IconTrendUp size={16} className="text-brand-red"/>
              </div>
              <span className="text-xs text-gray-400 font-medium">CA du jour</span>
            </div>
            <p className="text-3xl font-black leading-none">{fmt(caJour)}</p>
            <p className="text-xs text-gray-500 mt-1.5">Ariary · {done.length} terminée{done.length>1?'s':''}</p>
          </div>
          {[
            {label:'Taxi-moto', count:taxiCount,   Icon:IconMoto,     color:'text-blue-500',  bg:'bg-blue-50'},
            {label:'Colis',     count:colisCount,   Icon:IconPackage,  color:'text-amber-500', bg:'bg-amber-50'},
            {label:'Courses',   count:coursesCount, Icon:IconShopping, color:'text-green-500', bg:'bg-green-50'},
          ].map(({label, count, Icon, color, bg}) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 font-medium">{label}</span>
                <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon size={16} className={color}/>
                </div>
              </div>
              <p className="text-3xl font-black text-brand-black leading-none">{count}</p>
              <p className="text-xs text-gray-400 mt-1.5">aujourd'hui</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-brand-black">Revenus — 14 derniers jours</h2>
                <p className="text-xs text-gray-400 mt-0.5">Commandes terminées (Ar)</p>
              </div>
              <button onClick={() => {
                const rows = chartData.map(d => `${d.day},${d.revenue_ar},${d.order_count}`).join('\n')
                const blob = new Blob([`date,revenue_ar,commandes\n${rows}`], {type:'text/csv'})
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
                a.download = 'tfs-analytics.csv'; a.click()
              }} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-black transition-colors">
                <IconDownload size={14}/><span className="hidden sm:inline">Export</span>
              </button>
            </div>
            <LineChart data={chartData}/>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-brand-black mb-1">Répartition</h2>
            <p className="text-xs text-gray-400 mb-4">Par service · aujourd'hui</p>
            <DonutChart taxi={taxiCount} colis={colisCount} courses={coursesCount}/>
          </div>
        </div>

        {/* Orders table */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h2 className="text-sm font-bold text-brand-black flex items-center gap-2">
                Commandes
                {activeCount > 0 && <span className="bg-brand-red text-white text-xs px-2 py-0.5 rounded-full">{activeCount}</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="search" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-brand-gray border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-brand-red w-36"/>
              </div>
              <div className="flex gap-1">
                {(['active','all'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filter===f?'bg-brand-red text-white':'bg-brand-gray text-gray-600'}`}>
                    {f==='active'?`Actives${activeCount>0?' ('+activeCount+')':''}`:'Toutes'}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {(['all','taxi','colis','courses'] as const).map(s => (
                  <button key={s} onClick={() => setSvcFilter(s==='all'?'all':s as ServiceType)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${svcFilter===s?'bg-brand-black text-white':'bg-brand-gray text-gray-600'}`}>
                    {s==='all'?'Tous':s}
                  </button>
                ))}
              </div>
              <button onClick={() => setView(v => v==='table'?'cards':'table')}
                className="px-2.5 py-2 rounded-xl text-xs text-gray-500 hover:bg-brand-gray border border-gray-200 transition-all"
                title="Changer la vue">
                {view==='table'?'⊞':'☰'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">Chargement…</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">Aucune commande</div>
          ) : view === 'cards' ? (
            <div className="p-4 flex flex-col gap-3">
              {displayed.map(o => <OrderCard key={o.id} order={o} onStatusChange={handleStatusChange}/>)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Service','Client','Téléphone','Trajet','Prix','Statut','Heure','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayed.map(o => {
                    const price = o.counter_offer ?? o.price_offered
                    const sc = SC[o.status] ?? {label:o.status, cls:'bg-gray-100 text-gray-500'}
                    const isCounter = o.status === 'client_countered'
                    const phone = '+261' + o.customer_phone.replace(/^0/,'').replace(/\s/g,'')
                    return (
                      <tr key={o.id} className={`hover:bg-brand-gray/40 transition-colors ${isCounter?'bg-amber-50/30':''}`}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-base">{SVC_ICON[o.service]}</span>
                          <span className="ml-1.5 text-xs text-gray-600 capitalize">{o.service}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-brand-black text-xs">{o.customer_name}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          <a href={`tel:${phone}`} className="hover:text-brand-red">{o.customer_phone}</a>
                        </td>
                        <td className="px-4 py-3 max-w-[160px]">
                          {o.pickup && o.dropoff ? (
                            <div className="text-xs text-gray-500">
                              <p className="truncate">{o.pickup.label}</p>
                              <p className="truncate text-gray-400">→ {o.dropoff.label}</p>
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {price ? (
                            <div>
                              <p className={`text-xs font-bold ${isCounter?'text-amber-600':'text-brand-black'}`}>{fmt(price)} Ar</p>
                              {isCounter && o.price_offered && <p className="text-xs text-gray-400 line-through">{fmt(o.price_offered)} Ar</p>}
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(o.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {o.status==='client_accepted' && (
                              <button onClick={() => handleStatusChange(o.id,'confirmed')}
                                className="px-2.5 py-1.5 bg-brand-red text-white rounded-lg text-xs font-semibold">Confirmer</button>
                            )}
                            {o.status==='client_countered' && (
                              <button onClick={() => handleStatusChange(o.id,'confirmed')}
                                className="px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold">Accepter</button>
                            )}
                            {o.status==='confirmed' && (
                              <button onClick={() => handleStatusChange(o.id,'in_progress')}
                                className="px-2.5 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-semibold">Démarrer</button>
                            )}
                            {o.status==='in_progress' && (
                              <button onClick={() => handleStatusChange(o.id,'done')}
                                className="px-2.5 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold">Terminer</button>
                            )}
                            <a href={`tel:${phone}`} className="w-7 h-7 flex items-center justify-center bg-brand-gray rounded-lg text-gray-500 hover:bg-gray-200 text-sm">📞</a>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {displayed.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
              {displayed.length} commande{displayed.length>1?'s':''} affichée{displayed.length>1?'s':''}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
