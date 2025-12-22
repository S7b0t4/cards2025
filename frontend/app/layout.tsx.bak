import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from './contexts/theme-context'

export const metadata: Metadata = {
  title: 'АБОБА - Учим слова',
  description: 'Приложение для изучения слов с помощью карточек',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}


