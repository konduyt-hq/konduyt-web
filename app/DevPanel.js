'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

// Universal TEST keys shown on the landing page. These are display placeholders
// for the quickstart — the real per-project keys come from the dashboard after
// sign-up. The "Run in test mode" button below uses the public demo endpoint,
// which needs no key, so nothing real is exposed.
const KEYS = {
  secret: 'kdu_test_secret_4f8Kd92MnQ7pXvR3sT6wY1bC5eH0jL8n',
  publishable: 'kdu_test_pub_9aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0u',
};

// Real integration snippets — genuine HTTP calls to the Konduyt test endpoint,
// matching the dashboard's Home tab exactly (curl, JavaScript, Python, PHP, Go).
// {{SECRET}} / {{API}} are filled at render time.
const LANGUAGES = [
  {
    id: 'curl', label: 'cURL', filename: 'request.sh',
    code: `curl -X POST {{API}}/v1/payments/test \\
  -H "Authorization: Bearer {{SECRET}}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "currency": "KES",
    "provider": "test",
    "customer": { "email": "customer@example.com" }
  }'`,
  },
  {
    id: 'javascript', label: 'JavaScript', filename: 'index.js',
    code: `const res = await fetch("{{API}}/v1/payments/test", {
  method: "POST",
  headers: {
    "Authorization": "Bearer {{SECRET}}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 5000,
    currency: "KES",
    provider: "test",
    customer: { email: "customer@example.com" },
  }),
});

const payment = await res.json();
console.log(payment);`,
  },
  {
    id: 'python', label: 'Python', filename: 'main.py',
    code: `import requests

res = requests.post(
    "{{API}}/v1/payments/test",
    headers={"Authorization": "Bearer {{SECRET}}"},
    json={
        "amount": 5000,
        "currency": "KES",
        "provider": "test",
        "customer": {"email": "customer@example.com"},
    },
)

print(res.json())`,
  },
  {
    id: 'php', label: 'PHP', filename: 'index.php',
    code: `<?php
$ch = curl_init("{{API}}/v1/payments/test");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer {{SECRET}}",
    "Content-Type: application/json",
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "amount" => 5000,
    "currency" => "KES",
    "provider" => "test",
    "customer" => ["email" => "customer@example.com"],
]));

echo curl_exec($ch);`,
  },
  {
    id: 'go', label: 'Go', filename: 'main.go',
    code: `package main

import (
    "bytes"
    "fmt"
    "io"
    "net/http"
)

func main() {
    body := []byte(\`{"amount":5000,"currency":"KES","provider":"test","customer":{"email":"customer@example.com"}}\`)
    req, _ := http.NewRequest("POST", "{{API}}/v1/payments/test", bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer {{SECRET}}")
    req.Header.Set("Content-Type", "application/json")

    res, _ := http.DefaultClient.Do(req)
    defer res.Body.Close()
    out, _ := io.ReadAll(res.Body)
    fmt.Println(string(out))
}`,
  },
];

function render(code) {
  return code.replace(/\{\{API\}\}/g, API_BASE).replace(/\{\{SECRET\}\}/g, KEYS.secret);
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button className="copy-btn" onClick={handleCopy} type="button">
      {copied ? '✓ Copied' : `⧉ ${label}`}
    </button>
  );
}

function KeyField({ value }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try { await navigator.clipboard.writeText(value); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = value; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  const masked = value.slice(0, 16) + '•'.repeat(Math.max(0, value.length - 20)) + value.slice(-4);
  return (
    <div className="key-field">
      <span className="key-value">{masked}</span>
      <button className="copy-icon-btn" onClick={handleCopy} type="button" aria-label="Copy key">
        {copied ? '✓' : '⧉'}
      </button>
    </div>
  );
}

function fmtMoney(minor, currency) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100); }
  catch { return `${currency} ${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`; }
}

// Human speed label from settlement days.
function speedLabel(days) {
  if (days === 0 || days == null) return 'Instant';
  if (days === 1) return 'Next day';
  return `${days} days`;
}

