'use client'
import { useState } from 'react'
import styles from './IntegrationTab.module.css'

const VENDORS = [
  { id: 'stripe',      name: 'Stripe',      region: 'Global cards',    logo: 'https://logo.clearbit.com/stripe.com',      fields: [{ key: 'secret_key', label: 'Secret Key', link: 'https://dashboard.stripe.com/apikeys', placeholder: 'sk_live_...' }] },
  { id: 'paypal',      name: 'PayPal',       region: 'Global',          logo: 'https://logo.clearbit.com/paypal.com',       fields: [{ key: 'client_id', label: 'Client ID', link: 'https://developer.paypal.com/dashboard/', placeholder: 'AYj...' }, { key: 'client_secret', label: 'Client Secret', link: 'https://developer.paypal.com/dashboard/', placeholder: '••••••••' }] },
  { id: 'mpesa',       name: 'M-Pesa',       region: 'East Africa',     logo: 'https://logo.clearbit.com/safaricom.co.ke',  fields: [{ key: 'consumer_key', label: 'Consumer Key', link: 'https://developer.safaricom.co.ke/', placeholder: 'xxxx' }, { key: 'consumer_secret', label: 'Consumer Secret', link: 'https://developer.safaricom.co.ke/', placeholder: 'xxxx' }, { key: 'shortcode', label: 'Shortcode', link: 'https://developer.safaricom.co.ke/', placeholder: '174379' }, { key: 'passkey', label: 'Passkey', link: 'https://developer.safaricom.co.ke/', placeholder: 'xxxx' }] },
  { id: 'flutterwave', name: 'Flutterwave', region: 'Africa',           logo: 'https://logo.clearbit.com/flutterwave.com',  fields: [{ key: 'secret_key', label: 'Secret Key', link: 'https://dashboard.flutterwave.com/dashboard/settings/apis', placeholder: 'FLWSECK-...' }] },
  { id: 'razorpay',    name: 'Razorpay',    region: 'India',            logo: 'https://logo.clearbit.com/razorpay.com',     fields: [{ key: 'key_id', label: 'Key ID', link: 'https://dashboard.razorpay.com/app/keys', placeholder: 'rzp_live_...' }, { key: 'key_secret', label: 'Key Secret', link: 'https://dashboard.razorpay.com/app/keys', placeholder: '••••••••' }] },
  { id: 'grabpay',     name: 'GrabPay',     region: 'Southeast Asia',   logo: 'https://logo.clearbit.com/grab.com',         fields: [{ key: 'partner_id', label: 'Partner ID', link: 'https://developer.grab.com/', placeholder: 'partner-...' }, { key: 'partner_secret', label: 'Partner Secret', link: 'https://developer.grab.com/', placeholder: '••••••••' }] },
  { id: 'pix',         name: 'PIX',         region: 'Brazil',           logo: null,                                          fields: [{ key: 'client_id', label: 'Client ID', link: 'https://developers.gerencianet.com.br/', placeholder: 'xxxx' }, { key: 'client_secret', label: 'Client Secret', link: 'https://developers.gerencianet.com.br/', placeholder: '••••••••' }] },
]

const JURISDICTIONS = [
  { code: 'KE', name: 'Kenya',         flag: '🇰🇪', free: true  },
  { code: 'NG', name: 'Nigeria',       flag: '🇳🇬', free: false },
  { code: 'GH', name: 'Ghana',         flag: '🇬🇭', free: false },
  { code: 'ZA', name: 'South Africa',  flag: '🇿🇦', free: false },
  { code: 'IN', name: 'India',         flag: '🇮🇳', free: false },
  { code: 'BR', name: 'Brazil',        flag: '🇧🇷', free: false },
  { code: 'SG', name: 'Singapore',     flag: '🇸🇬', free: false },
  { code: 'US', name: 'United States', flag: '🇺🇸', free: false },
  { code: 'GB', name: 'United Kingdom',flag: '🇬🇧', free: false },
  { code: 'DE', name: 'Germany',       flag: '🇩🇪', free: false },
]

