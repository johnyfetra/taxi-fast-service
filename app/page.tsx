import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { IconMoto, IconPackage, IconShopping, IconPhone, IconWhatsApp, IconArrow } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Taxi Fast Service — Taxi-moto & Livraison à Antananarivo',
}

const WA_URL = 'https://wa.me/261346143066'
const TEL = 'tel:+261346143066'
const TEL_DISPLAY = '034 61 430 66'

const services = [
  {
    Icon: IconMoto,
    title: 'Taxi-moto',
    desc: 'Déplacements rapides dans Antananarivo. Évitez les embouteillages.',
    href: '/commander?service=taxi',
  },
  {
    Icon: IconPackage,
    title: 'Livraison colis',
    desc: 'Envoi de colis petit, moyen ou grand. Livraison express à Tana.',
    href: '/commander?service=colis',
  },
  {
    Icon: IconShopping,
    title: 'Courses',
    desc: 'Faites vos courses à votre place. Prix sur devis, quartier au choix.',
    href: '/commander?service=courses',
  },
]

const steps = [
  { n: 1, title: 'Choisissez votre service', desc: 'Taxi-moto, colis ou courses.' },
  { n: 2, title: 'Le prix s\'affiche instantanément', desc: 'Distance, durée et tarif calculés en temps réel. Acceptez ou proposez votre prix.' },
  { n: 3, title: 'On vous contacte', desc: 'Confirmation par appel ou WhatsApp en quelques minutes.' },
]

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* NAV */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Taxi Fast Service" width={36} height={36} className="object-contain" priority />
            <span className="font-black text-brand-black text-sm tracking-tight">Taxi Fast Service</span>
          </div>
          <a href={TEL} className="flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:underline">
            <IconPhone size={15} />
            {TEL_DISPLAY}
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="bg-white px-4 pt-14 pb-12 flex flex-col items-center text-center gap-6">
        <Image src="/logo.png" alt="Taxi Fast Service" width={120} height={120} className="object-contain" priority />
        <div>
          <h1 className="text-3xl font-black text-brand-black leading-tight">
            Taxi-moto &amp; livraison<br />
            <span className="text-brand-red italic">express à Tana</span>
          </h1>
          <p className="text-gray-500 mt-3 text-base max-w-xs mx-auto leading-relaxed">
            Prix transparent dès la commande —<br />confirmé par appel ou WhatsApp.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/commander"
            className="block bg-brand-red text-white font-bold text-base rounded-xl py-4 text-center hover:bg-red-700 active:bg-red-800 transition-colors"
          >
            Commander maintenant
          </Link>
          <p className="text-xs text-gray-400">Lundi–Vendredi · 8h–17h</p>
        </div>
      </section>

      {/* SERVICES */}
      <section className="bg-brand-gray px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-brand-black text-center mb-6">Nos services</h2>
          <div className="flex flex-col gap-3">
            {services.map(({ Icon, title, desc, href }) => (
              <Link
                key={href}
                href={href}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:border-brand-red transition-colors group"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-gray flex items-center justify-center text-brand-red group-hover:bg-red-50 transition-colors flex-shrink-0">
                  <Icon size={22} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-brand-black">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
                </div>
                <IconArrow size={18} className="text-gray-300 group-hover:text-brand-red group-hover:translate-x-1 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-brand-black text-center mb-6">Comment ça marche ?</h2>
          <div className="flex flex-col gap-5">
            {steps.map((step) => (
              <div key={step.n} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-brand-red flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {step.n}
                </div>
                <div className="pt-0.5">
                  <p className="font-semibold text-brand-black">{step.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-brand-red px-4 py-8 text-center">
        <p className="text-white font-bold text-lg mb-1">Rapide · Sûr · Confortable</p>
        <p className="text-red-200 text-sm mb-4">Zone : Antananarivo · Lun–Ven 8h–17h</p>
        <Link href="/commander" className="inline-block bg-white text-brand-red font-bold rounded-xl px-8 py-3 hover:bg-gray-50 transition-colors">
          Commander
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-brand-black text-white px-4 py-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4 text-center">
          <Image src="/logo.png" alt="Taxi Fast Service" width={48} height={48} className="object-contain opacity-80" />
          <div className="flex gap-5">
            <a href={TEL} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <IconPhone size={16} />
              {TEL_DISPLAY}
            </a>
            <a href={WA_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <IconWhatsApp size={16} />
              WhatsApp
            </a>
          </div>
          <p className="text-xs text-gray-600">© 2025 Taxi Fast Service — Antananarivo</p>
        </div>
      </footer>
    </main>
  )
}
