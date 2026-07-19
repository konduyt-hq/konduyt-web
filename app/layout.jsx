import '../styles/globals.css'
import '../styles/clerk-theme.css'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata = {
  title: { default: 'Konduyt - Payment Infrastructure for Developers', template: '%s | Konduyt' },
  description: 'One integration for every payment method in your website, app, or marketplace. Free forever in your home country.',
  metadataBase: new URL('https://konduyt.dev'),
  openGraph: { type: 'website', url: 'https://konduyt.dev', title: 'Konduyt', description: 'One integration for every payment method.', siteName: 'Konduyt' },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' },
  manifest: '/manifest.json',
}

export const viewport = { themeColor: '#FF5C35' }

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
    >
      <html lang="en">
        <head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/favicon.svg" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#FF5C35" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-title" content="Konduyt" />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
