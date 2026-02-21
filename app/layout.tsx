import type { Metadata } from 'next'
import './globals.css'

// Fonts are loaded via @import in globals.css (IBM Plex Mono + Sans from Google Fonts).
// No next/font setup needed — the design system CSS variables handle everything.

export const metadata: Metadata = {
  title: 'Portfolio Dashboard',
  description: 'Crypto portfolio tracker',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
