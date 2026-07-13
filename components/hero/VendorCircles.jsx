import Image from 'next/image'
import styles from './VendorCircles.module.css'

const VENDORS = [
  { name: 'Stripe',      url: 'https://logo.clearbit.com/stripe.com',       fb: 'S',   color: '#635BFF' },
  { name: 'PayPal',      url: 'https://logo.clearbit.com/paypal.com',        fb: 'PP',  color: '#003087' },
  { name: 'M-Pesa',      url: 'https://logo.clearbit.com/safaricom.co.ke',   fb: 'M',   color: '#00A550' },
  { name: 'Flutterwave', url: 'https://logo.clearbit.com/flutterwave.com',   fb: 'F',   color: '#F5A623' },
  { name: 'Razorpay',    url: 'https://logo.clearbit.com/razorpay.com',      fb: 'R',   color: '#2D9EE0' },
  { name: 'GrabPay',     url: 'https://logo.clearbit.com/grab.com',          fb: 'G',   color: '#00B14F' },
  { name: 'PIX',         url: null,                                           fb: 'PIX', color: '#32BCAD' },
]

export default function VendorCircles() {
  return (
    <div className={styles.row} role="list" aria-label="Supported payment providers">
      {VENDORS.map(v => (
        <div key={v.name} className={styles.circle} role="listitem" title={v.name}>
          {v.url ? (
            <img
              src={v.url}
              alt={v.name}
              width={22}
              height={22}
              className={styles.logo}
              onError={e => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <span
            className={styles.fallback}
            style={{
              background: v.color,
              display: v.url ? 'none' : 'flex',
            }}
          >
            {v.fb}
          </span>
        </div>
      ))}

      <div
        className={styles.circle}
        role="listitem"
        aria-label="And many more"
        title="And many more"
      >
        <span className={styles.more}>+</span>
      </div>

      <span className={styles.label}>and many others</span>
    </div>
  )
}
