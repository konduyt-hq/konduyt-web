'use client'
import { useState } from 'react'
import Link from 'next/link'
import Nav from '../../components/Nav'

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'sdk',             label: 'SDK Guide' },
  { id: 'api-reference',   label: 'API Reference' },
  { id: 'connectors',      label: 'Connector Guide' },
  { id: 'webhooks',        label: 'Webhooks' },
  { id: 'errors',          label: 'Error Reference' },
  { id: 'changelog',       label: 'Changelog' },
]

function Code({ children, lang = 'bash' }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ position: 'relative', marginTop: '12px', marginBottom: '20px' }}>
      <pre style={{ background: '#0D1120', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#C8D4E8', overflowX: 'auto', lineHeight: 1.7, margin: 0 }}>
        <code>{children}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '11px', fontWeight: 600, color: copied ? '#22C55E' : 'rgba(237,240,247,0.4)', background: 'rgba(255,255,255,0.06)', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '48px' }}>
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '18px', color: '#EDF0F7', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Sub({ title, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#EDF0F7', marginBottom: '10px' }}>{title}</h3>
      {children}
    </div>
  )
}

function P({ children }) {
  return <p style={{ fontSize: '14px', color: 'rgba(237,240,247,0.65)', lineHeight: 1.75, marginBottom: '12px' }}>{children}</p>
}

function Badge({ children, color = '#FF5C35' }) {
  return <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: color + '18', color, fontFamily: 'monospace', marginRight: '6px' }}>{children}</span>
}

const ERRORS = [
  { code: 'invalid_key',          http: 401, type: 'auth',       cause: 'API key missing or malformed',      fix: 'Check key format: pk_... or sk_...' },
  { code: 'unauthorized',         http: 403, type: 'auth',       cause: 'Key does not have permission',      fix: 'Use a secret key for server operations' },
  { code: 'payment_failed',       http: 402, type: 'provider',   cause: 'Provider declined the payment',     fix: 'Check customer details. Do not retry immediately.' },
  { code: 'provider_unavailable', http: 503, type: 'provider',   cause: 'Provider API is down',              fix: 'Retryable. Konduyt will auto-retry with another provider.' },
  { code: 'provider_timeout',     http: 504, type: 'provider',   cause: 'Provider did not respond in time',  fix: 'Retryable. Use the same Idempotency-Key when retrying.' },
  { code: 'no_provider_connected',http: 400, type: 'config',     cause: 'No providers connected to project', fix: 'Go to Connections and connect a provider.' },
  { code: 'invalid_amount',       http: 400, type: 'validation', cause: 'Amount is zero, negative, or invalid', fix: 'Amount must be a positive number.' },
  { code: 'invalid_currency',     http: 400, type: 'validation', cause: 'Currency code not recognised',      fix: 'Use a valid ISO 4217 currency code (KES, USD, NGN).' },
  { code: 'not_found',            http: 404, type: 'resource',   cause: 'Resource does not exist',           fix: 'Verify the ID is correct and belongs to your project.' },
  { code: 'too_many_requests',    http: 429, type: 'rate_limit', cause: 'Too many requests',                 fix: 'Retryable. Back off and retry with exponential delay.' },
  { code: 'idempotency_conflict', http: 409, type: 'idempotency', cause: 'Same key, different payload',      fix: 'Generate a new Idempotency-Key for different operations.' },
  { code: 'internal_error',       http: 500, type: 'internal',   cause: 'Unexpected server error',           fix: 'Retryable. If persistent, contact support with request_id.' },
]

