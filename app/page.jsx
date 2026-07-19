import Nav from '../components/Nav'
import UniverseSection from '../components/UniverseSection'
import PlatformDiagram from '../components/PlatformDiagram'
import IntelligenceSection from '../components/IntelligenceSection'
import Footer from '../components/Footer'
import Link from 'next/link'
import styles from './page.module.css'

const VENDORS = ['Stripe','PayPal','M-Pesa','Flutterwave','Razorpay','GrabPay','PIX','Paystack','UPI','iDEAL','SEPA','Alipay','WeChat Pay','MTN Money','Airtel Money','Orange Money']

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">

        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroBadge}>Payment Infrastructure</div>
          <h1 className={styles.heroTitle}>
            The operating system<br />for getting paid.
          </h1>
          <p className={styles.heroSub}>
            One infrastructure layer for developers shipping products,
            creators earning globally, and businesses paying their teams.
          </p>
          <div className={styles.heroCTAs}>
            <Link href="/signup" className={styles.ctaPrimary}>Start free</Link>
            <Link href="/docs" className={styles.ctaSecondary}>View docs</Link>
          </div>
        </section>

        {/* TRUST BAR */}
        <div className={styles.trustBar}>
          <div className={styles.trustInner}>
            <span className={styles.trustLabel}>Works with</span>
            <div className={styles.trustVendors}>
              {VENDORS.map((v,i) => (
                <span key={v} className={styles.trustVendor} style={{ opacity: i > 7 ? 0.35 : 1 }}>{v}</span>
              ))}
              <span className={styles.trustMore}>+ many more</span>
            </div>
          </div>
        </div>

        {/* PROBLEM */}
        <section className={styles.problem}>
          <div className={styles.problemInner}>
            <div className={styles.problemLeft}>
              <h2 className={styles.problemTitle}>Every payment system creates complexity.</h2>
            </div>
            <div className={styles.problemRight}>
              <p className={styles.problemBody}>
                Different APIs. Different authentication. Different webhooks. Different currencies.
                Different tax rules. If you operate globally, you end up integrating every payment
                provider individually. That is expensive to build and difficult to maintain.
              </p>
              <p className={styles.problemSolution}>
                Konduyt removes that complexity. One integration. Konduyt decides which provider
                to use for every payment — and why.
              </p>
            </div>
          </div>
        </section>

        {/* THREE PRODUCTS */}
        <UniverseSection />

        {/* HOW THEY CONNECT */}
        <PlatformDiagram />

        {/* PAYMENT INTELLIGENCE */}
        <IntelligenceSection />

        {/* PRICING TEASER */}
        <section className={styles.pricing}>
          <div className={styles.pricingInner}>
            <h2 className={styles.pricingTitle}>Simple pricing.</h2>
            <p className={styles.pricingSub}>Free in your home country. Paid when you go global.</p>
            <div className={styles.pricingCards}>
              <div className={styles.pricingCard}>
                <div className={styles.pricingTier}>Local</div>
                <div className={styles.pricingPrice}>$0</div>
                <div className={styles.pricingNote}>Free forever · 1 jurisdiction</div>
              </div>
              <div className={styles.pricingCard} style={{ borderColor: 'rgba(255,92,53,.35)', background: 'var(--accent-dim)' }}>
                <div className={styles.pricingTier}>Global</div>
                <div className={styles.pricingPrice}>$49<span>/mo</span></div>
                <div className={styles.pricingNote}>Per project · Unlimited jurisdictions</div>
              </div>
              <div className={styles.pricingCard}>
                <div className={styles.pricingTier}>Enterprise</div>
                <div className={styles.pricingPrice}>Custom</div>
                <div className={styles.pricingNote}>Volume · SLA · Dedicated support</div>
              </div>
            </div>
            <Link href="/pricing" className={styles.pricingLink}>See full pricing →</Link>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={styles.finalCTA}>
          <div className={styles.finalInner}>
            <h2 className={styles.finalTitle}>Start building the future of payments.</h2>
            <p className={styles.finalSub}>Free to start. No credit card required.</p>
            <div className={styles.finalActions}>
              <Link href="/signup" className={styles.ctaPrimary} style={{ fontSize: '15px', padding: '13px 28px' }}>Start free</Link>
              <a href="mailto:teamkonduyt@gmail.com" className={styles.ctaSecondary} style={{ fontSize: '15px', padding: '13px 22px' }}>Talk to us</a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
