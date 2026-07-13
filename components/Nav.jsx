'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './Nav.module.css'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <nav className={styles.nav} aria-label="Main navigation">
        <div className={styles.wrap}>

          {/* Logo — swap font-family in Nav.module.css .logo when you have your custom font */}
          <Link href="/" className={styles.logo} aria-label="Konduyt home">
            KONDU<span className={styles.accent}>Y</span>T
          </Link>

          <ul className={styles.links} role="list">
            <li><Link href="/docs">Docs</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li>
              <a href="https://github.com/konduyt-hq" rel="noopener noreferrer" target="_blank">
                GitHub
              </a>
            </li>
            <li><Link href="/blog">Blog</Link></li>
          </ul>

          <div className={styles.actions}>
            <Link href="/login" className={styles.ghost}>Log in</Link>
            <Link href="/signup" className={styles.fill}>Sign up free</Link>
          </div>

        </div>
      </nav>
    </header>
  )
}
