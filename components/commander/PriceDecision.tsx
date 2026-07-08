'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

type Decision = { type: 'accepted' } | { type: 'counter'; counter_offer: number }

interface Props {
  price: number | null
  onDecide: (decision: Decision) => void
}

export default function PriceDecision({ price, onDecide }: Props) {
  const [showCounter, setShowCounter] = useState(false)
  const [counterValue, setCounterValue] = useState('')
  const [error, setError] = useState('')

  if (price === null) {
    // Courses — pas d'estimation, on passe directement
    return (
      <Button size="lg" className="w-full" onClick={() => onDecide({ type: 'accepted' })}>
        Envoyer ma demande de devis →
      </Button>
    )
  }

  const handleCounter = () => {
    const val = parseInt(counterValue.replace(/\s/g, ''), 10)
    if (!val || val < 500) {
      setError('Tarif minimum : 500 Ar')
      return
    }
    if (val > 500000) {
      setError('Tarif trop élevé')
      return
    }
    onDecide({ type: 'counter', counter_offer: val })
  }

  return (
    <div className="flex flex-col gap-3">
      {!showCounter ? (
        <>
          <Button size="lg" className="w-full" onClick={() => onDecide({ type: 'accepted' })}>
            ✓ J&apos;accepte {price.toLocaleString('fr-MG')} Ar
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => setShowCounter(true)}
          >
            Refuser / proposer mon prix
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="counter-offer" className="text-sm font-medium text-brand-black">
              Votre tarif proposé (Ar)
            </label>
            <input
              id="counter-offer"
              type="number"
              inputMode="numeric"
              min="500"
              value={counterValue}
              onChange={(e) => { setCounterValue(e.target.value); setError('') }}
              placeholder={`Tarif proposé : ${price.toLocaleString('fr-MG')} Ar`}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 outline-none text-base min-h-12"
              aria-describedby={error ? 'counter-error' : undefined}
            />
            {error && <p id="counter-error" role="alert" className="text-xs text-brand-red">{error}</p>}
          </div>
          <Button size="lg" className="w-full" onClick={handleCounter}>
            Envoyer ma contre-proposition →
          </Button>
          <button
            type="button"
            onClick={() => setShowCounter(false)}
            className="text-sm text-gray-500 underline text-center"
          >
            ← Retour
          </button>
        </>
      )}
    </div>
  )
}
