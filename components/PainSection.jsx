'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import styles from './PainSection.module.css'

export default function PainSection() {
  const linesRef = useRef([])

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      linesRef.current.forEach(el => el?.classList.add(styles.show))
      return
    }

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = linesRef.current.indexOf(entry.target)
            setTimeout(() => entry.target.classList.add(styles.show), idx * 200)
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.3 }
    )

    linesRef.current.forEach(el => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section className={styles.section} aria-labelledby="pain-heading">
      <h2 className={styles.heading} id="pain-heading">
        <span className={styles.line} ref={el => linesRef.current[0] = el}>
          Stripe has its own API.
        </span>
        <span className={styles.line} ref={el => linesRef.current[1] = el}>
          PayPal has its own API.
        </span>
        <span className={styles.line} ref={el => linesRef.current[2] = el}>
          M-Pesa has its own API.
        </span>
        <span className={styles.accent}>Konduyt has one.</span>
      </h2>

      <p className={styles.note}>Free forever in your home country.</p>
      <Link href="/signup" className={styles.link}>
        Start building for free →
      </Link>
    </section>
  )
}
