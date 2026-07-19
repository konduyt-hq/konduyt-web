import Nav from '../components/Nav'
import RotatingPill from '../components/hero/RotatingPill'
import PainSection from '../components/PainSection'
import UniverseSection from '../components/UniverseSection'
import Footer from '../components/Footer'
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
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.label} aria-hidden="true">
            <span className={styles.labelDot} />
            Payment Infrastructure
          </div>
          <h1 className={styles.heading} id="hero-heading">
            Each one. A different <RotatingPill /> headache.
          </h1>
          <p className={styles.sub}>
            One integration for your website, app, or marketplace.
            We show you exactly what taxes you owe and where to pay them.
          </p>
        </section>
        <UniverseSection />
        <div className={styles.strip}>
          <div className={styles.stripInner}>
            <span className={styles.stripLabel}>Works with</span>
            <div className={styles.stripVendors}>
              {ALL_VENDORS.map((v, i) => (
                <span key={v} className={styles.stripName} style={{ opacity: i > 9 ? 0.4 : 1 }}>{v}</span>
              ))}
              <span className={styles.stripMore}>+ many more</span>
            </div>
          </div>
        </div>
        <PainSection />
      </main>
      <Footer />
    </>
  )
}
