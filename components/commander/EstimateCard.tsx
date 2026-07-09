import type { EstimateResult } from '@/lib/types'

interface Props {
  estimate: EstimateResult
  service: string
}

function fmt(n: number): string {
  return n.toLocaleString('fr-MG')
}

const base = 'rounded-2xl border border-gray-200 dark:border-[#2A2A2C] bg-brand-gray dark:bg-[#1C1C1E] p-4'

export default function EstimateCard({ estimate, service }: Props) {
  if (service === 'courses' || estimate.label === 'Prix sur devis') {
    return (
      <div className={base}>
        <p className="text-center text-brand-black dark:text-white font-semibold text-lg">Prix sur devis</p>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
          Nous vous contacterons pour confirmer le tarif.
        </p>
      </div>
    )
  }

  return (
    <div className={base}>
      {estimate.fallback && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mb-3 border border-amber-100 dark:border-amber-800/40">
          Estimation approximative (réseau GPS limité)
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-2xl font-bold text-brand-black dark:text-white">{estimate.distance_km}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">km</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-2xl font-bold text-brand-black dark:text-white">{estimate.duration_min}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">min estimées</p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-2xl font-bold text-brand-red">{fmt(estimate.price!)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Ar proposés</p>
        </div>
      </div>
    </div>
  )
}
