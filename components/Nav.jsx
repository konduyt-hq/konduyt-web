'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import styles from './Nav.module.css'

const LogoMark = () => (
  <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M2 2 Q9 10 9 18" stroke="#FF5C35" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M6.5 1 Q9 9 9 18" stroke="#FF5C35" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M11.5 1 Q9 9 9 18" stroke="#FF5C35" strokeWidth="2.2" strokeLinecap="round"/>
    <path d="M16 2 Q9 10 9 18" stroke="#FF5C35" strokeWidth="2.2" strokeLinecap="round"/>
    <line x1="9" y1="18" x2="9" y2="21" stroke="#FF5C35" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
)

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [checked,  setChecked]  = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setLoggedIn(!!data.session); setChecked(true) })
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s))
    return () => l.subscription.unsubscribe()
  }, [])

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.wrap}>
          <Link href="/" className={styles.logo} aria-label="Konduyt home">
            <LogoMark /><span style={{letterSpacing:'0.05em'}}>KONDU<span className={styles.accent}>Y</span>T</span>
          </Link>
          <ul className={styles.links} role="list">
            <li><Link href="/docs">Docs</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><a href="https://github.com/konduyt-hq" rel="noopener noreferrer" target="_blank">GitHub</a></li>
          </ul>
          <div className={styles.actions}>
            {checked && (loggedIn
              ? <Link href="/dashboard" className={styles.fill}>Go to Console →</Link>
              : <><Link href="/login" className={styles.ghost}>Log in</Link><Link href="/signup" className={styles.fill}>Sign up free</Link></>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
