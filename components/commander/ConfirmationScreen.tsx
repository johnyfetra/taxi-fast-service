import Button from '@/components/ui/Button'
import { IconPhone, IconWhatsApp, IconCheck } from '@/components/icons'
import type { ServiceType, Location } from '@/lib/types'

interface Props {
  orderId: string
  service: ServiceType
  customerName: string
  pickup: Location | null
  dropoff: Location | null
  price: number | null
  accessCode?: string | null
}

const WA_NUMBER = '261346143066'

function buildWaMessage(props: Props): string {
  const s = props.service === 'taxi' ? 'Taxi-moto' : props.service === 'colis' ? 'Colis' : 'Courses'
  let msg = `Bonjour Taxi Fast Service ! Ma commande #${props.orderId.slice(0, 8)}\n`
  msg += `Service : ${s}\n`
  if (props.pickup) msg += `Depart : ${props.pickup.label}\n`
  if (props.dropoff) msg += `Arrivee : ${props.dropoff.label}\n`
  if (props.price) msg += `Tarif : ${props.price.toLocaleString('fr-MG')} Ar\n`
  return encodeURIComponent(msg.trim())
}

const SERVICE_LABELS: Record<ServiceType, string> = {
  taxi: 'Taxi-moto',
  colis: 'Livraison colis',
  courses: 'Courses',
}

export default function ConfirmationScreen(props: Props) {
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${buildWaMessage(props)}`

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <IconCheck size={28} className="text-green-600 dark:text-green-400" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-brand-black dark:text-white">Demande envoyée !</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
          On vous contacte dans quelques minutes pour confirmer votre course.
        </p>
      </div>

      {/* Tracking code — masqué pour taxi (pas de suivi), adapté light/dark */}
      {props.accessCode && props.service !== 'taxi' && (
        <div className="w-full bg-gray-100 dark:bg-[#0D0D0F] border border-gray-200 dark:border-transparent rounded-2xl p-5 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">Code de suivi</p>
          <p className="text-brand-black dark:text-white text-4xl font-bold tracking-widest tabular-nums mb-3">
            {props.accessCode}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-xs leading-relaxed mb-4">
            Notez ce code. Il vous permet de suivre vos commandes sur{' '}
            <span className="text-brand-black dark:text-white font-semibold">taxifastservice.mg/suivi</span>
          </p>
          <a
            href="/suivi"
            className="inline-flex items-center gap-1.5 bg-brand-red text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Suivre ma commande →
          </a>
        </div>
      )}

      {/* Récapitulatif */}
      <div className="bg-brand-gray dark:bg-[#1C1C1E] rounded-2xl p-4 w-full text-left space-y-2.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Récapitulatif</p>
        <p className="font-semibold text-brand-black dark:text-white">{SERVICE_LABELS[props.service]}</p>
        {props.pickup && (
          <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-brand-red mt-1.5 flex-shrink-0" />
            {props.pickup.label}
          </div>
        )}
        {props.dropoff && (
          <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
            {props.dropoff.label}
          </div>
        )}
        {props.price ? (
          <p className="text-sm font-semibold text-brand-black dark:text-white">
            Tarif : {props.price.toLocaleString('fr-MG')} Ar
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="w-full flex flex-col gap-3">
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button size="lg" className="w-full bg-[#25D366] hover:bg-[#1ebe5d]">
            <IconWhatsApp size={18} />
            Écrire sur WhatsApp
          </Button>
        </a>
        <a href="tel:+261346143066" className="block">
          <Button variant="secondary" size="lg" className="w-full">
            <IconPhone size={17} />
            Appeler
          </Button>
        </a>
      </div>
    </div>
  )
}
