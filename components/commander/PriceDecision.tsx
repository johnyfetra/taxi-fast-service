'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

type Decision = { type: 'accepted' }

interface Props {
  price: number | null
  onDecide: (decision: Decision) => void
  onCancel: (reason: string) => void
  minPrice?: number | null
  pricePerKm?: number | null
}

const CANCEL_REASONS = [
  'Prix trop élevé',
  'J\'ai trouvé un autre moyen',
  'Ma destination a changé',
  'Temps d\'attente trop long',
  'Autre',
]

function fmt(n: number) {
  return n.toLocaleString('fr-MG')
}

export default function PriceDecision({ price, onDecide, onCancel, minPrice, pricePerKm }: Props) {
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const effectiveReason = reason === 'Autre' ? customReason.trim() : reason
  const canConfirmCancel = !!effectiveReason

  async function handleConfirmCancel() {
    if (!canConfirmCancel) return
    setSubmitting(true)
    await onCancel(effectiveReason)
    setSubmitting(false)
  }

  if (price === null) {
    return (
      <Button size="lg" className="w-full" onClick={() => onDecide({ type: 'accepted' })}>
        Envoyer ma demande de devis →
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Info tarification */}
      {(minPrice != null || pricePerKm != null) && (
        <div className="bg-brand-gray dark:bg-[#1C1C1E] rounded-xl px-4 py-3 flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Barème tarifaire</p>
          <div className="flex items-center gap-4 flex-wrap">
            {pricePerKm != null && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15"/><circle cx="18" cy="5" r="3"/>
                </svg>
                <span><span className="font-semibold text-brand-black dark:text-white">{fmt(pricePerKm)} Ar</span> / km</span>
              </span>
            )}
            {minPrice != null && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                </svg>
                <span>Min. <span className="font-semibold text-brand-black dark:text-white">{fmt(minPrice)} Ar</span></span>
              </span>
            )}
          </div>
        </div>
      )}

      <Button size="lg" className="w-full" onClick={() => onDecide({ type: 'accepted' })}>
        ✓ J&apos;accepte {fmt(price)} Ar
      </Button>

      {/* Cancel trigger */}
      {!showCancel && (
        <button
          type="button"
          onClick={() => setShowCancel(true)}
          className="text-sm text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors text-center py-1"
        >
          Refuser le tarif
        </button>
      )}

      {/* Cancel reason sheet */}
      {showCancel && (
        <div className="bg-gray-50 dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#2A2A2C] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-black dark:text-white">Pourquoi refusez-vous ?</p>
            <button
              type="button"
              onClick={() => { setShowCancel(false); setReason(''); setCustomReason('') }}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-[#2A2A2C] text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-[#3A3A3C] transition-colors"
              aria-label="Fermer"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {CANCEL_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={[
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition-all',
                  reason === r
                    ? 'border-brand-red bg-red-50 dark:bg-brand-red/10 text-brand-red'
                    : 'border-gray-200 dark:border-[#2A2A2C] bg-white dark:bg-[#141416] text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-[#3A3A3C]',
                ].join(' ')}
              >
                <span className={[
                  'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all',
                  reason === r ? 'border-brand-red bg-brand-red' : 'border-gray-300 dark:border-[#3A3A3C]',
                ].join(' ')} />
                {r}
              </button>
            ))}

            {reason === 'Autre' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Précisez la raison…"
                maxLength={150}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#2A2A2C] bg-white dark:bg-[#141416] text-brand-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-sm"
              />
            )}
          </div>

          <button
            type="button"
            disabled={!canConfirmCancel || submitting}
            onClick={handleConfirmCancel}
            className="w-full py-2.5 rounded-xl border-2 border-gray-300 dark:border-[#2A2A2C] text-sm font-semibold text-gray-600 dark:text-gray-400 hover:border-red-300 hover:text-brand-red disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? 'Enregistrement…' : 'Confirmer l\'annulation'}
          </button>
        </div>
      )}
    </div>
  )
}
