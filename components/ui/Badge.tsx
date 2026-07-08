import type { OrderStatus } from '@/lib/types'

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  client_accepted: { label: 'Tarif accepté', className: 'bg-gray-100 text-gray-700' },
  client_countered: { label: 'Contre-offre', className: 'bg-brand-red text-white' },
  confirmed: { label: 'Confirmée', className: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'En cours', className: 'bg-orange-100 text-orange-800' },
  done: { label: 'Terminée', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulée', className: 'bg-gray-200 text-gray-600' },
}

interface BadgeProps {
  status: OrderStatus
  className?: string
}

export default function Badge({ status, className = '' }: BadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        config.className,
        className,
      ].join(' ')}
    >
      {config.label}
    </span>
  )
}
