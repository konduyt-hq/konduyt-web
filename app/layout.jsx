import '../styles/globals.css'

export const metadata = {
  title: {
    default: 'Konduyt — Payment Infrastructure for Developers',
    template: '%s | Konduyt',
  },
  description:
    'One SDK for every payment method. Stripe, PayPal, M-Pesa, Flutterwave, Razorpay and many others — unified behind one integration with built-in tax calculation. Free forever in your home country.',
  keywords: [
    'payment SDK', 'payment API', 'payment infrastructure',
    'M-Pesa', 'Stripe', 'PayPal', 'Flutterwave', 'Razorpay',
    'GrabPay', 'PIX', 'tax calculation', 'developer payments',
  ],
  authors: [{ name: 'Konduyt', url: 'https://konduyt.dev' }],
  creator: 'Konduyt',
  metadataBase: new URL('https://konduyt.dev'),
  openGraph: {
    type: 'website',
    url: 'https://konduyt.dev',
    title: 'Konduyt — Payment Infrastructure for Developers',
    description: 'One SDK for every payment method. Free forever in your home country.',
    siteName: 'Konduyt',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@konduyt',
    title: 'Konduyt — Payment Infrastructure for Developers',
    description: 'One SDK for every payment method. Free forever in your home country.',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
  canonical: 'https://konduyt.dev',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
