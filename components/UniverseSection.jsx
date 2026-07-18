import Link from 'next/link'
import styles from './UniverseSection.module.css'

const PRODUCTS = [
  {
    id:       'build',
    name:     'KONDUYTbuild',
    accent:   '#FF5C35',
    pillBg:   'rgba(255,92,53,0.15)',
    border:   'rgba(255,92,53,0.35)',
    status:   '● Available now',
    isLive:   true,
    tagline:  'For developers',
    desc:     'One SDK for every payment method. Stripe, PayPal, M-Pesa, Flutterwave and many others — unified. Tax guidance included.',
    cta:      { text: 'Start building free →', href: '/signup', primary: true },
  },
  {
    id:       'creator',
    name:     'KONDUYTcreator',
    accent:   '#F59E0B',
    pillBg:   'rgba(245,158,11,0.12)',
    border:   'rgba(245,158,11,0.30)',
    status:   'In development · September 2026',
    isLive:   false,
    tagline:  'For creators',
    desc:     'Accept tips, memberships, and digital payments from fans worldwide — in their currency, tracked in one place.',
    cta:      { text: 'Notify me when live', href: 'mailto:teamkonduyt@gmail.com', primary: false },
  },
  {
    id:       'payroll',
    name:     'KONDUYTpayroll',
    accent:   '#22C55E',
    pillBg:   'rgba(34,197,94,0.10)',
    border:   'rgba(34,197,94,0.28)',
    status:   'In development · September 2026',
    isLive:   false,
    tagline:  'For businesses',
    desc:     'Pay your global team in their local currency, automatically. One click. Every country.',
    cta:      { text: 'Notify me when live', href: 'mailto:teamkonduyt@gmail.com', primary: false },
  },
]

export default function UniverseSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Choose your universe</div>
        <h2 className={styles.title}>One platform. Three tools.</h2>
        <div className={styles.grid}>
          {PRODUCTS.map(p => (
            <div key={p.id} className={styles.card} style={{ borderColor: p.border }}>
              {/* Top bar */}
              <div className={styles.topBar} style={{ background: p.accent }} />
              {/* Name pill */}
              <div className={styles.namePill} style={{ background: p.pillBg, color: p.accent, border: `1px solid ${p.border}` }}>
                {p.name}
              </div>
              {/* Status */}
              <div className={styles.status} style={{ color: p.isLive ? '#22C55E' : 'var(--text-muted)' }}>
                {p.status}
              </div>
              {/* Tagline */}
              <div className={styles.tagline} style={{ color: p.accent }}>{p.tagline}</div>
              {/* Description */}
              <p className={styles.desc}>{p.desc}</p>
              {/* CTA */}
              {p.cta.primary
                ? <Link href={p.cta.href} className={styles.ctaPrimary} style={{ background: p.accent }}>{p.cta.text}</Link>
                : <a href={p.cta.href} className={styles.ctaSecondary} style={{ color: p.accent, borderColor: p.border }}>{p.cta.text}</a>
              }
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
