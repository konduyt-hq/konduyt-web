'use client'
import { useState, useEffect } from 'react'

const VENDORS = ['STRIPE','M-PESA','PAYPAL','FLUTTERWAVE','RAZORPAY','GRABPAY','PIX','PAYSTACK']

export default function VendorCycler() {
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false)
      setTimeout(() => { setIdx(i => (i + 1) % VENDORS.length); setShow(true) }, 250)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <span style={{
      color: '#FF5C35',
      opacity: show ? 1 : 0,
      transition: 'opacity 0.25s ease',
      display: 'inline-block',
      minWidth: '120px',
    }}>
      {VENDORS[idx]}
    </span>
  )
}
