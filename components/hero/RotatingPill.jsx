'use client'
import { useState, useEffect } from 'react'
import styles from './RotatingPill.module.css'

const VENDORS = [
  { name: 'Stripe',      color: '#635BFF', bg: 'rgba(99,91,255,0.18)',   regions: ['US','GB','CA','AU','DE'] },
  { name: 'PayPal',      color: '#009CDE', bg: 'rgba(0,156,222,0.18)',   regions: ['US','GB','CA','AU'] },
  { name: 'M-Pesa',      color: '#00A550', bg: 'rgba(0,165,80,0.18)',    regions: ['KE','TZ','UG','RW'] },
  { name: 'Flutterwave', color: '#F5A623', bg: 'rgba(245,166,35,0.18)',  regions: ['NG','GH','KE','ZA'] },
  { name: 'Razorpay',    color: '#2D9EE0', bg: 'rgba(45,158,224,0.18)',  regions: ['IN'] },
  { name: 'GrabPay',     color: '#00B14F', bg: 'rgba(0,177,79,0.18)',    regions: ['SG','MY','PH','TH'] },
  { name: 'PIX',         color: '#32BCAD', bg: 'rgba(50,188,173,0.18)',  regions: ['BR'] },
  { name: 'Paystack',    color: '#0BA4DB', bg: 'rgba(11,164,219,0.18)',  regions: ['NG','GH','ZA'] },
]

const REGION_MAP = { KE:'M-Pesa',TZ:'M-Pesa',UG:'M-Pesa',RW:'M-Pesa',NG:'Flutterwave',GH:'Paystack',ZA:'Flutterwave',IN:'Razorpay',SG:'GrabPay',MY:'GrabPay',PH:'GrabPay',TH:'GrabPay',BR:'PIX' }

export default function RotatingPill() {
  const [vendors, setVendors] = useState(VENDORS)
  const [idx, setIdx]         = useState(0)
  const [show, setShow]       = useState(true)

  useEffect(() => {
    fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(d => {
        const top = REGION_MAP[d.country_code]
        if (top) {
          const v = VENDORS.find(x => x.name === top)
          if (v) setVendors([v, ...VENDORS.filter(x => x.name !== top)])
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false)
      setTimeout(() => { setIdx(i => (i + 1) % vendors.length); setShow(true) }, 280)
    }, 2200)
    return () => clearInterval(id)
  }, [vendors.length])

  const v = vendors[idx]

  return (
    <span
      className={styles.pill}
      style={{ background: v.bg, border: `1.5px solid ${v.color}60` }}
      aria-live="polite"
      aria-label={v.name}
    >
      <span className={styles.dot} style={{ background: v.color }} aria-hidden="true" />
      <span className={styles.word} style={{ opacity: show ? 1 : 0 }}>{v.name}</span>
    </span>
  )
}
