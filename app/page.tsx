import type { Metadata } from 'next'
import Link from 'next/link'
import { IconMoto, IconPackage, IconShopping, IconPhone, IconWhatsApp, IconArrow } from '@/components/icons'
import { LogoMark } from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'

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
  { n: '01', title: 'Choisissez votre service', desc: 'Taxi-moto, colis ou courses — en quelques secondes.' },
  { n: '02', title: 'Le prix s\'affiche instantanément', desc: 'Distance, durée et tarif calculés en temps réel. Acceptez pour confirmer votre commande.' },
  { n: '03', title: 'On vous contacte', desc: 'Confirmation par appel ou WhatsApp en quelques minutes.' },
]

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="bg-white dark:bg-[#141416] border-b border-gray-100 dark:border-[#1E1E20] sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="font-black text-brand-black dark:text-white text-sm" style={{ letterSpacing: '-0.02em' }}>
              Taxi Fast Service
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={TEL}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-red hover:text-red-700 transition-colors"
            >
              <IconPhone size={14} />
              {TEL_DISPLAY}
            </a>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#141416] flex flex-col items-center text-center px-5 pt-12 pb-14">
        <LogoMark size={160} className="mb-6" />

        <h1
          className="font-black text-brand-black dark:text-white"
          style={{ fontSize: 'clamp(36px, 10vw, 56px)', letterSpacing: '-0.04em', lineHeight: '1.06', textWrap: 'balance' }}
        >
          Taxi-moto &amp; livraison<br />
          <span className="text-brand-red" style={{ fontStyle: 'italic' }}>express à Tana</span>
        </h1>

        <p
          className="text-gray-500 dark:text-gray-400 mt-5 mx-auto"
          style={{ fontSize: '15px', lineHeight: '1.7', maxWidth: '280px' }}
        >
          Prix transparent dès la commande,<br />
          <span className="font-medium text-gray-700 dark:text-gray-300">confirmé par appel ou WhatsApp.</span>
        </p>

        <div className="mt-8 w-full max-w-xs flex flex-col items-center gap-4">
          <Link
            href="/commander"
            className="w-full text-white font-bold rounded-2xl py-4 text-center transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: '#D81F26', fontSize: '15px', letterSpacing: '-0.01em', boxShadow: '0 4px 20px rgba(216,31,38,0.28)' }}
          >
            Commander maintenant
          </Link>

          <Link
            href="/suivi"
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-brand-black dark:hover:text-white transition-colors underline underline-offset-4 decoration-gray-300 dark:decoration-gray-600"
          >
            Suivre une commande →
          </Link>

          <div className="flex items-center gap-2">
            {[
              { icon: '✓', label: 'Prix transparent' },
              { icon: '🕐', label: 'Lun–Ven · 8h–17h' },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#1C1C1E] text-gray-500 dark:text-gray-400 font-medium"
                style={{ fontSize: '12px' }}
              >
                <span style={{ fontSize: '10px' }}>{icon}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ────────────────────────────────────── */}
      <section className="bg-[#F5F3F0] dark:bg-[#0A0A0B] px-5 py-12">
        <div className="max-w-2xl mx-auto">

          <div className="flex items-center gap-3 mb-6">
            <span
              className="text-gray-400 dark:text-gray-500 font-semibold shrink-0"
              style={{ fontSize: '11px', letterSpacing: '0.12em' }}
            >
              NOS SERVICES
            </span>
            <div className="flex-1 h-px bg-gray-300/60 dark:bg-[#2A2A2C]" />
          </div>

          <div className="flex flex-col gap-3">
            {services.map(({ Icon, title, desc, href }) => (
              <Link
                key={href}
                href={href}
                className="bg-white dark:bg-[#141416] rounded-2xl p-5 flex items-center gap-4 group transition-all border border-transparent hover:border-red-200 dark:hover:border-brand-red/30 shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.09)]"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-[1.05] bg-[#FEF2F2] dark:bg-brand-red/10 text-brand-red"
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-black dark:text-white" style={{ letterSpacing: '-0.01em' }}>{title}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">{desc}</p>
                </div>
                <IconArrow
                  size={17}
                  className="text-gray-300 dark:text-gray-600 group-hover:text-brand-red transition-all group-hover:translate-x-0.5 flex-shrink-0"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section className="bg-white dark:bg-[#141416] px-5 py-12">
        <div className="max-w-2xl mx-auto">

          <div className="flex items-center gap-3 mb-8">
            <span
              className="text-gray-400 dark:text-gray-500 font-semibold shrink-0"
              style={{ fontSize: '11px', letterSpacing: '0.12em' }}
            >
              COMMENT ÇA MARCHE
            </span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-[#2A2A2C]" />
          </div>

          <div className="flex flex-col gap-0">
            {steps.map((step, i) => (
              <div key={step.n} className="flex items-stretch gap-0">
                <div className="flex flex-col items-center w-12 shrink-0">
                  <span
                    className="font-black text-gray-100 dark:text-[#2A2A2C] leading-none select-none"
                    style={{ fontSize: '38px', letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}
                  >
                    {step.n}
                  </span>
                  {i < steps.length - 1 && (
                    <div className="flex-1 w-px bg-gray-100 dark:bg-[#2A2A2C] my-1.5" />
                  )}
                </div>

                <div className={`pl-5 ${i < steps.length - 1 ? 'pb-8' : ''} pt-0.5`}>
                  <p className="font-bold text-brand-black dark:text-white" style={{ letterSpacing: '-0.01em' }}>{step.title}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────── */}
      <section className="bg-brand-red px-5 py-12 text-center">
        <p
          className="text-white font-black"
          style={{ fontSize: 'clamp(32px, 8vw, 48px)', letterSpacing: '-0.04em', lineHeight: '1.05', textWrap: 'balance' }}
        >
          Rapide.&nbsp;Sûr.&nbsp;Fiable.
        </p>
        <p className="text-red-200/80 text-sm mt-3 mb-7" style={{ letterSpacing: '0.02em' }}>
          Zone Antananarivo · Lundi–Vendredi 8h–17h
        </p>
        <Link
          href="/commander"
          className="inline-block bg-white text-brand-red font-bold rounded-2xl px-8 py-3.5 hover:bg-gray-50 active:scale-[0.98] transition-all"
          style={{ letterSpacing: '-0.01em', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          Commander maintenant
        </Link>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="px-5 py-10 bg-brand-black">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-5 text-center">
          <span className="font-black text-white/40 text-sm tracking-widest uppercase">Taxi Fast Service</span>

          <div className="flex items-center gap-6">
            <a
              href={TEL}
              className="flex items-center gap-1.5 font-medium transition-colors text-white/60 hover:text-white"
              style={{ fontSize: '13px' }}
            >
              <IconPhone size={14} />
              {TEL_DISPLAY}
            </a>
            <div className="w-px h-3.5 bg-white/10" />
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium transition-colors text-white/60 hover:text-white"
              style={{ fontSize: '13px' }}
            >
              <IconWhatsApp size={14} />
              WhatsApp
            </a>
          </div>

          <p className="text-white/50" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
            © 2025 TAXI FAST SERVICE — ANTANANARIVO
          </p>
        </div>
      </footer>
    </main>
  )
}
