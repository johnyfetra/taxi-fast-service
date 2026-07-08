'use client'
import { useEffect, useState, useMemo } from 'react'
import type { Driver, Order, DriverOrderStatus } from '@/lib/types'
import { IconDriver, IconPlus, IconEdit, IconX, IconPhone, IconWhatsApp, IconBike, IconMoto, IconSearch } from '@/components/icons'

/* ── helpers ───────────────────────────────────────────── */

const PALETTES = [
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#D1FAE5', text: '#047857' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#EDE9FE', text: '#6D28D9' },
  { bg: '#FFEDD5', text: '#C2410C' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#FEE2E2', text: '#B91C1C' },
  { bg: '#FCE7F3', text: '#9D174D' },
]
const paletteFor = (name: string) => PALETTES[name.charCodeAt(0) % PALETTES.length]
const initials   = (name: string) =>
  name.trim().split(/\s+/).map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()
const fmtAr      = (n: number)  => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n)
const fmtDate    = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const S_LABEL: Record<Driver['status'], string> = {
  disponible: 'Disponible', en_course: 'En course', hors_ligne: 'Hors ligne',
}
const S_CLS: Record<Driver['status'], string> = {
  disponible: 'bg-green-100 text-green-700',
  en_course:  'bg-blue-100 text-blue-700',
  hors_ligne: 'bg-gray-100 text-gray-500',
}
const S_DOT: Record<Driver['status'], string> = {
  disponible: 'bg-green-500', en_course: 'bg-blue-500', hors_ligne: 'bg-gray-400',
}

const DS_META: Partial<Record<DriverOrderStatus, { label: string; cls: string }>> = {
  'assigné':  { label: 'Assigné',  cls: 'bg-purple-100 text-purple-700' },
  'accepté':  { label: 'Accepté',  cls: 'bg-blue-100 text-blue-700' },
  'en_cours': { label: 'En cours', cls: 'bg-orange-100 text-orange-700' },
  'livré':    { label: 'Livré',    cls: 'bg-green-100 text-green-700' },
  'problème': { label: 'Problème', cls: 'bg-red-100 text-red-700' },
  'rejeté':   { label: 'Rejeté',   cls: 'bg-gray-100 text-gray-400' },
  'occupé':   { label: 'Occupé',   cls: 'bg-gray-100 text-gray-500' },
}

const SVC_LABEL: Record<string, string> = { taxi: '🏍 Taxi', colis: '📦 Colis', courses: '🛒 Courses' }
const ACTIVE_DS = new Set(['assigné', 'accepté', 'en_cours'])
const DONE_DS   = new Set(['livré', 'rejeté', 'problème'])

const EMPTY_FORM = { name: '', phone: '', type: 'moto' as 'moto' | 'velo', notes: '' }

/* ── Avatar ────────────────────────────────────────────── */

function Avatar({ name, type, size = 40 }: { name: string; type: Driver['type']; size?: number }) {
  const { bg, text } = paletteFor(name)
  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-full flex items-center justify-center font-bold select-none"
        style={{ width: size, height: size, background: bg, color: text, fontSize: size * 0.36 }}
      >
        {initials(name)}
      </div>
      <div
        className="absolute -bottom-1 -right-1 rounded-full bg-white border-2 border-white flex items-center justify-center"
        style={{ width: size * 0.45, height: size * 0.45 }}
      >
        {type === 'moto'
          ? <IconMoto size={size * 0.22} className="text-gray-500" />
          : <IconBike size={size * 0.22} className="text-gray-500" />
        }
      </div>
    </div>
  )
}

/* ── OrderMini (detail panel) ──────────────────────────── */

