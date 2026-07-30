import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#D81F26',
}

export const metadata: Metadata = {
  title: 'Taxi Fast Service — Taxi-moto & Livraison à Antananarivo',
  description:
    'Commandez votre taxi-moto ou livraison express à Tana. Prix transparent avant la course, confirmation par appel ou WhatsApp.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TFS',
    startupImage: [
      { url: '/icons/icon-1024x1024.png' },
    ],
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152' },
      { url: '/icons/icon-180x180.png', sizes: '180x180' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/icon-maskable-512x512.png', color: '#D81F26' },
    ],
  },
  openGraph: {
    title: 'Taxi Fast Service',
    description: 'Taxi-moto & livraison express à Antananarivo. Rapide, sûr, confortable.',
    type: 'website',
    images: [{ url: '/icons/icon-512x512.png', width: 512, height: 512 }],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
