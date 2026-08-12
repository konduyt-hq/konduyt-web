import './globals.css';
import ServiceWorker from './ServiceWorker';
import { I18nProvider } from './i18n/I18nProvider';

export const metadata = {
  title: 'Konduyt — One integration. Every payment provider.',
  description:
    'Every payment provider has a different API. Konduyt gives you one. Connect Stripe, PayPal, M-Pesa, Flutterwave and more with a few lines of code.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Konduyt',
    statusBarStyle: 'default',
  },
  icons: {
    apple: '/apple-touch-icon.png',
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme + language/direction before paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('kdu_theme');if(t==='dark'||(t===null&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}var l=localStorage.getItem('kdu_lang');if(l){document.documentElement.setAttribute('lang',l);document.documentElement.setAttribute('dir', l==='ar'?'rtl':'ltr');}}catch(e){}})();` }} />
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
        <I18nProvider>
          {children}
        </I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
