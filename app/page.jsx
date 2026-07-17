import Nav from '../components/Nav'
import RotatingPill from '../components/hero/RotatingPill'
import VendorCircles from '../components/hero/VendorCircles'
import DashboardMockup from '../components/hero/DashboardMockup'
import PainSection from '../components/PainSection'
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

        <PainSection />

        {/* PRODUCTS SECTION */}
        <section className={styles.products} aria-labelledby="products-heading">
          <div className={styles.productsInner}>
            <h2 className={styles.productsTitle} id="products-heading">Our products</h2>

            <div className={styles.productsGrid}>

              {/* KONDUYTbuild — 3/4 */}
              <div className={styles.buildCard}>
                <div className={styles.buildBadge}>Available now</div>
                <div className={styles.buildName}>
                  KONDU<span style={{color:'var(--accent)'}}>Y</span>Tbuild
                </div>
                <p className={styles.buildDesc}>
                  The developer SDK. One integration for every payment method, local rail, and tax jurisdiction — in your website, app, or marketplace.
                </p>
                <ul className={styles.buildFeatures}>
                  {['Stripe, PayPal, M-Pesa, Flutterwave, Razorpay and many others — unified','Works in websites, mobile apps, and marketplaces','Tax guidance built in for every jurisdiction','Sandbox included — test before going live','Free in your home country'].map(f => (
                    <li key={f}><span style={{color:'var(--accent)'}}>✓</span> {f}</li>
                  ))}
                </ul>
                <div className={styles.buildActions}>
                  <Link href="/signup" className={styles.ctaPrimary} style={{fontSize:'14px',padding:'11px 22px'}}>Start building free →</Link>
                  <Link href="/pricing" className={styles.ctaSecondary} style={{fontSize:'14px',padding:'11px 18px'}}>See pricing</Link>
                </div>
              </div>

              {/* Coming soon stack — 1/4 */}
              <div className={styles.comingSoonStack}>

                <div className={styles.comingSoonCard}>
                  <div className={styles.comingSoonBadge}>Coming soon</div>
                  <div className={styles.comingSoonName}>
                    KONDU<span style={{color:'var(--accent)'}}>Y</span>Tcreator
                  </div>
                  <p className={styles.comingSoonDesc}>
                    For streamers, YouTubers, and creators. Accept tips and memberships from fans anywhere in the world — in their currency, tracked in one place.
                  </p>
                </div>

                <div className={styles.comingSoonCard}>
                  <div className={styles.comingSoonBadge}>Coming soon</div>
                  <div className={styles.comingSoonName}>
                    KONDU<span style={{color:'var(--accent)'}}>Y</span>Tpayroll
                  </div>
                  <p className={styles.comingSoonDesc}>
                    Pay your global team in their local currency, on time, with the right tax deductions — automatically. One click. Every country.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
