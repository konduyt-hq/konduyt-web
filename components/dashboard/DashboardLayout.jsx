'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk } from '../../lib/auth-context'
import styles from './DashboardLayout.module.css'

export default function DashboardLayout({ children, org, project }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { signOut } = useClerk()
  const [live, setLive] = useState(false)

  const orgId     = org?.id     || ''
  const projectId = project?.id || ''
  const base      = '/dashboard/' + orgId + '/' + projectId

  const tabs = [
    { label: 'Integration',  href: base },
    { label: 'Transactions', href: base + '/transactions' },
    { label: 'People',       href: base + '/people' },
    { label: 'Settings',     href: base + '/settings' },
  ]

  function isActive(href) {
    if (href === base) return pathname === href
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topLeft}>
          <Link href="/" className={styles.logo}>
            KONDU<span>Y</span>T
          </Link>
          {project && (
            <Link href={'/dashboard/' + orgId} className={styles.projectPicker}>
              <span className={styles.projectName}>{project.name}</span>
              <span className={styles.chevron}>v</span>
            </Link>
          )}
        </div>
        <div className={styles.topRight}>
          <div className={styles.modeToggle}>
            <button className={styles.modeBtn + (!live ? ' ' + styles.modeBtnActive : '')} onClick={() => setLive(false)}>Sandbox</button>
            <button className={styles.modeBtn + (live  ? ' ' + styles.modeBtnActiveLive : '')} onClick={() => setLive(true)}>Live</button>
          </div>
          <Link href="/pricing" className={styles.upgradeBtn}>Upgrade</Link>
          <button onClick={handleSignOut} className={styles.signOutBtn} title="Sign out">out</button>
        </div>
      </header>
      <nav className={styles.tabs} aria-label="Dashboard sections">
        {tabs.map(tab => (
          <Link key={tab.href} href={tab.href}
            className={styles.tab + (isActive(tab.href) ? ' ' + styles.tabActive : '')}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