export default function IntegrationTab({ projectId }) {
  const [pubKey]          = useState('pk_test_4f6e247a9c3b2d8e1f...')
  const [secKey]          = useState('sk_test_••••••••••••••••••••')
  const [secRevealed, setSecRevealed] = useState(false)
  const [copied, setCopied]           = useState('')
  const [connectedVendors, setConnected] = useState({})
  const [activeModal, setActiveModal] = useState(null)
  const [vendorForm, setVendorForm]   = useState({})
  const [jurisdiction, setJurisdiction] = useState('KE')
  const [webhooks, setWebhooks]       = useState({ success: '', failed: '', refunded: '' })
  const [connectingId, setConnectingId] = useState(null)

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  async function connectVendor(vendor) {
    setConnectingId(vendor.id)
    try {
      await fetch(`/api/vendors/${projectId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor: vendor.id, credentials: vendorForm }),
      })
      setConnected(prev => ({ ...prev, [vendor.id]: { status: 'operational', credentials: vendorForm } }))
    } catch {}
    setConnectingId(null)
    setActiveModal(null)
    setVendorForm({})
  }

  const modal = VENDORS.find(v => v.id === activeModal)

  return (
    <div className={styles.wrap}>

      {/* ── STEP 1: API Keys ── */}
      <section className={styles.step}>
        <h2 className={styles.stepTitle}>Step 1 — API Keys</h2>
        <p className={styles.stepSub}>Add these to your project. Keep the secret key on your server only.</p>

        <div className={styles.keyCard}>
          <div className={styles.keyRow}>
            <div>
              <div className={styles.keyLabel}>Publishable key — safe for frontend</div>
              <div className={styles.keyVal}>{pubKey}</div>
            </div>
            <button className={styles.copyBtn} onClick={() => copy(pubKey, 'pub')}>
              {copied === 'pub' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className={styles.divider} />
          <div className={styles.keyRow}>
            <div>
              <div className={styles.keyLabel}>Secret key — server only, never expose</div>
              <div className={styles.keyVal}>
                {secRevealed ? 'sk_test_abc123xyz...' : secKey}
              </div>
            </div>
            <div className={styles.keyActions}>
              <button className={styles.copyBtn} onClick={() => setSecRevealed(r => !r)}>
                {secRevealed ? 'Hide' : 'Reveal'}
              </button>
              {secRevealed && (
                <button className={styles.copyBtn} onClick={() => copy('sk_test_abc123xyz...', 'sec')}>
                  {copied === 'sec' ? '✓ Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── STEP 2: Install SDK ── */}
      <section className={styles.step}>
        <h2 className={styles.stepTitle}>Step 2 — Install the SDK</h2>
        <p className={styles.stepSub}>Choose your language and add Konduyt to your project.</p>
        <SDKSnippets />
      </section>

      {/* ── STEP 3: Vendors ── */}
      <section className={styles.step}>
        <h2 className={styles.stepTitle}>Step 3 — Connect your vendors</h2>
        <p className={styles.stepSub}>Select which payment methods you want to accept. You bring your own keys.</p>

        <div className={styles.vendorGrid}>
          {VENDORS.map(v => {
            const conn = connectedVendors[v.id]
            return (
              <div key={v.id} className={`${styles.vendorCard} ${conn ? styles.vendorConnected : ''}`}>
                <div className={styles.vendorLeft}>
                  <div className={styles.vendorLogo}>
                    {v.logo
                      ? <img src={v.logo} alt={v.name} width={24} height={24} />
                      : <span className={styles.vendorInitial}>{v.name[0]}</span>}
                  </div>
                  <div>
                    <div className={styles.vendorName}>{v.name}</div>
                    <div className={styles.vendorRegion}>{v.region}</div>
                  </div>
                </div>
                <div className={styles.vendorRight}>
                  {conn
                    ? <span className={styles.connected}>● Connected</span>
                    : <button className={styles.connectBtn} onClick={() => { setActiveModal(v.id); setVendorForm({}) }}>Connect</button>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── STEP 4: Jurisdiction ── */}
      <section className={styles.step}>
        <h2 className={styles.stepTitle}>Step 4 — Set your jurisdiction</h2>
        <p className={styles.stepSub}>
          Tax is calculated and tracked for your home country automatically.
          Expand to more countries anytime by upgrading to Global.
        </p>

        <div className={styles.jurisdictionGrid}>
          {JURISDICTIONS.map(j => (
            <button
              key={j.code}
              className={`${styles.jBtn} ${jurisdiction === j.code ? styles.jActive : ''} ${!j.free ? styles.jPro : ''}`}
              onClick={() => j.free && setJurisdiction(j.code)}
              title={!j.free ? 'Upgrade to Global to unlock' : undefined}
            >
              <span>{j.flag}</span>
              <span>{j.name}</span>
              {!j.free && <span className={styles.proBadge}>Global</span>}
            </button>
          ))}
        </div>

        <p className={styles.taxNote}>
          Tax calculation active for <strong>{JURISDICTIONS.find(j => j.code === jurisdiction)?.flag} {JURISDICTIONS.find(j => j.code === jurisdiction)?.name}</strong>.
          {' '}<a href="/pricing" className={styles.upgradeLink}>Add more countries →</a>
        </p>
      </section>

      {/* ── STEP 5: Webhooks ── */}
      <section className={styles.step}>
        <h2 className={styles.stepTitle}>Step 5 — Configure webhooks</h2>
        <p className={styles.stepSub}>Add these event handlers to your codebase. Konduyt calls them automatically.</p>
        <WebhookSnippets />
      </section>

      {/* ── STEP 6: Go live ── */}
      <section className={`${styles.step} ${styles.goLiveSection}`}>
        <h2 className={styles.stepTitle}>Step 6 — Go live</h2>
        <p className={styles.stepSub}>
          Sandbox is active. You're processing test transactions. When you're ready, verify your identity to go live.
        </p>
        <button className={styles.goLiveBtn}>
          Verify identity and go live →
        </button>
        <p className={styles.goLiveNote}>
          We'll ask for your government ID. Takes under 5 minutes.
          Your sandbox stays active during review.
        </p>
      </section>

      {/* ── API Reference (below steps) ── */}
      <section className={styles.step}>
        <h2 className={styles.stepTitle}>Reference</h2>
        <div className={styles.refGrid}>
          <a href="/docs/api" className={styles.refCard}>
            <div className={styles.refTitle}>API Reference</div>
            <div className={styles.refSub}>Every endpoint and parameter</div>
          </a>
          <a href="/docs/webhooks" className={styles.refCard}>
            <div className={styles.refTitle}>Webhook Events</div>
            <div className={styles.refSub}>Full list of events Konduyt fires</div>
          </a>
          <a href="/docs/errors" className={styles.refCard}>
            <div className={styles.refTitle}>Error Codes</div>
            <div className={styles.refSub}>What each code means</div>
          </a>
          <a href="/docs/vendors" className={styles.refCard}>
            <div className={styles.refTitle}>Vendor Guides</div>
            <div className={styles.refSub}>Stripe, M-Pesa, PayPal and more</div>
          </a>
        </div>
      </section>

      {/* ── Vendor connect modal ── */}
      {modal && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Connect {modal.name}</h3>
              <button className={styles.modalClose} onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              {modal.fields.map(field => (
                <div key={field.key} className={styles.modalField}>
                  <div className={styles.modalLabelRow}>
                    <label htmlFor={field.key}>{field.label}</label>
                    <a href={field.link} target="_blank" rel="noopener noreferrer" className={styles.whereLink}>
                      Where to find this →
                    </a>
                  </div>
                  <input
                    id={field.key}
                    type={field.key.includes('secret') || field.key.includes('passkey') ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={vendorForm[field.key] || ''}
                    onChange={e => setVendorForm(f => ({ ...f, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.modalCancel} onClick={() => setActiveModal(null)}>Cancel</button>
              <button
                className={styles.modalConnect}
                onClick={() => connectVendor(modal)}
                disabled={connectingId === modal.id}
              >
                {connectingId === modal.id ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

/* SDK code snippets per language */
function SDKSnippets() {
  const [lang, setLang] = useState('js')
  const snippets = {
    js:   `<script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>\n\nconst konduyt = new Konduyt({\n  publishableKey: 'pk_live_...'\n})\n\nkonduyt.checkout({\n  amount: 2000,\n  currency: 'KES',\n  theme: { color: '#FF5C35', buttonText: 'Pay now' }\n})`,
    py:   `pip install konduyt\n\nfrom konduyt import Konduyt\n\nkd = Konduyt(secret_key='sk_live_...')\nresult = kd.charge(amount=2000, currency='KES', vendor='mpesa')\nprint(result.status)`,
    php:  `composer require konduyt/sdk\n\n$konduyt = new Konduyt\\Client([\n  'secret_key' => 'sk_live_...'\n]);\n$result = $konduyt->charge([\n  'amount' => 2000, 'currency' => 'KES'\n]);`,
    kotlin: `implementation 'dev.konduyt:sdk:1.0.0'\n\nval kd = Konduyt(publishableKey = "pk_live_...")\nkd.checkout(amount = 2000, currency = "KES") { result ->\n  println(result.status)\n}`,
    dart: `konduyt: ^1.0.0  # pubspec.yaml\n\nfinal kd = Konduyt(publishableKey: 'pk_live_...');\nfinal result = await kd.charge(\n  amount: 2000, currency: 'KES'\n);\nprint(result.status);`,
  }
  return (
    <div className={styles.codeCard}>
      <div className={styles.langTabs}>
        {Object.keys(snippets).map(l => (
          <button key={l} className={`${styles.langTab} ${lang === l ? styles.langActive : ''}`} onClick={() => setLang(l)}>
            {{ js: 'JavaScript', py: 'Python', php: 'PHP', kotlin: 'Kotlin', dart: 'Dart' }[l]}
          </button>
        ))}
      </div>
      <pre className={styles.code}><code>{snippets[lang]}</code></pre>
    </div>
  )
}

/* Webhook code snippets */
function WebhookSnippets() {
  const [lang, setLang] = useState('js')
  const snippets = {
    js: `konduyt.on('payment.success', (txn) => {\n  // save to your database\n  db.save(txn)\n  res.redirect('/success')\n})\n\nkonduyt.on('payment.failed', (txn) => {\n  // tell user to try again\n  res.status(400).json({ error: txn.error.message })\n})\n\nkonduyt.on('payment.refunded', (txn) => {\n  db.updateRefund(txn)\n})`,
    py: `@konduyt.on('payment.success')\ndef on_success(txn):\n    db.save(txn)\n    return redirect('/success')\n\n@konduyt.on('payment.failed')\ndef on_failed(txn):\n    return jsonify(error=txn['error']['message']), 400\n\n@konduyt.on('payment.refunded')\ndef on_refunded(txn):\n    db.update_refund(txn)`,
    php: `$konduyt->on('payment.success', function($txn) {\n  $db->save($txn);\n  header('Location: /success');\n});\n\n$konduyt->on('payment.failed', function($txn) {\n  http_response_code(400);\n  echo json_encode(['error' => $txn['error']['message']]);\n});`,
  }
  return (
    <div className={styles.codeCard}>
      <div className={styles.langTabs}>
        {Object.keys(snippets).map(l => (
          <button key={l} className={`${styles.langTab} ${lang === l ? styles.langActive : ''}`} onClick={() => setLang(l)}>
            {{ js: 'JavaScript', py: 'Python', php: 'PHP' }[l]}
          </button>
        ))}
      </div>
      <pre className={styles.code}><code>{snippets[lang]}</code></pre>
    </div>
  )
}