export default function DocsPage() {
  const [active, setActive] = useState('getting-started')

  return (
    <div style={{ minHeight: '100vh', background: '#07090F', fontFamily: 'Inter,sans-serif' }}>
      <Nav />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 32px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: '48px', alignItems: 'start' }}>

        {/* Sidebar */}
        <nav style={{ position: 'sticky', top: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(237,240,247,0.3)', marginBottom: '12px' }}>Documentation</div>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: '6px', border: 'none', background: active === s.id ? 'rgba(255,92,53,0.1)' : 'transparent', color: active === s.id ? '#FF5C35' : 'rgba(237,240,247,0.5)', fontSize: '13px', fontWeight: active === s.id ? 600 : 400, cursor: 'pointer', borderLeft: active === s.id ? '2px solid #FF5C35' : '2px solid transparent', marginBottom: '2px' }}>
              {s.label}
            </button>
          ))}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <a href="https://konduyt-api.onrender.com/docs" target="_blank" rel="noopener" style={{ fontSize: '12px', color: '#FF5C35', textDecoration: 'none', fontWeight: 600 }}>API Reference →</a>
          </div>
        </nav>

        {/* Content */}
        <main>

          {active === 'getting-started' && (
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#EDF0F7', marginBottom: '8px' }}>Getting Started</h1>
              <P>Accept your first payment in under 10 minutes.</P>
              <Section title="1. Create a project">
                <P>Sign up at konduyt.dev/signup. Create an organization. Create a project. Every payment belongs to a project.</P>
              </Section>
              <Section title="2. Connect a provider">
                <P>Go to <strong style={{color:'#EDF0F7'}}>Connections</strong> in your project. Connect Stripe, M-Pesa, Paystack, or any other supported provider. Enter your credentials — Konduyt validates them immediately.</P>
              </Section>
              <Section title="3. Get your API keys">
                <P>Go to <strong style={{color:'#EDF0F7'}}>Developers</strong> → API Keys. You have four keys — use test keys during development, live keys in production.</P>
                <Code>{`pk_test_...   # publishable — safe in browser
sk_test_...   # secret — server only, never expose
pk_live_...   # publishable live
sk_live_...   # secret live`}</Code>
              </Section>
              <Section title="4. Accept your first payment">
                <Code>{`<!-- In your HTML -->
<script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>
<script>
  const konduyt = new KonduytClient({ publishableKey: 'pk_test_...' })

  document.getElementById('pay-btn').onclick = async () => {
    const result = await konduyt
      .on('payment.success', txn => console.log('Paid:', txn.transaction_id))
      .on('payment.failed',  err => console.error('Failed:', err.error.message))
      .checkout({
        amount:   2000,
        currency: 'KES',
        theme: { brandName: 'My Store', color: '#FF5C35' },
      })
  }
</script>`}</Code>
                <P>Konduyt selects the best provider automatically and shows the checkout sheet. The developer writes zero provider-specific code.</P>
              </Section>
            </div>
          )}

          {active === 'sdk' && (
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#EDF0F7', marginBottom: '8px' }}>SDK Guide</h1>
              <P>Two SDKs. One boundary. Client SDK runs in the browser. Server SDK runs on your server.</P>
              <Section title="Client SDK">
                <Sub title="Installation">
                  <Code>{`npm install @konduyt/sdk
# or via CDN:
<script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>`}</Code>
                </Sub>
                <Sub title="Initialization">
                  <Code>{`import { KonduytClient } from '@konduyt/sdk'
const konduyt = new KonduytClient({ publishableKey: 'pk_test_...' })`}</Code>
                </Sub>
                <Sub title="Provider recommendation">
                  <Code>{`const rec = await konduyt.recommend({ currency: 'KES' })
// { recommended: 'mpesa', reason: '99.1% success rate · 1.50% fee', score: 0.94 }`}</Code>
                </Sub>
                <Sub title="Events">
                  <Code>{`konduyt
  .on('checkout.opened',   ({ amount }) => showSpinner())
  .on('payment.started',   ({ vendor })  => console.log('Paying via', vendor))
  .on('payment.success',   txn  => saveToDatabase(txn.transaction_id))
  .on('payment.failed',    err  => showError(err.error.message))
  .on('provider.changed',  e    => console.log('Switched to', e.to))
  .on('tax.calculated',    tax  => showTaxBanner(tax.total_owed))`}</Code>
                </Sub>
              </Section>
              <Section title="Server SDK">
                <Sub title="Installation">
                  <Code>{`const { KonduytServer } = require('@konduyt/sdk/server')
const konduyt = new KonduytServer({ secretKey: process.env.KONDUYT_SECRET_KEY })`}</Code>
                </Sub>
                <Sub title="List transactions">
                  <Code>{`const { transactions } = await konduyt.payments.list(projectId, { status: 'success', limit: '50' })`}</Code>
                </Sub>
                <Sub title="Issue a refund">
                  <Code>{`await konduyt.payments.refund(projectId, transactionId)`}</Code>
                </Sub>
                <Sub title="Calculate tax">
                  <Code>{`const tax = await konduyt.tax.calculate({ amount: 50000, currency: 'KES', jurisdiction: 'KE' })
// { total_owed: 8000, taxes: [{ name: 'VAT', rate: 0.16, amount_owed: 8000, filing_deadline: '20th of next month' }] }`}</Code>
                </Sub>
                <Sub title="People management">
                  <Code>{`// Server SDK only — never expose via publishable key
const person = await konduyt.people.create(projectId, {
  name: 'Jane Doe', role: 'contractor',
  vendor: 'mpesa', amount: 15000, currency: 'KES',
})`}</Code>
                </Sub>
              </Section>
            </div>
          )}

          {active === 'api-reference' && (
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#EDF0F7', marginBottom: '8px' }}>API Reference</h1>
              <P>All endpoints available at <code style={{color:'#FF5C35'}}>https://konduyt-api.onrender.com/v1/</code></P>
              <P>Authentication: include your secret key as a Bearer token for server endpoints. Publishable key in the request body for checkout endpoints.</P>
              <Code>{`Authorization: Bearer sk_live_...`}</Code>
              <Section title="Idempotency">
                <P>Include <code style={{color:'#FF5C35'}}>Idempotency-Key: unique-uuid</code> on all POST requests that create or move money. The same key within 24 hours returns the stored response — no duplicate charge.</P>
                <Code>{`curl -X POST https://konduyt-api.onrender.com/v1/transactions/{project_id}/charge \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Idempotency-Key: 4f8b7e2d-a9b4-4d61-9d18-7f2d3c8f91ab" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 2000, "currency": "KES", "customer_email": "user@example.com"}'`}</Code>
              </Section>
              <a href="https://konduyt-api.onrender.com/docs" target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'rgba(255,92,53,0.1)', border: '1px solid rgba(255,92,53,0.3)', borderRadius: '100px', color: '#FF5C35', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                Open interactive API docs →
              </a>
            </div>
          )}

          {active === 'connectors' && (
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#EDF0F7', marginBottom: '8px' }}>Connector Guide</h1>
              <P>Every payment provider plugs into the same connector framework. You interact with Konduyt — never directly with Stripe, M-Pesa, or any specific provider.</P>
              {[
                { name:'Stripe', region:'Global cards', creds:['Secret Key (sk_live_...)'], features:['Cards','Refunds','Subscriptions','3DS'], sandbox:'Use sk_test_... keys. Test card: 4242424242424242', link:'https://dashboard.stripe.com/apikeys' },
                { name:'M-Pesa', region:'East Africa (KES)', creds:['Consumer Key','Consumer Secret','Shortcode','Passkey'], features:['STK Push','B2C payouts','Async confirmation'], sandbox:'Safaricom sandbox available. Phone: 254708374149', link:'https://developer.safaricom.co.ke' },
                { name:'Paystack', region:'West Africa (NGN, GHS, KES)', creds:['Secret Key (sk_live_...)'], features:['Card','Bank transfer','Mobile money','Refunds'], sandbox:'Use sk_test_... keys. Card: 4084084084084081', link:'https://dashboard.paystack.com' },
              ].map(c => (
                <Section key={c.name} title={c.name}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ background: '#0D1120', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(237,240,247,0.3)', marginBottom: '8px' }}>Required credentials</div>
                      {c.creds.map(cr => <div key={cr} style={{ fontSize: '13px', color: '#EDF0F7', marginBottom: '4px' }}>· {cr}</div>)}
                      <a href={c.link} target="_blank" rel="noopener" style={{ fontSize: '12px', color: '#FF5C35', textDecoration: 'none', display: 'block', marginTop: '10px', fontWeight: 600 }}>Where to find them →</a>
                    </div>
                    <div style={{ background: '#0D1120', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(237,240,247,0.3)', marginBottom: '8px' }}>Features</div>
                      {c.features.map(f => <div key={f} style={{ fontSize: '13px', color: 'rgba(237,240,247,0.7)', marginBottom: '4px' }}>✓ {f}</div>)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(237,240,247,0.5)', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', borderLeft: '2px solid #F59E0B' }}>
                    <strong style={{ color: '#F59E0B' }}>Sandbox:</strong> {c.sandbox}
                  </div>
                </Section>
              ))}
            </div>
          )}

          {active === 'webhooks' && (
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#EDF0F7', marginBottom: '8px' }}>Webhooks</h1>
              <P>Konduyt sends signed HTTP POST requests to your endpoint when payment events occur.</P>
              <Section title="Event types">
                {['payment.created','payment.processing','payment.succeeded','payment.failed','payment.cancelled','refund.requested','refund.succeeded','refund.failed','webhook.verified'].map(e => (
                  <div key={e} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <code style={{ fontSize: '12px', color: '#FF5C35', fontFamily: 'monospace' }}>{e}</code>
                  </div>
                ))}
              </Section>
              <Section title="Signature verification">
                <P>Every webhook includes <code style={{color:'#FF5C35'}}>X-Konduyt-Signature</code> and <code style={{color:'#FF5C35'}}>X-Konduyt-Timestamp</code>. Verify before processing.</P>
                <Code>{`import hmac, hashlib, time

def verify_webhook(body: bytes, signature: str, secret: str, timestamp: str) -> bool:
    # Reject events older than 5 minutes (replay attack protection)
    if abs(time.time() - int(timestamp)) > 300:
        return False
    signed = f"{timestamp}.{body.decode()}"
    expected = "sha256=" + hmac.new(secret.encode(), signed.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)`}</Code>
              </Section>
              <Section title="Retry policy">
                <P>Failed deliveries are retried with exponential backoff: 1 minute, 5 minutes, 30 minutes, 2 hours. After 5 failed attempts, the delivery is moved to the dead-letter queue. Use the dashboard to replay any delivery.</P>
              </Section>
            </div>
          )}

          {active === 'errors' && (
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#EDF0F7', marginBottom: '8px' }}>Error Reference</h1>
              <P>Every error from the Konduyt API returns the same structure with a <code style={{color:'#FF5C35'}}>request_id</code> for tracing and a <code style={{color:'#FF5C35'}}>retryable</code> flag.</P>
              <Code>{`{
  "error": {
    "code":          "payment_failed",
    "type":          "provider_error",
    "message":       "Payment declined by M-Pesa.",
    "provider":      "mpesa",
    "request_id":    "req_4f6e247ab3c1",
    "retryable":     false,
    "documentation": "https://konduyt.dev/docs/errors/payment_failed"
  }
}`}</Code>
              <Section title="All error codes">
                <div style={{ background: '#0D1120', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#131928' }}>
                        {['Code','HTTP','Type','Cause','Fix'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(237,240,247,0.35)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ERRORS.map(e => (
                        <tr key={e.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#FF5C35' }}>{e.code}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(237,240,247,0.5)' }}>{e.http}</td>
                          <td style={{ padding: '10px 14px', fontSize: '11px', color: 'rgba(237,240,247,0.45)' }}>{e.type}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(237,240,247,0.7)' }}>{e.cause}</td>
                          <td style={{ padding: '10px 14px', fontSize: '12px', color: '#22C55E' }}>{e.fix}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          )}

          {active === 'changelog' && (
            <div>
              <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '26px', color: '#EDF0F7', marginBottom: '8px' }}>Changelog</h1>
              {[
                { date: 'July 2026', version: '1.0.0', type: 'release', items: [
                  'Payment Connector Framework — provider-agnostic architecture',
                  'Transaction Ledger — immutable, append-only financial history',
                  'Payment State Machine — legal transition enforcement',
                  'Intelligence Layer — automatic provider selection with explanation',
                  'Provider Health tracking — real-time success rate and latency',
                  'Idempotency keys — safe retries with payload fingerprinting',
                  'Standardized error responses with request IDs and retryable flag',
                  'Webhook HMAC signing — replay and test from dashboard',
                  'Reconciliation Service — background verification against providers',
                  'Client SDK + Server SDK separation with hard capability boundary',
                  'API versioning — all routes at /v1/ with backward compat',
                  'Developer Logs page — unified activity view with error detail',
                ]},
              ].map(entry => (
                <div key={entry.version} style={{ marginBottom: '32px', background: '#0D1120', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: '#EDF0F7' }}>v{entry.version}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(237,240,247,0.4)' }}>{entry.date}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>RELEASE</span>
                  </div>
                  <div style={{ padding: '14px 18px' }}>
                    {entry.items.map((item, i) => (
                      <div key={i} style={{ fontSize: '13px', color: 'rgba(237,240,247,0.7)', padding: '5px 0', borderBottom: i < entry.items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                        · {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
