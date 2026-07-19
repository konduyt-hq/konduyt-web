import Nav from '../components/Nav'
import VendorCycler from '../components/hero/VendorCycler'
import PainSection from '../components/PainSection'
import UniverseSection from '../components/UniverseSection'
import Footer from '../components/Footer'
import styles from './page.module.css'

const ALL_VENDORS = [
  'Stripe','PayPal','M-Pesa','Flutterwave','Razorpay','GrabPay','PIX',
  'Paystack','UPI','iDEAL','SEPA','Alipay','WeChat Pay','MTN Money',
  'Airtel Money','Orange Money','Paytm','PhonePe','Venmo','Cash App',
]

const Mark = () => (
  <div className={styles.glow}>
    <svg width="200" height="248" viewBox="0 0 100 124" fill="none" aria-hidden="true">
      <path d="M10 8 Q50 52 50 96"  stroke="#FF5C35" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M28 4 Q50 48 50 96"  stroke="#FF5C35" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M50 2 Q50 48 50 96"  stroke="#FF5C35" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M72 4 Q50 48 50 96"  stroke="#FF5C35" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M90 8 Q50 52 50 96"  stroke="#FF5C35" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="50" y1="96" x2="50" y2="122" stroke="#FF5C35" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  </div>
)

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main">

        <section className={styles.hero} aria-labelledby="hero-heading">

          {/* Left — glowing convergence mark */}
          <div className={styles.heroLeft}>
            <Mark />
          </div>

          {/* Right — E2B-style small uppercase lines */}
          <div className={styles.heroRight} id="hero-heading">

            <div className={styles.prelabel}>PAYMENT INFRASTRUCTURE</div>

            <div className={styles.block}>
              <div className={styles.line}>EACH ONE. A DIFFERENT</div>
              <div className={styles.line}><VendorCycler /> HEADACHE.</div>
            </div>

            <div className={styles.block}>
              <div className={styles.line}>ONE INTEGRATION.</div>
              <div className={styles.line}>EVERY PROVIDER.</div>
            </div>

            <div className={styles.block}>
              <div className={styles.line}>TAXES HANDLED.</div>
              <div className={styles.line}>AUTOMATICALLY.</div>
            </div>

          </div>
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
