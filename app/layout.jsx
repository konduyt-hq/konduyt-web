import { AuthProvider } from '../lib/auth-context'
import { Space_Grotesk, Inter } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })
const inter        = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title:       'Konduyt — The operating system for getting paid',
  description: 'Payment infrastructure for developers, creators, and finance teams.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
