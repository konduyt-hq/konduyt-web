'use client'
import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import styles from './page.module.css'

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.clerkWrapper}>
        <Link href="/" className={styles.logo}>
          KONDU<span>Y</span>T
        </Link>
        <SignIn
          routing="hash"
          redirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: '#FF5C35',
              colorBackground: '#0D1120',
              colorInputBackground: '#131928',
              colorInputText: '#EDF0F7',
              colorText: '#EDF0F7',
              colorTextSecondary: '#8892A4',
              borderRadius: '10px',
              fontFamily: 'Inter, sans-serif',
            },
            elements: {
              card:              'clerk-card',
              headerTitle:       'clerk-header',
              socialButtonsRoot: 'clerk-social',
              formButtonPrimary: 'clerk-btn-primary',
              footerActionLink:  'clerk-footer-link',
            }
          }}
        />
      </div>
    </div>
  )
}
