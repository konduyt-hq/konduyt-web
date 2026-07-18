import '../styles/globals.css'
import '../styles/clerk-theme.css'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata = {
  title: { default: 'Konduyt — Payment Infrastructure for Developers', template: '%s | Konduyt' },
  description: 'One SDK for every payment method. Stripe, PayPal, M-Pesa, Flutterwave, Razorpay and many others — unified with built-in tax guidance. Free forever in your home country.',
  metadataBase: new URL('https://konduyt.dev'),
  openGraph: { type: 'website', url: 'https://konduyt.dev', title: 'Konduyt — Payment Infrastructure for Developers', description: 'One SDK for every payment method. Free forever in your home country.', siteName: 'Konduyt', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', site: '@konduyt', images: ['/og.png'] },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  manifest: '/manifest.json',
}

export const viewport = { themeColor: '#FF5C35' }

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/favicon.svg" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#FF5C35" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content="Konduyt" />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
