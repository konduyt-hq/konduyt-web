'use client'
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import styles from '../login/page.module.css'

export default function SignupPage() {
  return (
    <div className={styles.page}>
      <div className={styles.clerkWrapper}>
        <Link href="/" className={styles.logo}>
          KONDU<span>Y</span>T
        </Link>
        <SignUp
          routing="hash"
          redirectUrl="/onboarding"
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
          }}
        />
      </div>
    </div>
  )
}
