'use client'
import { useState, useEffect } from 'react'
import styles from './TransactionsTab.module.css'

const STATUS_COLOR = { success: 'green', failed: 'red', refunded: 'amber' }

export default function TransactionsTab({ projectId }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeVendor, setActiveVendor] = useState(null) // null = overview

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('token')
        const res   = await fetch(`/api/transactions/${projectId}/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setData(await res.json())
      } catch {
        // show empty state
        setData({ vendors: [], tax_summary: [] })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  if (loading) return <div className={styles.loading}>Loading transactions…</div>

  // Empty sandbox state
  if (!data?.vendors?.length) return <EmptyState />

  if (activeVendor) {
    const vendor = data.vendors.find(v => v.id === activeVendor)
    return (
      <div className={styles.wrap}>
        <button className={styles.back} onClick={() => setActiveVendor(null)}>
          ← Back to overview
        </button>
        <h2 className={styles.vendorHeading}>{vendor?.name} transactions</h2>
        <TransactionTable rows={vendor?.transactions || []} />
      </div>
    )
  }

  return (
    <div className={styles.wrap}>

      {/* Vendor cards */}
      {data.vendors.map(v => (
        <div key={v.id} className={styles.vendorCard}>
          <div className={styles.vendorTop}>
            <div className={styles.vendorLeft}>
              <div className={styles.vendorName}>{v.name}</div>
              <div className={`${styles.statusDot} ${styles[v.status]}`}>
                ● {v.status}
              </div>
            </div>
            <button className={styles.viewAll} onClick={() => setActiveVendor(v.id)}>
              View all →
            </button>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statVal}>{v.currency} {v.total_processed.toLocaleString()}</div>
              <div className={styles.statLabel}>Total processed</div>
            </div>
            <div className={styles.stat}>
              <div className={`${styles.statVal} ${styles.green}`}>{v.successful}</div>
              <div className={styles.statLabel}>Successful</div>
            </div>
            <div className={styles.stat}>
              <div className={`${styles.statVal} ${styles.red}`}>{v.failed}</div>
              <div className={styles.statLabel}>Failed</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statVal}>{v.currency} {v.tax_owed.toLocaleString()}</div>
              <div className={styles.statLabel}>Tax owed</div>
            </div>
          </div>
        </div>
      ))}

      {/* Tax summary */}
      {data.tax_summary?.length > 0 && (
        <div className={styles.taxSection}>
          <h3 className={styles.taxTitle}>Tax Summary</h3>
          {data.tax_summary.map(t => (
            <div key={t.jurisdiction} className={styles.taxRow}>
              <div className={styles.taxLeft}>
                <span>{t.flag}</span>
                <span>{t.country}</span>
                <span className={styles.taxRate}>·  {t.tax_type} {t.rate}%</span>
              </div>
              <div className={styles.taxRight}>
                <span className={styles.taxOwed}>{t.currency} {t.amount_owed.toLocaleString()} owed</span>
                <a href={t.portal} target="_blank" rel="noopener noreferrer" className={styles.howToPay}>
                  How to pay →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

function TransactionTable({ rows }) {
  return (
    <div className={styles.table}>
      <div className={styles.tableHead}>
        <span>Date</span><span>Amount</span><span>Status</span><span>Tax</span><span>Customer</span>
      </div>
      {rows.map(r => (
        <div key={r.id} className={styles.tableRow}>
          <span>{new Date(r.created_at).toLocaleDateString()}</span>
          <span>{r.currency} {r.amount.toLocaleString()}</span>
          <span className={styles[r.status]}>
            <span className={styles.statusDot}>●</span> {r.status}
          </span>
          <span>{r.tax_owed > 0 ? `${r.currency} ${r.tax_owed}` : '—'}</span>
          <span className={styles.customer}>{r.customer_email || r.customer_phone}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>↑</div>
      <h3>No transactions yet</h3>
      <p>Complete your integration and make your first test transaction in sandbox mode.</p>
    </div>
  )
}
