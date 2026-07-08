import type { EstimateResult } from '@/lib/types'
import Card from '@/components/ui/Card'

interface Props {
  estimate: EstimateResult
  service: string
}

function fmt(n: number): string {
  return n.toLocaleString('fr-MG')
}

export default function EstimateCard({ estimate, service }: Props) {
  if (service === 'courses' || estimate.label === 'Prix sur devis') {
    return (
      <Card className="bg-brand-gray border-brand-gray-dark">
        <p className="text-center text-brand-black font-semibold text-lg">Prix sur devis</p>
        <p className="text-center text-sm text-gray-500 mt-1">
          Nous vous contacterons pour confirmer le tarif.
        </p>
      </Card>
    )
  }

  return (
    <Card className="bg-brand-gray border-brand-gray-dark">
      {estimate.fallback && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3 border border-amber-100">
          Estimation approximative (réseau GPS limité)
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-2xl font-bold text-brand-black">{estimate.distance_km}</p>
          <p className="text-xs text-gray-500">km</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-2xl font-bold text-brand-black">{estimate.duration_min}</p>
          <p className="text-xs text-gray-500">min estimées</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-2xl font-bold text-brand-red">{fmt(estimate.price!)}</p>
          <p className="text-xs text-gray-500">Ar proposés</p>
        </div>
      </div>
    </Card>
  )
}