export default function DevPanel() {
  const [activeId, setActiveId] = useState('curl');
  const [runState, setRunState] = useState('idle'); // idle | running | done
  const [result, setResult] = useState(null);
  const [showIntel, setShowIntel] = useState(false);
  const active = LANGUAGES.find((l) => l.id === activeId) || LANGUAGES[0];
  const renderedCode = render(active.code);

  async function handleRun() {
    if (runState === 'running') return;
    setRunState('running'); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/v1/demo/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 5000, currency: 'KES', method: 'mpesa',
                               customer_country: 'KE', merchant_country: 'KE' }),
      });
      const data = await res.json();
      setResult(data);
      setRunState('done');
      setShowIntel(true);
    } catch {
      setResult({ error: 'Could not reach the demo API. Try again in a moment.' });
      setRunState('done');
    }
  }

  function selectLang(id) { setActiveId(id); setRunState('idle'); setResult(null); }

  const options = (result && result.intelligence && result.intelligence.options) || [];
  const payment = result && result.payment;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="tabs">
          <div className="tab active">Quick start</div>
          <div className="tab">API reference</div>
        </div>
        <button className="btn-test" type="button" onClick={handleRun}>Test before you sign up</button>
      </div>
      <div className="panel-body">
        {/* Universal keys — stacked (secret above publishable) */}
        <div className="keys-stack">
          <div className="key-block">
            <div className="key-label">Universal secret key <span className="info">ⓘ</span></div>
            <KeyField value={KEYS.secret} />
          </div>
          <div className="key-block">
            <div className="key-label">Universal publishable key <span className="info">ⓘ</span></div>
            <KeyField value={KEYS.publishable} />
          </div>
        </div>

        {/* 1. Language selector — matches the dashboard set */}
        <div className="step-label">1. Choose your language</div>
        <div className="lang-pills">
          {LANGUAGES.map((l) => (
            <button key={l.id} type="button"
              className={l.id === activeId ? 'pill active' : 'pill'}
              onClick={() => selectLang(l.id)}>
              {l.label}
            </button>
          ))}
        </div>

        {/* 2. Real code */}
        <div className="step-row">
          <div className="step-label" style={{ marginBottom: 0 }}>2. Copy, run, and see it work</div>
          <a href="/docs/" className="view-docs">View full docs →</a>
        </div>

        <div className="code-grid">
          <div className="code-box">
            <div className="code-box-head">
              <span>{active.filename}</span>
              <CopyButton text={renderedCode} />
            </div>
            <pre className="code-pre">{renderedCode}</pre>
          </div>
          <div className="code-box">
            <div className="code-box-head">
              <span>RESPONSE</span>
              {runState === 'done' && payment ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="status-dot"></span>200 OK · test
                </span>
              ) : runState === 'running' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8a8a92' }}>
                  <span className="status-dot pending"></span>Sending…
                </span>
              ) : (
                <span style={{ color: '#6a6a72' }}>Awaiting request</span>
              )}
            </div>
            {runState === 'idle' && (
              <pre className="code-pre code-muted">{`// Click "Run in test mode" to send a
// test payment and see the real API
// response — and the routing intelligence.`}</pre>
            )}
            {runState === 'running' && (
              <pre className="code-pre code-muted">{`> POST /v1/payments/test
> Running routing intelligence…
> Creating test payment…`}</pre>
            )}
            {runState === 'done' && payment && (
              <pre className="code-pre">{JSON.stringify(payment, null, 2)}</pre>
            )}
            {runState === 'done' && result && result.error && (
              <pre className="code-pre code-muted">{result.error}</pre>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="run-btn" type="button" onClick={handleRun} disabled={runState === 'running'}>
            {runState === 'running' ? '● Running…' : runState === 'done' ? '↻ Run again' : '▶ Run in test mode'}
          </button>
          {runState === 'done' && payment && (
            <button className="success-line" type="button" style={{ border: 'none', cursor: 'pointer', background: 'none' }}
              onClick={() => setShowIntel(true)}>
              ✓ Test payment created · see intelligence
            </button>
          )}
        </div>
      </div>

      {/* Payment intelligence popup — the real ranked vendors from the engine */}
      {showIntel && options.length > 0 && (
        <div className="intel-modal-overlay" onClick={() => setShowIntel(false)}>
          <div className="intel-modal" onClick={(e) => e.stopPropagation()}>
            <button className="intel-modal-close" onClick={() => setShowIntel(false)} type="button">✕</button>
            <div className="intel-modal-head">
              <div className="intel-modal-title">Payment intelligence</div>
              <div className="intel-modal-sub">
                Same {fmtMoney(payment.amount * 100, payment.currency)} M-Pesa payment, every rail that can serve it —
                ranked cheapest-first by real fees and speed. This is exactly what you get on a real project once you connect a provider.
              </div>
            </div>
            <div className="intel-modal-table">
              <div className="intel-modal-row intel-modal-row-head">
                <span>Rail</span><span>Fee</span><span>Speed</span><span></span>
              </div>
              {options.map((o, i) => (
                <div key={o.connector} className={`intel-modal-row ${i === 0 ? 'best' : ''}`}>
                  <span className="intel-rail-name">{o.connector_name || o.connector}</span>
                  <span className="intel-rail-fee">
                    {o.effective_percent != null ? `${o.effective_percent}%` : '—'}
                    {o.fee_minor != null && <span className="intel-rail-money"> · {fmtMoney(o.fee_minor, payment.currency)}</span>}
                  </span>
                  <span className="intel-rail-speed">{speedLabel(o.settlement_days)}</span>
                  <span>{i === 0 ? <span className="intel-best-badge">Recommended</span> : null}</span>
                </div>
              ))}
            </div>
            <div className="intel-modal-foot">
              Test mode — no real charge. Konduyt chooses the recommended rail automatically for your customers.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
