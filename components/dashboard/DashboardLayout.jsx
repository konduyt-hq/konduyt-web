'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import styles from './DashboardLayout.module.css'

export default function DashboardLayout({ children, org, project }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [live, setLive] = useState(false)

  const tabs = [
    { label: 'Integration',   href: `/dashboard/${org?.id}/${project?.id}` },
    { label: 'Transactions',  href: `/dashboard/${org?.id}/${project?.id}/transactions` },
    { label: 'Settings',      href: `/dashboard/${org?.id}/${project?.id}/settings` },
  ]

  function isActive(href) {
    if (href === `/dashboard/${org?.id}/${project?.id}`) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className={styles.shell}>

      {/* Top bar */}
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <Link href="/dashboard" className={styles.logo}>
            KONDU<span>Y</span>T
          </Link>

          {project && (
            <div className={styles.projectPicker}>
              <span className={styles.projectName}>{project.name}</span>
              <span className={styles.chevron}>▾</span>
            </div>
          )}
        </div>

        <div className={styles.topRight}>
          {/* Sandbox / Live toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${!live ? styles.modeBtnActive : ''}`}
              onClick={() => setLive(false)}
            >
              Sandbox
            </button>
            <button
              className={`${styles.modeBtn} ${live ? styles.modeBtnActiveLive : ''}`}
              onClick={() => setLive(true)}
            >
              Live
            </button>
          </div>

          <button className={styles.upgradeBtn} onClick={() => router.push('/pricing')}>
            Upgrade →
          </button>

          <div className={styles.avatar} title="Account">IK</div>
        </div>
      </header>

      {/* Tabs */}
      <nav className={styles.tabs} aria-label="Dashboard sections">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive(tab.href) ? styles.tabActive : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Page content */}
      <main className={styles.content}>
        {children}
      </main>

    </div>
  )
}