function OrderMini({ order }: { order: Order }) {
  const ds  = order.driver_status ? DS_META[order.driver_status] : null
  const price = order.price_offered
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-brand-black">{SVC_LABEL[order.service]}</span>
          <span className="text-[10px] text-gray-400">{fmtDate(order.created_at)}</span>
        </div>
        <p className="text-xs text-gray-600 font-medium mt-0.5">{order.customer_name}</p>
        {order.pickup  && <p className="text-xs text-gray-400 truncate mt-0.5">↑ {order.pickup.label}</p>}
        {order.dropoff && <p className="text-xs text-gray-400 truncate">↓ {order.dropoff.label}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {price != null && <span className="text-xs font-semibold text-brand-black">{fmtAr(price)} Ar</span>}
        {ds && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ds.cls}`}>{ds.label}</span>}
      </div>
    </div>
  )
}

/* ── Detail panel ──────────────────────────────────────── */

function DriverDetail({
  driver, onClose, onStatusChange, onEdit,
}: {
  driver: Driver
  onClose: () => void
  onStatusChange: (id: string, status: Driver['status']) => void
  onEdit: (d: Driver) => void
}) {
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setOrders([]); setLoading(true)
    fetch(`/api/admin/orders?driver_id=${driver.id}`)
      .then(r => r.json())
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [driver.id])

  const intl = '+261' + driver.phone.replace(/^0/, '').replace(/\s/g, '')

  // Order breakdowns
  const active   = orders.filter(o => ACTIVE_DS.has(o.driver_status ?? ''))
  const history  = orders.filter(o => DONE_DS.has(o.driver_status ?? ''))
  const delivered     = orders.filter(o => o.driver_status === 'livré').length
  const taxiDone      = orders.filter(o => o.service === 'taxi'    && o.driver_status === 'livré').length
  const colisDone     = orders.filter(o => o.service === 'colis'   && o.driver_status === 'livré').length
  const coursesDone   = orders.filter(o => o.service === 'courses' && o.driver_status === 'livré').length
  const problems      = orders.filter(o => o.driver_status === 'problème').length
  const revenue       = orders.filter(o => o.driver_status === 'livré').reduce((s, o) => s + (o.price_offered ?? 0), 0)

  const { bg, text } = paletteFor(driver.name)

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-30" onClick={onClose} />

      <aside
        className="fixed right-0 top-0 bottom-0 z-40 flex flex-col bg-white border-l border-gray-200 shadow-2xl overflow-hidden"
        style={{ width: 'min(440px, 100vw)' }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="relative">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl select-none"
                style={{ background: bg, color: text }}
              >
                {initials(driver.name)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-white flex items-center justify-center shadow-sm">
                {driver.type === 'moto'
                  ? <IconMoto size={12} className="text-gray-500" />
                  : <IconBike size={12} className="text-gray-500" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(driver)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                title="Modifier"
              >
                <IconEdit size={14} className="text-blue-600" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <IconX size={15} />
              </button>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-brand-black text-lg leading-tight">{driver.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{driver.phone}</p>
              {driver.notes && <p className="text-xs text-gray-400 mt-1 italic">{driver.notes}</p>}
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${S_CLS[driver.status]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${S_DOT[driver.status]}`} />
              {S_LABEL[driver.status]}
            </span>
          </div>

          {/* Status toggle */}
          <div className="flex gap-1.5 mt-3">
            {(['disponible', 'en_course', 'hors_ligne'] as Driver['status'][]).map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(driver.id, s)}
                className={[
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                  driver.status === s
                    ? S_CLS[s] + ' ring-1 ring-inset ring-current'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                ].join(' ')}
              >
                {S_LABEL[s]}
              </button>
            ))}
          </div>

          {/* Contacts */}
          <div className="flex gap-2 mt-3">
            <a href={`tel:${intl}`}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
              <IconPhone size={15} /> Appeler
            </a>
            <a href={`https://wa.me/${intl.replace('+', '')}`} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors">
              <IconWhatsApp size={15} /> WhatsApp
            </a>
          </div>

          {/* PIN */}
          {driver.pin_code && (
            <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Code PIN</p>
                <p className="font-mono font-black text-brand-black text-xl tracking-widest leading-tight">{driver.pin_code}</p>
              </div>
              <p className="text-[10px] text-gray-400">Login : {driver.phone}</p>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex-shrink-0 grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="flex flex-col items-center py-3.5 px-2">
              <p className="font-bold text-brand-black text-base leading-none">{orders.length}</p>
              <p className="text-[10px] text-gray-400 mt-1">Total</p>
            </div>
            <div className="flex flex-col items-center py-3.5 px-2">
              <p className="font-bold text-green-700 text-base leading-none">{delivered}</p>
              <p className="text-[10px] text-gray-400 mt-1">Livrés</p>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="flex flex-col items-center py-3.5 px-2">
              <p className="font-bold text-brand-black text-base leading-none">{fmtAr(revenue)}</p>
              <p className="text-[10px] text-gray-400 mt-1">CA (Ar)</p>
            </div>
            <div className="flex flex-col items-center py-3.5 px-2">
              <p className={`font-bold text-base leading-none ${problems > 0 ? 'text-brand-red' : 'text-gray-400'}`}>{problems}</p>
              <p className="text-[10px] text-gray-400 mt-1">Problèmes</p>
            </div>
          </div>
        </div>

        {/* Service breakdown */}
        {delivered > 0 && (
          <div className="flex-shrink-0 flex items-center gap-0 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
            {[
              { icon: '🏍', label: 'Taxi',    v: taxiDone    },
              { icon: '📦', label: 'Colis',   v: colisDone   },
              { icon: '🛒', label: 'Courses', v: coursesDone },
            ].map(({ icon, label, v }) => (
              <div key={label} className="flex-1 flex flex-col items-center py-2.5">
                <p className="text-sm leading-none">{icon}</p>
                <p className="font-bold text-brand-black text-sm leading-none mt-1">{v}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Scrollable orders */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <h3 className="text-xs font-bold text-brand-black uppercase tracking-wider">En cours</h3>
                    <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{active.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {active.map(o => <OrderMini key={o.id} order={o} />)}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <h3 className="text-xs font-bold text-brand-black uppercase tracking-wider">Historique</h3>
                  <span className="text-[10px] text-gray-400">{history.length} courses</span>
                </div>
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">Aucune course terminée</p>
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

function DriverRow({
  d, active, onClick, onStatusChange,
}: {
  d: Driver; active: boolean; onClick: () => void
  onStatusChange: (id: string, s: Driver['status']) => void
}) {
  return (
    <div
      className={[
        'bg-white rounded-xl border flex items-center gap-4 px-4 py-3.5 transition-all group cursor-pointer',
        active ? 'border-brand-red/25 bg-red-50 shadow-sm' : 'border-gray-100 hover:border-gray-300 hover:shadow-sm',
      ].join(' ')}
      onClick={onClick}
    >
      <Avatar name={d.name} type={d.type} size={40} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-brand-black text-sm">{d.name}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-px rounded-full text-[10px] font-semibold ${S_CLS[d.status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${S_DOT[d.status]}`} />
            {S_LABEL[d.status]}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{d.phone}</p>
        {d.notes && <p className="text-xs text-gray-400 mt-0.5 italic truncate max-w-xs">{d.notes}</p>}
      </div>

      {/* Quick status chips (stop propagation so they don't open panel) */}
      <div className="hidden md:flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {(['disponible', 'en_course', 'hors_ligne'] as Driver['status'][]).map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(d.id, s)}
            className={[
              'px-2 py-1 rounded-lg text-[10px] font-medium transition-all',
              d.status === s
                ? S_CLS[s] + ' ring-1 ring-inset ring-current'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
            ].join(' ')}
          >
            {S_LABEL[s]}
          </button>
        ))}
      </div>

      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

/* ── Grid card ─────────────────────────────────────────── */

function DriverCard({
  d, active, onClick,
}: {
  d: Driver; active: boolean; onClick: () => void
}) {
  return (
    <div
      className={[
        'flex flex-col gap-3 p-4 rounded-2xl border transition-all cursor-pointer',
        active ? 'bg-red-50 border-brand-red/30 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-md',
      ].join(' ')}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Avatar name={d.name} type={d.type} size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-black text-sm leading-tight truncate">{d.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{d.phone}</p>
        </div>
      </div>

      <span className={`self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${S_CLS[d.status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${S_DOT[d.status]}`} />
        {S_LABEL[d.status]}
      </span>

      <div className="w-full h-px bg-gray-100" />

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{d.type === 'moto' ? '🏍 Moto' : '🚲 Vélo'}</span>
        {d.notes && <span className="text-gray-400 italic truncate max-w-[120px]">{d.notes}</span>}
      </div>
    </div>
  )
}

/* ── Add / Edit modal ──────────────────────────────────── */

function DriverModal({
  modal, onClose, onSaved,
}: {
  modal: 'add' | Driver
  onClose: () => void
  onSaved: (pin?: { name: string; phone: string; pin: string }) => void
}) {
  const isEdit = modal !== 'add'
  const [form, setForm] = useState(
    isEdit
      ? { name: (modal as Driver).name, phone: (modal as Driver).phone, type: (modal as Driver).type, notes: (modal as Driver).notes ?? '' }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) { setError('Nom et téléphone requis'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(
        isEdit ? `/api/admin/drivers/${(modal as Driver).id}` : '/api/admin/drivers',
        { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }
      )
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erreur'); return }
      const created = await res.json()
      onSaved(!isEdit && created.pin_code ? { name: created.name, phone: created.phone, pin: created.pin_code } : undefined)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-brand-black">{isEdit ? 'Modifier le conducteur' : 'Nouveau conducteur'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <IconX size={16} />
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {error && <p className="text-sm text-brand-red bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          {[
            { key: 'name', label: 'Nom complet', placeholder: 'Jean Razafindrakoto', type: 'text' },
            { key: 'phone', label: 'Téléphone', placeholder: '034 XX XXX XX', type: 'tel' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
              <input
                type={type}
                value={(form as Record<string, string>)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red"
              />
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type de véhicule</label>
            <div className="flex gap-2">
              {(['moto', 'velo'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                    form.type === t ? 'border-brand-red bg-red-50 text-brand-red' : 'border-gray-200 text-gray-600'].join(' ')}>
                  {t === 'moto' ? <IconMoto size={16} /> : <IconBike size={16} />}
                  {t === 'moto' ? 'Moto' : 'Vélo'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes (optionnel)</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Zone couverte, remarques…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-red" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors">
            {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── PIN reveal modal ──────────────────────────────────── */

function PinModal({ pin, onClose }: { pin: { name: string; phone: string; pin: string }; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl text-center p-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="font-bold text-brand-black text-lg mb-1">Conducteur ajouté !</h2>
        <p className="text-sm text-gray-500 mb-5">Transmettez ces identifiants à <span className="font-semibold text-brand-black">{pin.name}</span></p>
        <div className="bg-brand-gray rounded-2xl p-5 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identifiants de connexion</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5">
              <span className="text-xs text-gray-400">Téléphone</span>
              <span className="font-semibold text-brand-black text-sm">{pin.phone}</span>
            </div>
            <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5">
              <span className="text-xs text-gray-400">Code PIN</span>
              <span className="font-mono font-black text-brand-red text-2xl tracking-widest">{pin.pin}</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-1">Ce PIN ne sera plus affiché — notez-le maintenant.</p>
        <p className="text-xs text-gray-400 mb-5">App conducteur : <span className="font-medium text-brand-black">/login</span></p>
        <button onClick={onClose} className="w-full bg-brand-red text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors">
          J&apos;ai noté le PIN
        </button>
      </div>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────── */

type ViewMode = 'list' | 'grid'

export default function ConducteursPage() {
  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [view,     setView]     = useState<ViewMode>('list')
  const [selected, setSelected] = useState<Driver | null>(null)
  const [modal,    setModal]    = useState<'add' | Driver | null>(null)
  const [newPin,   setNewPin]   = useState<{ name: string; phone: string; pin: string } | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/drivers')
    if (res.ok) setDrivers(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: Driver['status']) => {
    await fetch(`/api/admin/drivers/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    // Update selected panel if it's the same driver
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev)
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer ce conducteur ?')) return
    await fetch(`/api/admin/drivers/${id}`, { method: 'DELETE' })
    setSelected(prev => prev?.id === id ? null : prev)
    await load()
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return !q ? drivers : drivers.filter(d =>
      d.name.toLowerCase().includes(q) || d.phone.includes(q) || (d.notes ?? '').toLowerCase().includes(q)
    )
  }, [drivers, search])

  const disponibles = drivers.filter(d => d.status === 'disponible').length
  const enCourse    = drivers.filter(d => d.status === 'en_course').length
  const horsLigne   = drivers.filter(d => d.status === 'hors_ligne').length

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Conducteurs</h1>
          {!loading && (
            <p className="text-xs text-gray-400 mt-0.5">
              {drivers.length} conducteur{drivers.length > 1 ? 's' : ''} enregistré{drivers.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          <IconPlus size={16} /> Ajouter
        </button>
      </header>

      <div className="flex-1 px-6 py-5 flex flex-col gap-5">
        {/* Status stats */}
        {!loading && drivers.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { count: disponibles, label: 'Disponible',   cls: 'bg-green-50 border-green-100 text-green-700' },
              { count: enCourse,    label: 'En course',    cls: 'bg-blue-50 border-blue-100 text-blue-700' },
              { count: horsLigne,   label: 'Hors ligne',   cls: 'bg-gray-50 border-gray-100 text-gray-500' },
            ].map(({ count, label, cls }) => (
              <div key={label} className={`rounded-2xl border p-4 text-center ${cls}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-medium mt-0.5">{label}{count > 1 && label === 'Disponible' ? 's' : ''}</p>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <IconSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Rechercher par nom, téléphone ou zone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition-all"
            />
          </div>
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
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

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-[72px] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <IconDriver size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">Aucun conducteur trouvé</p>
            {search
              ? <p className="text-xs text-gray-400 mt-1">Essayez un autre terme</p>
              : <button onClick={() => setModal('add')} className="text-brand-red text-sm font-semibold hover:underline mt-2">+ Ajouter le premier conducteur</button>
            }
          </div>
        ) : view === 'list' ? (
          <div className="flex flex-col gap-2 pb-6">
            {filtered.map(d => (
              <DriverRow
                key={d.id}
                d={d}
                active={selected?.id === d.id}
                onClick={() => setSelected(prev => prev?.id === d.id ? null : d)}
                onStatusChange={setStatus}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
            {filtered.map(d => (
              <DriverCard
                key={d.id}
                d={d}
                active={selected?.id === d.id}
                onClick={() => setSelected(prev => prev?.id === d.id ? null : d)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DriverDetail
          driver={selected}
          onClose={() => setSelected(null)}
          onStatusChange={setStatus}
          onEdit={(d) => { setModal(d); setSelected(null) }}
        />
      )}

      {/* Add/Edit modal */}
      {modal !== null && (
        <DriverModal
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={(pin) => {
            setModal(null)
            load()
            if (pin) setNewPin(pin)
          }}
        />
      )}

      {/* PIN reveal */}
      {newPin && <PinModal pin={newPin} onClose={() => setNewPin(null)} />}
    </div>
  )
}
