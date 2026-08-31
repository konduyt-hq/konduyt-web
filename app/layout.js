import './globals.css';
import ServiceWorker from './ServiceWorker';

export const metadata = {
  title: 'Konduyt: One integration. Every payment provider.',
  description:
    'Every payment provider has a different API. Konduyt gives you one. Connect Stripe, PayPal, M-Pesa, Flutterwave and more with a few lines of code.',
  metadataBase: new URL('https://konduyt.dev'),
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Konduyt',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: 'Konduyt: One integration. Every payment provider.',
    description:
      'Every payment provider has a different API. Konduyt gives you one. Connect Stripe, PayPal, M-Pesa, Flutterwave and more with a few lines of code.',
    url: 'https://konduyt.dev',
    siteName: 'Konduyt',
    type: 'website',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Konduyt' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Konduyt: One integration. Every payment provider.',
    description:
      'Every payment provider has a different API. Konduyt gives you one.',
    images: ['/icon-512.png'],
  },
  alternates: {
    canonical: 'https://konduyt.dev',
  },
};

export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Organization structured data -- helps Google understand "Konduyt"
            as a real, specific entity (not just a string of text) when
            someone searches the brand name directly. Every field here is a
            real, verifiable fact already elsewhere in this codebase (the
            GitHub org link, the icon already used for OG images) -- nothing
            invented, since incorrect structured data is worse than none. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Konduyt',
              url: 'https://konduyt.dev',
              logo: 'https://konduyt.dev/icon-512.png',
              description:
                'Konduyt is a payment orchestration platform. One integration connects your business to every payment provider and method -- Stripe, PayPal, M-Pesa, Flutterwave, Paystack and more.',
              sameAs: ['https://github.com/konduyt-hq'],
            }),
          }}
        />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
