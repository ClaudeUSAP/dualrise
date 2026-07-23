import { Toaster } from 'react-hot-toast'
import type { Metadata } from 'next'
import './globals.css'
import { CookieBanner } from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: 'USAP Dashboard',
  description: 'USAP family dashboard',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <footer className="mt-auto bg-navy px-4 py-8 text-sm text-white/70">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <a
                href="/legal"
                className="transition-colors hover:text-white hover:underline"
              >
                Mentions légales
              </a>
              <span className="text-white/30">·</span>
              <a
                href="/privacy"
                className="transition-colors hover:text-white hover:underline"
              >
                Politique de confidentialité
              </a>
              <span className="text-white/30">·</span>
              <a
                href="/en/privacy"
                className="transition-colors hover:text-white hover:underline"
              >
                Privacy (EN)
              </a>
              <span className="text-white/30">·</span>
              <a
                href="/terms"
                className="transition-colors hover:text-white hover:underline"
              >
                CGU
              </a>
              <span className="text-white/30">·</span>
              <a
                href="mailto:nicolas@usathleticperformance.com"
                className="transition-colors hover:text-white hover:underline"
              >
                Contact
              </a>
            </div>
            <div className="text-xs text-white/50">
              © 2026 US Athletic Performance Sàrl · Switzerland
            </div>
          </div>
        </footer>
        <CookieBanner />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { fontSize: '14px' },
          }}
        />
      </body>
    </html>
  )
}
