'use client'
import { useEffect, useState, useMemo } from 'react'
import type { Customer, Order } from '@/lib/types'
import { IconSearch, IconPhone, IconWhatsApp, IconX } from '@/components/icons'

/* ── helpers ───────────────────────────────────────────── */

const PALETTES = [
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#D1FAE5', text: '#047857' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#EDE9FE', text: '#6D28D9' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#FFEDD5', text: '#C2410C' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#FEE2E2', text: '#B91C1C' },
]

const paletteFor = (name: string) => PALETTES[name.charCodeAt(0) % PALETTES.length]

const initials = (name: string) =>
  name.trim().split(/\s+/).map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()

function fmtAr(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M Ar'
  if (n >= 1000) return Math.round(n / 1000) + 'k Ar'
  return n + ' Ar'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
}

const SVC: Record<string, string> = { taxi: '🏍 Taxi', colis: '📦 Colis', courses: '🛒 Courses' }

const STATUS: Record<string, { label: string; cls: string }> = {
  client_accepted:  { label: 'Reçue',       cls: 'bg-gray-100 text-gray-600' },
  client_countered: { label: 'Contre-offre', cls: 'bg-red-100 text-red-700' },
  client_cancelled: { label: 'Refusé',       cls: 'bg-red-50 text-red-400' },
  confirmed:        { label: 'Confirmée',    cls: 'bg-blue-100 text-blue-700' },
  in_progress:      { label: 'En cours',     cls: 'bg-orange-100 text-orange-700' },
  done:             { label: 'Terminée',     cls: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Annulée',      cls: 'bg-gray-100 text-gray-500' },
}

const ACTIVE_SET = new Set(['client_accepted', 'client_countered', 'confirmed', 'in_progress'])

function getTier(c: Customer): { label: string; cls: string } | null {
  if (c.total_orders >= 5 || c.total_revenue_ar >= 50_000)
    return { label: 'Fidèle', cls: 'bg-amber-100 text-amber-700' }
  if (c.total_orders >= 2)
    return { label: 'Régulier', cls: 'bg-emerald-100 text-emerald-700' }
  return null
}

/* ── Avatar ────────────────────────────────────────────── */

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const { bg, text } = paletteFor(name)
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0 select-none"
      style={{ width: size, height: size, background: bg, color: text, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  )
}

/* ── OrderMini (used in detail panel) ──────────────────── */

function OrderMini({ order }: { order: Order }) {
  const st = STATUS[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-500' }
  const price = order.counter_offer ?? order.price_offered
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-brand-black">{SVC[order.service]}</span>
          <span className="text-[10px] text-gray-400">{fmtDate(order.created_at)}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{order.pickup?.label ?? '—'}</p>
        {order.dropoff && (
          <p className="text-xs text-gray-400 truncate">→ {order.dropoff.label}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {price != null && (
          <span className="text-xs font-semibold text-brand-black">{fmtAr(price)}</span>
        )}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
      </div>
    </div>
  )
}

/* ── Detail panel ──────────────────────────────────────── */

function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setOrders([])
    setLoading(true)
    fetch(`/api/admin/customers/${encodeURIComponent(customer.customer_phone)}/orders`)
      .then(r => r.json())
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [customer.customer_phone])

  const active  = orders.filter(o => ACTIVE_SET.has(o.status))
  const history = orders.filter(o => !ACTIVE_SET.has(o.status))
  const intl    = '+261' + customer.customer_phone.replace(/^0/, '').replace(/\s/g, '')
  const t       = getTier(customer)
  const { bg, text } = paletteFor(customer.customer_name)
  const successRate = customer.total_orders > 0
    ? Math.round((customer.completed_orders / customer.total_orders) * 100) : 0

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-30" onClick={onClose} />

      <aside
        className="fixed right-0 top-0 bottom-0 z-40 flex flex-col bg-white border-l border-gray-200 shadow-2xl overflow-hidden"
        style={{ width: 'min(420px, 100vw)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl select-none"
              style={{ background: bg, color: text }}
            >
              {initials(customer.customer_name)}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <IconX size={15} />
            </button>
          </div>

          <h2 className="font-bold text-brand-black text-lg leading-tight">{customer.customer_name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{customer.customer_phone}</p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {t && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>
            )}
            <span className="text-[10px] text-gray-400">
              Client depuis {fmtDate(customer.first_order_at)}
            </span>
            {customer.last_order_at !== customer.first_order_at && (
              <span className="text-[10px] text-gray-400">
                · dernière cmd {fmtDate(customer.last_order_at)}
              </span>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <a href={`tel:${intl}`}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
              <IconPhone size={15} /> Appeler
            </a>
            <a href={`https://wa.me/${intl.replace('+', '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors">
              <IconWhatsApp size={15} /> WhatsApp
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex-shrink-0 grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          {[
            { v: String(customer.total_orders),       l: 'Commandes' },
            { v: successRate + '%',                    l: 'Taux réussite' },
            { v: fmtAr(customer.total_revenue_ar),     l: 'Chiffre affaires' },
          ].map(({ v, l }) => (
            <div key={l} className="flex flex-col items-center py-3.5 px-2">
              <p className="font-bold text-brand-black text-base leading-none">{v}</p>
              <p className="text-[10px] text-gray-400 mt-1 text-center leading-tight">{l}</p>
            </div>
          ))}
        </div>

        {/* Scrollable orders */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-xs font-bold text-brand-black uppercase tracking-wider">En cours</h3>
                    <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {active.length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {active.map(o => <OrderMini key={o.id} order={o} />)}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <h3 className="text-xs font-bold text-brand-black uppercase tracking-wider">Historique</h3>
                  <span className="text-[10px] text-gray-400">{history.length} commandes</span>
                </div>
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Aucune commande terminée</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {history.map(o => <OrderMini key={o.id} order={o} />)}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

/* ── List row ──────────────────────────────────────────── */

function CustomerRow({ c, active, onClick }: { c: Customer; active: boolean; onClick: () => void }) {
  const t = getTier(c)
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-4 px-4 py-3.5 text-left rounded-xl border transition-all group',
        active
          ? 'bg-red-50 border-brand-red/25 shadow-sm'
          : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm',
      ].join(' ')}
    >
      <Avatar name={c.customer_name} size={40} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-brand-black text-sm">{c.customer_name}</p>
          {t && (
            <span className={`text-[9px] font-semibold px-1.5 py-px rounded-full ${t.cls}`}>{t.label}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{c.customer_phone}</p>
      </div>

      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-brand-black">{c.total_orders}</p>
          <p className="text-[10px] text-gray-400">commandes</p>
        </div>
        {c.total_revenue_ar > 0 && (
          <div className="text-right hidden lg:block">
            <p className="text-sm font-bold text-brand-black">{fmtAr(c.total_revenue_ar)}</p>
            <p className="text-[10px] text-gray-400">chiffre d&apos;affaires</p>
          </div>
        )}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-gray-300 group-hover:text-gray-500 transition-colors">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  )
}

/* ── Grid card ─────────────────────────────────────────── */

function CustomerCard({ c, active, onClick }: { c: Customer; active: boolean; onClick: () => void }) {
  const t = getTier(c)
  const rate = c.total_orders > 0 ? Math.round((c.completed_orders / c.total_orders) * 100) : 0
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col gap-3 p-4 text-left rounded-2xl border transition-all',
        active
          ? 'bg-red-50 border-brand-red/30 shadow-sm'
          : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-md',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <Avatar name={c.customer_name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-black text-sm leading-tight truncate">{c.customer_name}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{c.customer_phone}</p>
        </div>
      </div>

      <div className="w-full h-px bg-gray-100" />

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="font-bold text-brand-black text-base leading-none">{c.total_orders}</p>
          <p className="text-[10px] text-gray-400 mt-1">commandes</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="font-bold text-brand-black text-base leading-none">{rate}%</p>
          <p className="text-[10px] text-gray-400 mt-1">succès</p>
        </div>
      </div>

      {c.total_revenue_ar > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Chiffre d&apos;affaires</span>
          <span className="text-xs font-semibold text-brand-black">{fmtAr(c.total_revenue_ar)}</span>
        </div>
      )}

      {t && (
        <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.cls}`}>
          {t.label}
        </span>
      )}
    </button>
  )
}

/* ── Main page ─────────────────────────────────────────── */

type SortKey = 'revenue' | 'orders' | 'name'
type ViewMode = 'list' | 'grid'

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState<SortKey>('revenue')
  const [view,      setView]      = useState<ViewMode>('list')
  const [selected,  setSelected]  = useState<Customer | null>(null)

  useEffect(() => {
    fetch('/api/admin/customers')
      .then(r => r.json())
      .then(d => { setCustomers(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = !q
      ? customers
      : customers.filter(c =>
          c.customer_name.toLowerCase().includes(q) ||
          c.customer_phone.includes(q)
        )
    return [...list].sort((a, b) => {
      if (sort === 'name')   return a.customer_name.localeCompare(b.customer_name)
      if (sort === 'orders') return b.total_orders - a.total_orders
      return b.total_revenue_ar - a.total_revenue_ar
    })
  }, [customers, search, sort])

  return (
    <div className="flex flex-col px-4 py-4 gap-4">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Clients</h1>
          {!loading && (
            <p className="text-xs text-gray-400 mt-0.5">{customers.length} clients</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-600 focus:outline-none focus:border-brand-red cursor-pointer"
          >
            <option value="revenue">Par CA</option>
            <option value="orders">Par commandes</option>
            <option value="name">Par nom</option>
          </select>

          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('list')}
              aria-label="Vue liste"
              className={['px-2.5 py-1.5 transition-colors', view === 'list' ? 'bg-brand-black text-white' : 'text-gray-400 hover:text-gray-600'].join(' ')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              aria-label="Vue grille"
              className={['px-2.5 py-1.5 transition-colors', view === 'grid' ? 'bg-brand-black text-white' : 'text-gray-400 hover:text-gray-600'].join(' ')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-shrink-0">
        <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Rechercher par nom ou téléphone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition-all"
        />
      </div>

      {/* Content */}
      <div>
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-[68px] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-2xl">👤</div>
            <p className="text-sm font-medium text-gray-500">Aucun client</p>
            {search && <p className="text-xs text-gray-400 mt-1">Essayez un autre terme de recherche</p>}
          </div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-2 pb-4">
            {filtered.map(c => (
              <CustomerRow
                key={c.customer_phone}
                c={c}
                active={selected?.customer_phone === c.customer_phone}
                onClick={() => setSelected(prev => prev?.customer_phone === c.customer_phone ? null : c)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {filtered.map(c => (
              <CustomerCard
                key={c.customer_phone}
                c={c}
                active={selected?.customer_phone === c.customer_phone}
                onClick={() => setSelected(prev => prev?.customer_phone === c.customer_phone ? null : c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <CustomerDetail
          customer={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
