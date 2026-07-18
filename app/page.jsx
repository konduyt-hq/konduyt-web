import Nav from '../components/Nav'
import RotatingPill from '../components/hero/RotatingPill'
import VendorCircles from '../components/hero/VendorCircles'
import DashboardMockup from '../components/hero/DashboardMockup'
import PainSection from '../components/PainSection'
import UniverseSection from '../components/UniverseSection'
import Footer from '../components/Footer'
import InstallButton from '../components/InstallButton'
import Link from 'next/link'
import styles from './page.module.css'

const ALL_VENDORS = [
  'Stripe','PayPal','M-Pesa','Flutterwave','Razorpay','GrabPay','PIX',
  'Paystack','UPI','iDEAL','SEPA','Alipay','WeChat Pay','MTN Money',
  'Airtel Money','Orange Money','Paytm','PhonePe','Venmo','Cash App',
]

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">

        {/* HERO */}
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroLeft}>
            <div className={styles.label} aria-hidden="true">
              <span className={styles.labelDot} />
              Payment Infrastructure
            </div>
            <h1 className={styles.heading} id="hero-heading">
              Each one. A different<br /><RotatingPill /> headache.
            </h1>
            <p className={styles.sub}>
              One integration for your website, app, or marketplace.<br />
              We show you exactly what taxes you owe and where to pay them.
            </p>
            <div className={styles.ctaWrap}>
              <Link href="/signup" className={styles.ctaPrimary}>Sign up free →</Link>
              <Link href="/docs" className={styles.ctaSecondary}>View docs</Link>
              <InstallButton />
            </div>
            <VendorCircles />
          </div>
          <div className={styles.heroRight}>
            <DashboardMockup />
          </div>
        </section>

        {/* VENDOR STRIP */}
        <div className={styles.strip} aria-label="Compatible payment providers">
          <div className={styles.stripInner}>
            <span className={styles.stripLabel}>Works with</span>
            <div className={styles.stripVendors} role="list">
              {ALL_VENDORS.map((v, i) => (
                <span key={v} className={styles.stripName} role="listitem" style={{ opacity: i > 9 ? 0.4 : 1 }}>{v}</span>
              ))}
              <span className={styles.stripMore} role="listitem">+ many more</span>
            </div>
          </div>
        </div>

        {/* CHOOSE YOUR UNIVERSE — prominent */}
        <UniverseSection />

        {/* PAIN SECTION */}
        <PainSection />

      </main>
      <Footer />
    </>
  )
}
