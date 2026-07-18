import Link from 'next/link'
import styles from './UniverseSection.module.css'

const PRODUCTS = [
  {
    id:          'build',
    name:        'KONDUYTbuild',
    accent:      '#FF5C35',
    pillBg:      'rgba(255,92,53,0.15)',
    pillText:    '#FF5C35',
    tagline:     'For developers',
    desc:        'One integration for every payment method in your website, app, or marketplace. Stripe, PayPal, M-Pesa, Flutterwave and many others — unified behind a single SDK.',
    status:      null,
    cta:         { text: 'Start building free →', href: '/signup', primary: true },
  },
  {
    id:          'creator',
    name:        'KONDUYTcreator',
    accent:      '#F59E0B',
    pillBg:      'rgba(245,158,11,0.15)',
    pillText:    '#F59E0B',
    tagline:     'For creators',
    desc:        'Accept tips, memberships, and digital payments from fans anywhere in the world — in their currency, in one dashboard.',
    status:      'In development · September 2026',
    cta:         { text: 'Notify me when live', href: 'mailto:teamkonduyt@gmail.com', primary: false },
  },
  {
    id:          'payroll',
    name:        'KONDUYTpayroll',
    accent:      '#22C55E',
    pillBg:      'rgba(34,197,94,0.15)',
    pillText:    '#22C55E',
    tagline:     'For businesses',
    desc:        'Pay your global team in their local currency, on time, automatically. One click. Every country.',
    status:      'In development · September 2026',
    cta:         { text: 'Notify me when live', href: 'mailto:teamkonduyt@gmail.com', primary: false },
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
            <div key={p.id} className={styles.card} style={{ '--accent': p.accent, '--pill-bg': p.pillBg }}>

              {/* Product name pill */}
              <div
                className={styles.namePill}
                style={{ background: p.pillBg, color: p.pillText, border: `1px solid ${p.pillText}30` }}
              >
                {p.name}
              </div>

              {/* Status */}
              {p.status && (
                <div className={styles.status}>{p.status}</div>
              )}
              {!p.status && (
                <div className={styles.statusLive}>● Available now</div>
              )}

              {/* Tagline */}
              <div className={styles.tagline} style={{ color: p.accent }}>{p.tagline}</div>

              {/* Description */}
              <p className={styles.desc}>{p.desc}</p>

              {/* CTA */}
              {p.cta.primary ? (
                <Link href={p.cta.href} className={styles.ctaPrimary} style={{ background: p.accent }}>
                  {p.cta.text}
                </Link>
              ) : (
                <a href={p.cta.href} className={styles.ctaSecondary} style={{ color: p.accent, borderColor: p.accent + '40' }}>
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
