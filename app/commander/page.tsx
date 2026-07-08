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
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center gap-3">
          <a href="/" className="text-gray-400 hover:text-brand-red transition-colors p-1" aria-label="Retour à l'accueil">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </a>
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="TFS" width="30" height="30" className="rounded-lg" />
            <div className="leading-tight">
              <p className="font-black text-brand-black text-xs tracking-wide leading-none">TAXI FAST</p>
              <p className="font-bold text-brand-red text-[10px] tracking-widest uppercase leading-none mt-0.5">Service</p>
            </div>
          </a>
        </div>
      </header>

      <CommanderClient initialService={service} />
    </main>
  )
}
