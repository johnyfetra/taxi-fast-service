import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Taxi Fast Service — Taxi-moto & Livraison à Antananarivo',
  description:
    'Commandez votre taxi-moto ou livraison express à Tana. Prix transparent avant la course, confirmation par appel ou WhatsApp.',
  openGraph: {
    title: 'Taxi Fast Service',
    description: 'Taxi-moto & livraison express à Antananarivo. Rapide, sûr, confortable.',
    type: 'website',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
