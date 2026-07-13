import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrap}>
        <div className={styles.logo}>
          KONDU<span className={styles.accent}>Y</span>T
        </div>

        <nav aria-label="Footer navigation">
          <ul className={styles.nav} role="list">
            <li><Link href="/docs">Docs</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li>
              <a href="https://github.com/konduyt-hq" rel="noopener noreferrer" target="_blank">
                GitHub
              </a>
            </li>
          </ul>
        </nav>

        <p className={styles.copy}>© 2026 Konduyt. All rights reserved.</p>
      </div>
    </footer>
  )
}
