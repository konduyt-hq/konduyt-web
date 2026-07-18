'use client'
import { useState, useEffect } from 'react'
import styles from './RotatingPill.module.css'

const VENDORS = [
  { name: 'Stripe',      color: '#635BFF', bg: 'rgba(99,91,255,0.18)',   langs: ['en-US','en-CA','en-GB','en-AU','de','fr','nl','sv'] },
  { name: 'PayPal',      color: '#009CDE', bg: 'rgba(0,156,222,0.18)',   langs: ['en-US','en-CA','en-GB','de','fr'] },
  { name: 'M-Pesa',      color: '#00A550', bg: 'rgba(0,165,80,0.18)',    langs: ['sw','sw-KE','sw-TZ','en-KE','en-TZ','en-UG'] },
  { name: 'Flutterwave', color: '#F5A623', bg: 'rgba(245,166,35,0.18)',  langs: ['en-NG','yo','ig','ha','en-GH'] },
  { name: 'Razorpay',    color: '#2D9EE0', bg: 'rgba(45,158,224,0.18)',  langs: ['hi','en-IN','ta','te','mr','gu','kn','ml'] },
  { name: 'GrabPay',     color: '#00B14F', bg: 'rgba(0,177,79,0.18)',    langs: ['ms','en-SG','en-MY','tl','th','id','vi'] },
  { name: 'PIX',         color: '#32BCAD', bg: 'rgba(50,188,173,0.18)',  langs: ['pt','pt-BR'] },
  { name: 'Paystack',    color: '#0BA4DB', bg: 'rgba(11,164,219,0.18)',  langs: ['en-NG','en-GH','en-ZA'] },
]

const DEFAULT_ORDER = ['Stripe','PayPal','M-Pesa','Flutterwave','Razorpay','GrabPay','PIX','Paystack']

function getLocalVendor() {
  try {
    const lang = navigator.language || navigator.languages?.[0] || 'en'
    for (const v of VENDORS) {
      if (v.langs.some(l => lang.startsWith(l) || l.startsWith(lang))) return v.name
    }
  } catch {}
  return null
}

export default function RotatingPill() {
  const [vendors, setVendors] = useState(VENDORS)
  const [idx, setIdx]         = useState(0)
  const [show, setShow]       = useState(true)

  useEffect(() => {
    // Use navigator.language — no API call, no CORS issues, works offline
    const localName = getLocalVendor()
    if (localName) {
      const local = VENDORS.find(v => v.name === localName)
      if (local) setVendors([local, ...VENDORS.filter(v => v.name !== localName)])
    }
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
      style={{ background: v.bg, border: '1.5px solid ' + v.color + '50' }}
      aria-live="polite"
      aria-label={v.name}
    >
      <span className={styles.dot} style={{ background: v.color }} aria-hidden="true" />
      <span className={styles.word} style={{ opacity: show ? 1 : 0 }}>{v.name}</span>
    </span>
  )
}
