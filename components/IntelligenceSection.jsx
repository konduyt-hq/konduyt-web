import styles from './IntelligenceSection.module.css'

const SIGNALS = [
  { label: 'Success rate',     value: '99.2%',  sub: 'M-Pesa · KES today',     color: '#22C55E' },
  { label: 'Avg settlement',   value: '8s',     sub: 'M-Pesa · East Africa',    color: '#0BA4DB' },
  { label: 'Fee saved',        value: '2.1%',   sub: 'vs. direct Stripe',       color: '#F59E0B' },
  { label: 'Providers monitored', value: '8+',  sub: 'Live health checks',      color: '#FF5C35' },
]

const ROUTING = [
  { provider: 'M-Pesa',      note: 'Fastest today',       pct: 92, color: '#00A550' },
  { provider: 'Stripe',      note: 'Lowest fee',           pct: 71, color: '#635BFF' },
  { provider: 'Paystack',    note: 'High success rate',    pct: 88, color: '#0BA4DB' },
  { provider: 'Flutterwave', note: 'Degraded — avoiding', pct: 34, color: '#F5A623', warn: true },
]

export default function IntelligenceSection() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>

        <div className={styles.left}>
          <div className={styles.eyebrow}>Payment Intelligence</div>
          <h2 className={styles.title}>The brain behind every transaction.</h2>
          <p className={styles.body}>
            Every transaction that passes through Konduyt teaches the engine something.
            Success rates. Settlement speed. Fee structures. Provider availability.
            Over millions of transactions, Konduyt builds an understanding of how
            money moves that no individual business could build alone.
          </p>
          <p className={styles.body}>
            When you make a payment, Konduyt already knows which provider is performing
            best for that currency, in that country, at that moment. You benefit from
            every transaction that came before yours.
          </p>
          <div className={styles.note}>
            Konduyt learns about provider performance — not about people or their money.
          </div>
        </div>

        <div className={styles.right}>

          {/* Live signals */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Live signals</div>
            <div className={styles.signals}>
              {SIGNALS.map(s => (
                <div key={s.label} className={styles.signal}>
                  <div className={styles.signalVal} style={{ color: s.color }}>{s.value}</div>
                  <div className={styles.signalLabel}>{s.label}</div>
                  <div className={styles.signalSub}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Routing example */}
          <div className={styles.card}>
            <div className={styles.cardLabel}>Routing intelligence — KES payment right now</div>
            <div className={styles.routing}>
              {ROUTING.map(r => (
                <div key={r.provider} className={styles.routeRow}>
                  <div className={styles.routeLeft}>
                    <span className={styles.routeDot} style={{ background: r.color }} />
                    <span className={styles.routeName} style={{ opacity: r.warn ? 0.45 : 1 }}>{r.provider}</span>
                    <span className={styles.routeNote} style={{ color: r.warn ? 'var(--red)' : 'var(--text-muted)' }}>{r.note}</span>
                  </div>
                  <div className={styles.routeBar}>
                    <div className={styles.routeFill} style={{ width: r.pct + '%', background: r.warn ? 'var(--red)' : r.color, opacity: r.warn ? 0.3 : 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
