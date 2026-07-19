import Link from 'next/link'
import styles from './UniverseSection.module.css'

const PRODUCTS = [
  {
    id:      'build',
    name:    'KONDUYTbuild',
    accent:  '#FF5C35',
    border:  'rgba(255,92,53,0.30)',
    pillBg:  'rgba(255,92,53,0.12)',
    status:  null,
    tagline: 'For developers shipping payments.',
    desc:    'Connect Stripe, PayPal, M-Pesa, Flutterwave and more through one integration. Stop maintaining five APIs. Start shipping.',
    features: ['One SDK for every provider','Intelligent payment routing','Transaction intelligence','Automated reconciliation'],
    cta:     { text: 'Start building', href: '/signup', primary: true },
  },
  {
    id:      'creator',
    name:    'KONDUYTcreator',
    accent:  '#F59E0B',
    border:  'rgba(245,158,11,0.28)',
    pillBg:  'rgba(245,158,11,0.10)',
    status:  'In development · September 2026',
    tagline: 'For people earning globally.',
    desc:    'One payment identity for freelancers, artists, developers, and online businesses. Accept money from anyone, anywhere.',
    features: ['Public payment links','Track all income','Tax guidance per country','Multi-platform earnings'],
    cta:     { text: 'Start earning', href: 'mailto:teamkonduyt@gmail.com', primary: false },
  },
  {
    id:      'payroll',
    name:    'KONDUYTpayroll',
    accent:  '#22C55E',
    border:  'rgba(34,197,94,0.25)',
    pillBg:  'rgba(34,197,94,0.08)',
    status:  'In development · September 2026',
    tagline: 'For companies paying people everywhere.',
    desc:    'Manage employee and contractor payments across countries. One click. Correct currency. Right tax deductions.',
    features: ['Payroll automation','Compliance per country','Currency handling','Reporting'],
    cta:     { text: 'Manage payroll', href: 'mailto:teamkonduyt@gmail.com', primary: false },
  },
]

export default function UniverseSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Choose your universe</div>
        <h2 className={styles.title}>One platform. Three tools.</h2>
        <p className={styles.sub}>Each product is a different entry point into the same payment engine. One account. No migration between products.</p>
        <div className={styles.grid}>
          {PRODUCTS.map(p => (
            <div key={p.id} className={styles.card} style={{ borderColor: p.border }}>
              <div className={styles.topBar} style={{ background: p.accent }} />
              <div className={styles.namePill} style={{ background: p.pillBg, color: p.accent, border: '1px solid ' + p.border }}>{p.name}</div>
              <div className={styles.status} style={{ color: p.status ? 'var(--text-muted)' : '#22C55E' }}>
                {p.status || '● Available now'}
              </div>
              <div className={styles.tagline} style={{ color: p.accent }}>{p.tagline}</div>
              <p className={styles.desc}>{p.desc}</p>
              <ul className={styles.features}>
                {p.features.map(f => (
                  <li key={f} className={styles.feature}>
                    <span style={{ color: p.accent }}>+</span> {f}
                  </li>
                ))}
              </ul>
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
