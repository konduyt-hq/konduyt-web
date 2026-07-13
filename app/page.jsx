import Nav from '../components/Nav'
import RotatingPill from '../components/hero/RotatingPill'
import VendorCircles from '../components/hero/VendorCircles'
import DashboardMockup from '../components/hero/DashboardMockup'
import PainSection from '../components/PainSection'
import Footer from '../components/Footer'
import styles from './page.module.css'

export default function HomePage() {
  return (
    <>
      <Nav />

      <main id="main">

        {/* ── HERO ── */}
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroLeft}>

            {/* Label — Redis / Pinecone style */}
            <div className={styles.label} aria-hidden="true">
              <span className={styles.labelDot} />
              Payment Infrastructure
            </div>

            {/* Headline with rotating pill — Notion style */}
            <h1 className={styles.heading} id="hero-heading">
              Each one. A different<br />
              <RotatingPill /> headache.
            </h1>

            <p className={styles.sub}>
              We built one integration for all of them.<br />
              We handle your taxes too.
            </p>

            {/* Email CTA — GitHub style */}
            <div className={styles.ctaWrap}>
              <input
                type="email"
                className={styles.emailInput}
                placeholder="Enter your work email"
                aria-label="Work email address"
                autoComplete="email"
              />
              <button className={styles.ctaPrimary}>Sign up free →</button>
              <button className={styles.ctaSecondary}>View docs</button>
            </div>

            {/* Vendor circles */}
            <VendorCircles />

          </div>

          {/* Right — dashboard mockup — OKX style */}
          <div className={styles.heroRight}>
            <DashboardMockup />
          </div>
        </section>

        {/* ── VENDOR STRIP — Pinecone style ── */}
        <div className={styles.strip} aria-label="Compatible payment providers">
          <div className={styles.stripInner}>
            <span className={styles.stripLabel}>Works with</span>
            <div className={styles.stripVendors} role="list">
              {['Stripe','PayPal','M-Pesa','Flutterwave','Razorpay','GrabPay','PIX'].map(v => (
                <span key={v} className={styles.stripName} role="listitem">{v}</span>
              ))}
              <span className={styles.stripMore} role="listitem">+ many others</span>
            </div>
          </div>
        </div>

        {/* ── PAIN — Vonnegut copy ── */}
        <PainSection />

      </main>

      <Footer />
    </>
  )
}
