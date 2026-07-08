import type { Metadata } from 'next'
import type { ServiceType } from '@/lib/types'
import CommanderClient from './CommanderClient'

export const metadata: Metadata = {
  title: 'Commander — Taxi Fast Service',
  description: 'Commandez votre taxi-moto ou livraison à Antananarivo. Prix transparent, confirmation rapide.',
}

interface Props {
  searchParams: Promise<{ service?: string }>
}

const VALID_SERVICES: ServiceType[] = ['taxi', 'colis', 'courses']

export default async function CommanderPage({ searchParams }: Props) {
  const params = await searchParams
  const service = VALID_SERVICES.includes(params.service as ServiceType)
    ? (params.service as ServiceType)
    : undefined

  return (
    <main className="min-h-screen bg-brand-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="text-sm text-gray-500 hover:text-brand-red transition-colors" aria-label="Retour à l'accueil">
            ←
          </a>
          <span className="font-bold text-brand-black text-sm">Taxi Fast Service</span>
        </div>
      </header>

      <CommanderClient initialService={service} />
    </main>
  )
}
