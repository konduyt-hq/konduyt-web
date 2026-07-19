import styles from './PlatformDiagram.module.css'
import Link from 'next/link'

const AUDIENCES = [
  { id: 'build',   label: 'Developers', sub: 'KONDUYTbuild',   color: '#FF5C35', href: '/signup' },
  { id: 'creator', label: 'Creators',   sub: 'KONDUYTcreator', color: '#F59E0B', href: '/signup' },
  { id: 'payroll', label: 'Businesses', sub: 'KONDUYTpayroll', color: '#22C55E', href: '/signup' },
]

const PROVIDERS = ['Stripe','M-Pesa','PayPal','Flutterwave','Razorpay','GrabPay','PIX','Paystack']

export default function PlatformDiagram() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>

        <div className={styles.eyebrow}>How they connect</div>
        <h2 className={styles.title}>Different users. Same infrastructure.</h2>
        <p className={styles.sub}>
          Whether you are shipping a product, earning as a creator, or paying a team —
          the same payment intelligence layer powers every transaction.
        </p>

        <div className={styles.diagram}>

          {/* Top row — three audiences */}
          <div className={styles.topRow}>
            {AUDIENCES.map(a => (
              <div key={a.id} className={styles.audienceNode}>
                <div className={styles.audienceLabel} style={{ color: a.color }}>{a.label}</div>
                <div className={styles.audienceSub}>{a.sub}</div>
                <div className={styles.audienceLine} style={{ borderColor: a.color + '40' }} />
              </div>
            ))}
          </div>

          {/* Center engine */}
          <div className={styles.engine}>
            <div className={styles.engineGlow} />
            <div className={styles.engineContent}>
              <svg width="28" height="34" viewBox="0 0 28 34" fill="none" aria-hidden="true">
                <path d="M3 3 Q14 15 14 28" stroke="#FF5C35" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 1 Q14 14 14 28" stroke="#FF5C35" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 0 Q14 14 14 28" stroke="#FF5C35" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M19 1 Q14 14 14 28" stroke="#FF5C35" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M25 3 Q14 15 14 28" stroke="#FF5C35" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="28" x2="14" y2="33" stroke="#FF5C35" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div className={styles.engineName}>KONDUYT</div>
              <div className={styles.engineDesc}>Payment Intelligence Layer</div>
            </div>
          </div>

          {/* Provider line */}
          <div className={styles.providerLine} />

          {/* Bottom row — providers */}
          <div className={styles.providers}>
            {PROVIDERS.map(p => (
              <span key={p} className={styles.provider}>{p}</span>
            ))}
          </div>

        </div>

        <p className={styles.footnote}>
          One account. One integration. Every payment method, every audience.
        </p>

      </div>
    </section>
  )
}
