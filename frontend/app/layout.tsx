import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './contexts/theme-context'
import OfflineIndicator from './components/OfflineIndicator'
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration'
import { PrecacheClient } from './components/PrecacheClient'

export const metadata: Metadata = {
  title: 'Карточки - Учим слова',
  description: 'Приложение для изучения слов с помощью карточек',
  manifest: '/manifest.json',
  themeColor: '#667eea',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Карточки',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#667eea" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Карточки" />
      </head>
      <body>
        <ThemeProvider>
          <ServiceWorkerRegistration />
          <PrecacheClient />
          <OfflineIndicator />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}


