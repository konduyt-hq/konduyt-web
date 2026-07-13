import Nav from '../../components/Nav'
import Footer from '../../components/Footer'
import Link from 'next/link'
import styles from './page.module.css'

export const metadata = {
  title: 'Pricing',
  description: 'Local is free. Global is paid. Enterprise is custom.',
}

const LOCAL_FEATURES = [
  'Unlimited vendors',
  'Unlimited transactions',
  'Full SDK access',
  'Unified dashboard',
  'Production mode',
  'Tax calculation',
  'Tax filing guidance',
  'Automated reconciliation',
  'Konduyt Watchdog™',
  'API monitoring',
  'Webhook monitoring',
  'Tax change monitoring',
  'Outage detection',
  'Audit history',
  'One jurisdiction',
]

const GLOBAL_EXTRAS = [
  'Unlimited jurisdictions',
  'Multi-country tax engine',
  'Cross-border reconciliation',
  'Multi-currency reporting',
  'Global payment operations',
]

export default function PricingPage() {
  return (
    <>
      <Nav />

      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Local is free.<br />
            Global is paid.<br />
            Enterprise is custom.
          </h1>
          <p className={styles.sub}>
            Every business deserves world-class payment infrastructure in its home market.
            We charge only when your business becomes global.
          </p>
        </div>

        <div className={styles.grid}>

          {/* LOCAL */}
          <div className={styles.card}>
            <div className={styles.tier}>Local</div>
            <div className={styles.price}>
              <span className={styles.priceAmount}>$0</span>
              <span className={styles.pricePer}>/ forever</span>
            </div>
            <p className={styles.tierDesc}>For businesses operating in one country.</p>
            <Link href="/signup" className={styles.ctaSecondary}>Start for free</Link>
            <ul className={styles.features}>
              {LOCAL_FEATURES.map(f => (
                <li key={f} className={styles.feature}>
                  <span className={styles.check}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* GLOBAL */}
          <div className={`${styles.card} ${styles.featured}`}>
            <div className={styles.featuredBadge}>Most popular</div>
            <div className={styles.tier}>Global</div>
            <div className={styles.price}>
              <span className={styles.priceAmount}>$49</span>
              <span className={styles.pricePer}>/ month per project</span>
            </div>
            <p className={styles.tierDesc}>For businesses operating across multiple countries.</p>
            <Link href="/signup" className={styles.ctaPrimary}>Start 30-day free trial</Link>
            <p className={styles.trialNote}>No credit card needed for trial</p>
            <ul className={styles.features}>
              <li className={styles.featureGroup}>Everything in Local, plus:</li>
              {GLOBAL_EXTRAS.map(f => (
                <li key={f} className={styles.feature}>
                  <span className={styles.checkAccent}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          {/* ENTERPRISE */}
          <div className={styles.card}>
            <div className={styles.tier}>Enterprise</div>
            <div className={styles.price}>
              <span className={styles.priceAmount}>Custom</span>
            </div>
            <p className={styles.tierDesc}>
              For organizations whose needs don't fit the standard product.
            </p>
            <a href="mailto:enterprise@konduyt.dev" className={styles.ctaSecondary}>
              Let's talk
            </a>
            <ul className={styles.features}>
              {[
                'Custom payment provider integration',
                'One invoice covering many projects',
                'Migration assistance',
                'Dedicated engineering support',
                'SLA contracts',
                'Procurement & compliance',
              ].map(f => (
                <li key={f} className={styles.feature}>
                  <span className={styles.check}>✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Philosophy */}
        <div className={styles.philosophy}>
          <p>
            Every business deserves world-class payment infrastructure in its home market.
            We charge only when your business becomes global.
          </p>
        </div>

      </main>

      <Footer />
    </>
  )
}
