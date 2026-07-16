'use client'
import { useState, useEffect } from 'react'
import styles from './RotatingPill.module.css'

const VENDORS = [
  { name: 'Stripe',       color: '#635BFF', bg: 'rgba(99,91,255,0.14)',   regions: ['US','GB','CA','AU','DE','FR','NL','SE'] },
  { name: 'PayPal',       color: '#009CDE', bg: 'rgba(0,156,222,0.14)',   regions: ['US','GB','CA','AU','DE','FR'] },
  { name: 'M-Pesa',       color: '#00A550', bg: 'rgba(0,165,80,0.14)',    regions: ['KE','TZ','UG','RW','MZ','EG'] },
  { name: 'Flutterwave',  color: '#F5A623', bg: 'rgba(245,166,35,0.14)',  regions: ['NG','GH','KE','ZA','ET','CM'] },
  { name: 'Razorpay',     color: '#2D9EE0', bg: 'rgba(45,158,224,0.14)', regions: ['IN'] },
  { name: 'GrabPay',      color: '#00B14F', bg: 'rgba(0,177,79,0.14)',    regions: ['SG','MY','PH','TH','ID','VN'] },
  { name: 'PIX',          color: '#32BCAD', bg: 'rgba(50,188,173,0.14)',  regions: ['BR'] },
  { name: 'Paystack',     color: '#0BA4DB', bg: 'rgba(11,164,219,0.14)',  regions: ['NG','GH','ZA','KE','EG'] },
]

const REGION_ORDER = {
  KE:'M-Pesa', TZ:'M-Pesa', UG:'M-Pesa', RW:'M-Pesa',
  NG:'Flutterwave', GH:'Paystack', ZA:'Flutterwave', ET:'Flutterwave',
  IN:'Razorpay',
  SG:'GrabPay', MY:'GrabPay', PH:'GrabPay', TH:'GrabPay', ID:'GrabPay', VN:'GrabPay',
  BR:'PIX',
}

function reorder(vendors, country) {
  if (!country || !REGION_ORDER[country]) return vendors
  const local = vendors.find(v => v.name === REGION_ORDER[country])
  if (!local) return vendors
  return [local, ...vendors.filter(v => v.name !== local.name)]
}

export default function RotatingPill() {
  const [vendors, setVendors] = useState(VENDORS)
  const [idx, setIdx]         = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(d => { if (d.country_code) setVendors(reorder(VENDORS, d.country_code)) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % vendors.length); setVisible(true) }, 300)
    }, 2200)
    return () => clearInterval(id)
  }, [vendors.length])

  const v = vendors[idx]

  return (
    <span className={styles.pill} style={{ background: v.bg, transition: 'background 0.4s ease' }}>
      <span className={styles.dot} style={{ background: v.color }} aria-hidden="true" />
      <span className={styles.word} style={{ opacity: visible ? 1 : 0, color: v.color }}
        aria-live="polite">{v.name}</span>
    </span>
  )
}
