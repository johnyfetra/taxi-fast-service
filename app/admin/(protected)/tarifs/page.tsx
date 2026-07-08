'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PricingRule } from '@/lib/types'
import { IconMoto, IconPackage, IconShopping, IconCheck } from '@/components/icons'

const SERVICE_META = {
  taxi: {
    label: 'Taxi-moto',
    sub: 'Course avec chauffeur moto à la demande',
    Icon: IconMoto,
    accent: '#3B82F6',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    hasKm: true,
  },
  colis: {
    label: 'Livraison colis',
    sub: 'Livraison de colis point à point',
    Icon: IconPackage,
    accent: '#F59E0B',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    hasKm: true,
  },
  courses: {
    label: 'Courses',
    sub: 'Courses sur devis — prix minimum garanti',
    Icon: IconShopping,
    accent: '#10B981',
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    hasKm: false,
  },
} as const

function fmt(n: number) {
  return n.toLocaleString('fr-FR')
}

function Preview({ rule }: { rule: PricingRule }) {
  if (rule.service === 'courses') {
    return (
      <p className="text-xs text-gray-500">
        Prix minimum appliqué →{' '}
        <span className="font-semibold text-brand-black">{fmt(rule.min_price)} Ar</span>
      </p>
    )
  }
  const raw = rule.base_price + 5 * rule.price_per_km
  const final = Math.max(raw, rule.min_price)
  const capped = final === rule.min_price && raw < rule.min_price
  return (
    <p className="text-xs text-gray-500">
      Exemple 5 km : {fmt(rule.base_price)} + 5 × {fmt(rule.price_per_km)} = {fmt(raw)} Ar
      {capped
        ? <> → <span className="text-brand-red font-semibold">{fmt(final)} Ar (min)</span></>
        : <> → <span className="font-semibold text-green-600">{fmt(final)} Ar</span></>
      }
    </p>
  )
}

function NumField({ label, value, hint, onChange }: {
  label: string; value: string; hint: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-brand-gray border border-gray-200 rounded-xl px-3 py-2.5 pr-8 text-sm font-semibold text-brand-black focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">Ar</span>
      </div>
      <p className="text-[11px] text-gray-400 leading-none">{hint}</p>
    </div>
  )
}

export default function TarifsPage() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!supabase) return
    supabase.from('pricing_rules').select('*')
      .then(({ data }) => { if (data) setRules(data as PricingRule[]) })
  }, [])

  const update = (service: string, field: string, value: string) =>
    setRules(prev => prev.map(r => r.service === service ? { ...r, [field]: parseInt(value) || 0 } : r))

  const save = async (rule: PricingRule) => {
    if (!supabase) return
    setSaving(rule.service); setError(null)
    const { error: err } = await supabase.from('pricing_rules')
      .update({ base_price: rule.base_price, price_per_km: rule.price_per_km, min_price: rule.min_price })
      .eq('service', rule.service)
    setSaving(null)
    if (err) { setError(err.message); return }
    setSaved(rule.service)
    setTimeout(() => setSaved(null), 2500)
  }

  // Sort: taxi, colis, courses
  const sorted = ['taxi', 'colis', 'courses']
    .map(s => rules.find(r => r.service === s))
    .filter(Boolean) as PricingRule[]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Sticky header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-brand-black">Tarifs</h1>
          <p className="text-xs text-gray-400 mt-0.5">Configurez les prix appliqués lors des estimations</p>
        </div>
        <a
          href="/admin"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-black transition-colors px-3 py-2 rounded-xl hover:bg-brand-gray"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Retour
        </a>
      </header>

      {/* Content — no scroll, fills remaining height */}
      <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-brand-red shrink-0">{error}</div>
        )}

        {sorted.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Chargement…</div>
        ) : (
          <>
            {/* 3-column grid — fills height */}
            <div className="grid grid-cols-3 gap-5 flex-1 min-h-0">
              {sorted.map(rule => {
                const meta = SERVICE_META[rule.service as keyof typeof SERVICE_META]
                if (!meta) return null
                const { label, sub, Icon, bg, iconBg, iconColor, hasKm } = meta
                const isSaving = saving === rule.service
                const isSaved  = saved  === rule.service

                return (
                  <div
                    key={rule.service}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden"
                  >
                    {/* Card header */}
                    <div className={`${bg} px-5 py-4 flex items-center gap-3 shrink-0`}>
                      <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>
                        <Icon size={20} className={iconColor} />
                      </div>
                      <div>
                        <p className="font-bold text-brand-black text-sm">{label}</p>
                        <p className="text-xs text-gray-500 leading-tight">{sub}</p>
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="flex-1 px-5 py-5 flex flex-col gap-4">
                      {hasKm ? (
                        <>
                          <NumField
                            label="Prix de base"
                            value={rule.base_price.toString()}
                            hint="Montant fixe par course"
                            onChange={v => update(rule.service, 'base_price', v)}
                          />
                          <NumField
                            label="Par kilomètre"
                            value={rule.price_per_km.toString()}
                            hint="Tarif kilométrique"
                            onChange={v => update(rule.service, 'price_per_km', v)}
                          />
                          <NumField
                            label="Prix minimum"
                            value={rule.min_price.toString()}
                            hint="Plancher garanti"
                            onChange={v => update(rule.service, 'min_price', v)}
                          />
                        </>
                      ) : (
                        <NumField
                          label="Prix minimum"
                          value={rule.min_price.toString()}
                          hint="Montant minimum pour ce service"
                          onChange={v => update(rule.service, 'min_price', v)}
                        />
                      )}

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Preview */}
                      <div className="bg-brand-gray rounded-xl px-4 py-3">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Aperçu</p>
                        <Preview rule={rule} />
                      </div>

                      {/* Save */}
                      <button
                        onClick={() => save(rule)}
                        disabled={isSaving}
                        className={[
                          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                          isSaved
                            ? 'bg-green-500 text-white'
                            : 'bg-brand-red text-white hover:bg-red-700 active:scale-[.98]',
                          isSaving ? 'opacity-60 cursor-wait' : '',
                        ].join(' ')}
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                            </svg>
                            Enregistrement…
                          </>
                        ) : isSaved ? (
                          <><IconCheck size={15} /> Enregistré !</>
                        ) : (
                          'Enregistrer'
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Formula bar */}
            <div className="bg-brand-black rounded-2xl px-6 py-3.5 flex items-center justify-between shrink-0">
              <p className="text-xs text-gray-500">Formule appliquée côté serveur</p>
              <p className="font-mono text-sm text-white">prix = max( base + km × par_km , minimum )</p>
              <p className="text-xs text-gray-600">Actif immédiatement après enregistrement</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
