import Link from 'next/link'
import styles from './UniverseSection.module.css'

const PRODUCTS = [
  {
    id: 'build',
    name: 'KONDUYTbuild',
    accent: '#FF5C35',
    accentBg: 'rgba(255,92,53,0.10)',
    accentBorder: 'rgba(255,92,53,0.30)',
    status: 'Available now',
    statusColor: '#22C55E',
    statusBg: 'rgba(34,197,94,0.10)',
    tagline: 'For developers',
    desc: 'One integration for every payment method in your website, app, or marketplace. Stripe, PayPal, M-Pesa, Flutterwave — unified behind a single SDK with tax guidance built in.',
    features: [
      'Every payment method, one line of code',
      'Works in websites, apps, and marketplaces',
      'Tax guidance for every jurisdiction',
      'Sandbox included — test before going live',
      'Free in your home country',
    ],
    cta: { text: 'Start building free →', href: '/signup', primary: true },
    pulse: true,
  },
  {
    id: 'creator',
    name: 'KONDUYTcreator',
    accent: '#F59E0B',
    accentBg: 'rgba(245,158,11,0.08)',
    accentBorder: 'rgba(245,158,11,0.25)',
    status: 'In development · September 2026',
    statusColor: '#F59E0B',
    statusBg: 'rgba(245,158,11,0.10)',
    tagline: 'For creators',
    desc: 'Accept tips, memberships, and payments from fans anywhere — in their currency, tracked in one dashboard. Built for streamers, YouTubers, and independent creators earning globally.',
    features: [
      'No-code tip widget for any platform',
      'Multi-currency, one payout',
      'Track all income in one place',
      'Tax guidance per country',
    ],
    cta: { text: 'Get notified when live →', href: 'mailto:teamkonduyt@gmail.com', primary: false },
    pulse: false,
  },
  {
    id: 'payroll',
    name: 'KONDUYTpayroll',
    accent: '#22C55E',
    accentBg: 'rgba(34,197,94,0.08)',
    accentBorder: 'rgba(34,197,94,0.25)',
    status: 'In development · September 2026',
    statusColor: '#22C55E',
    statusBg: 'rgba(34,197,94,0.10)',
    tagline: 'For businesses',
    desc: 'Pay your global team in their local currency, on time, with correct tax deductions — automatically. One click. Every country. A fraction of the cost of Deel or Remote.',
    features: [
      'Pay in any local currency or rail',
      'Correct tax deductions per country',
      'M-Pesa, UPI, PIX, bank transfer',
      '85% cheaper than Deel',
    ],
    cta: { text: 'Get notified when live →', href: 'mailto:teamkonduyt@gmail.com', primary: false },
    pulse: false,
  },
]

export default function UniverseSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.eyebrow}>Choose your universe</div>
          <h2 className={styles.title}>One platform. Three tools.</h2>
          <p className={styles.subtitle}>Pick the tool that fits where you are right now.</p>
        </div>

        {/* Cards */}
        <div className={styles.grid}>
          {PRODUCTS.map(p => (
            <div
              key={p.id}
              className={styles.card}
              style={{
                borderColor: p.accentBorder,
                '--card-accent': p.accent,
                '--card-accent-bg': p.accentBg,
              }}
            >
              {/* Top accent bar */}
              <div className={styles.accentBar} style={{ background: p.accent }} />

              {/* Status badge */}
              <div
                className={styles.badge}
                style={{ color: p.statusColor, background: p.statusBg }}
              >
                <span
                  className={styles.badgeDot}
                  style={{
                    background: p.statusColor,
                    animation: p.pulse ? 'pulse 2s ease-in-out infinite' : 'none',
                  }}
                />
                {p.status}
              </div>

              {/* Tagline */}
              <div className={styles.tagline} style={{ color: p.accent }}>{p.tagline}</div>

              {/* Name */}
              <div className={styles.name}>{p.name}</div>

              {/* Description */}
              <p className={styles.desc}>{p.desc}</p>

              {/* Features */}
              <ul className={styles.features}>
                {p.features.map(f => (
                  <li key={f} className={styles.feature}>
                    <span style={{ color: p.accent, flexShrink: 0, fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {p.cta.primary ? (
                <Link
                  href={p.cta.href}
                  className={styles.ctaPrimary}
                  style={{ background: p.accent }}
                >
                  {p.cta.text}
                </Link>
              ) : (
                <a
                  href={p.cta.href}
                  className={styles.ctaSecondary}
                  style={{ color: p.accent, background: p.accentBg, borderColor: p.accentBorder }}
                >
                  {p.cta.text}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
