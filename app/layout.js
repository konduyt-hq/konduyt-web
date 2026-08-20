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
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
