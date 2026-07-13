'use client'
import { useState, useEffect } from 'react'
import styles from './RotatingPill.module.css'

const WORDS = ['Stripe', 'PayPal', 'M-Pesa', 'Flutterwave', 'Razorpay', 'GrabPay', 'PIX']

export default function RotatingPill() {
  const [idx, setIdx]       = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % WORDS.length)
        setVisible(true)
      }, 300)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={styles.pill} aria-label="Payment provider" role="text">
      <span className={styles.dot} aria-hidden="true" />
      <span
        className={styles.word}
        style={{ opacity: visible ? 1 : 0 }}
        aria-live="polite"
      >
        {WORDS[idx]}
      </span>
    </span>
  )
}
