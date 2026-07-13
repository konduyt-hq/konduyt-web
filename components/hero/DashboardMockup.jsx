import styles from './DashboardMockup.module.css'

export default function DashboardMockup() {
  return (
    <div className={styles.mockup} role="img" aria-label="Konduyt dashboard preview">

      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.logo}>
          KONDU<span className={styles.accent}>Y</span>T
        </div>
        <div className={styles.topRight}>
          <span className={styles.sandboxBadge}>Sandbox</span>
          <div className={styles.avatar}>IK</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <span className={`${styles.tab} ${styles.active}`}>Integration</span>
        <span className={styles.tab}>Transactions</span>
        <span className={styles.tab}>Settings</span>
      </div>

      {/* Body */}
      <div className={styles.body}>

        {/* API Keys */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>API Keys</div>
          <div className={styles.card}>
            <div className={styles.keyLabel}>Publishable key — safe for frontend</div>
            <div className={styles.keyRow}>
              <span className={styles.keyVal}>pk_test_4f6e247a9c...</span>
              <span className={styles.copyBtn}>Copy</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.keyLabel}>Secret key — server only</div>
            <div className={styles.keyRow}>
              <span className={styles.keyVal}>sk_test_••••••••••</span>
              <span className={styles.copyBtn}>Reveal</span>
            </div>
          </div>
        </div>

        {/* Vendors */}
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Connected Vendors</div>
          <div className={styles.card}>
            <div className={styles.vendorRow}>
              <span className={styles.vendorName}>
                <span className={styles.dotGreen}>●</span> Stripe
              </span>
              <span className={`${styles.status} ${styles.active}`}>Operational</span>
            </div>
            <div className={styles.vendorRow}>
              <span className={styles.vendorName}>
                <span className={styles.dotGreen}>●</span> M-Pesa
              </span>
              <span className={`${styles.status} ${styles.active}`}>Operational</span>
            </div>
            <div className={styles.vendorRow}>
              <span className={styles.vendorName}>
                <span className={styles.dotMuted}>●</span> Flutterwave
              </span>
              <span className={`${styles.status} ${styles.off}`}>Not connected</span>
            </div>
          </div>
        </div>

        {/* Tax */}
        <div className={styles.taxRow}>
          <span className={styles.taxLabel}>🇰🇪 Kenya · VAT 16%</span>
          <span className={styles.taxAmount}>KES 0 · Go live to track</span>
        </div>

        {/* Go live button */}
        <button className={styles.goLive}>
          Verify identity and go live →
        </button>

      </div>
    </div>
  )
}
