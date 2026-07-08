import Button from '@/components/ui/Button'
import { IconPhone, IconWhatsApp, IconMapPin, IconCheck } from '@/components/icons'
import type { ServiceType, Location } from '@/lib/types'

interface Props {
  orderId: string
  service: ServiceType
  customerName: string
  pickup: Location | null
  dropoff: Location | null
  price: number | null
  counterOffer: number | null
}

const WA_NUMBER = '261346143066'

function buildWaMessage(props: Props): string {
  const s = props.service === 'taxi' ? 'Taxi-moto' : props.service === 'colis' ? 'Colis' : 'Courses'
  let msg = `Bonjour Taxi Fast Service ! Ma commande #${props.orderId.slice(0, 8)}\n`
  msg += `Service : ${s}\n`
  if (props.pickup) msg += `Depart : ${props.pickup.label}\n`
  if (props.dropoff) msg += `Arrivee : ${props.dropoff.label}\n`
  if (props.price) msg += `Tarif propose : ${props.price.toLocaleString('fr-MG')} Ar\n`
  if (props.counterOffer) msg += `Contre-offre : ${props.counterOffer.toLocaleString('fr-MG')} Ar\n`
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
      {/* Icône succès */}
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <IconCheck size={28} className="text-green-600" />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-brand-black">Demande envoyée !</h2>
        <p className="text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
          On vous contacte dans quelques minutes pour confirmer votre course.
        </p>
      </div>

      {/* Récapitulatif */}
      <div className="bg-brand-gray rounded-2xl p-4 w-full text-left space-y-2.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Récapitulatif</p>
        <p className="font-semibold text-brand-black">{SERVICE_LABELS[props.service]}</p>
        {props.pickup && (
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <span className="w-2 h-2 rounded-full bg-brand-red mt-1.5 flex-shrink-0" />
            {props.pickup.label}
          </div>
        )}
        {props.dropoff && (
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
            {props.dropoff.label}
          </div>
        )}
        {props.counterOffer ? (
          <p className="text-sm font-semibold text-brand-red">
            Votre offre : {props.counterOffer.toLocaleString('fr-MG')} Ar
          </p>
        ) : props.price ? (
          <p className="text-sm font-semibold text-brand-black">
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
