'use client'
import { IconMoto, IconPackage, IconShopping, IconCheck } from '@/components/icons'
import type { ServiceType } from '@/lib/types'

interface Props {
  value: ServiceType | null
  onChange: (s: ServiceType) => void
}

const services: {
  key: ServiceType
  Icon: (props: { className?: string; size?: number }) => React.ReactElement
  label: string
  desc: string
}[] = [
  { key: 'taxi',    Icon: IconMoto,     label: 'Taxi-moto',       desc: 'Déplacement rapide à Tana' },
  { key: 'colis',   Icon: IconPackage,  label: 'Livraison colis', desc: 'Envoi petit / moyen / grand' },
  { key: 'courses', Icon: IconShopping, label: 'Courses',         desc: 'Liste de courses, prix sur devis' },
]

export default function ServiceSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {services.map(({ key, Icon, label, desc }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={[
            'flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all min-h-16',
            value === key
              ? 'border-brand-red bg-red-50'
              : 'border-gray-200 bg-white hover:border-gray-300 active:border-brand-red',
          ].join(' ')}
          aria-pressed={value === key}
        >
          <div
            className={[
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
              value === key ? 'bg-brand-red text-white' : 'bg-brand-gray text-gray-500',
            ].join(' ')}
          >
            <Icon size={22} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-brand-black">{label}</p>
            <p className="text-sm text-gray-500">{desc}</p>
          </div>
          {value === key && (
            <IconCheck size={18} className="text-brand-red flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  )
}
