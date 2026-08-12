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
  {
    id: 'ruby', label: 'Ruby', filename: 'main.rb',
    code: `require "net/http"
require "json"
require "uri"

uri = URI("{{API}}/v1/payments/test")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

req = Net::HTTP::Post.new(uri)
req["Authorization"] = "Bearer {{SECRET}}"
req["Content-Type"] = "application/json"
req.body = {
  amount: 5000, currency: "KES", provider: "test",
  customer: { email: "customer@example.com" }
}.to_json

puts http.request(req).body`,
  },
  {
    id: 'rust', label: 'Rust', filename: 'main.rs',
    code: `use reqwest::blocking::Client;
use serde_json::json;

fn main() {
    let res = Client::new()
        .post("{{API}}/v1/payments/test")
        .bearer_auth("{{SECRET}}")
        .json(&json!({
            "amount": 5000,
            "currency": "KES",
            "provider": "test",
            "customer": { "email": "customer@example.com" }
        }))
        .send()
        .unwrap();

    println!("{}", res.text().unwrap());
}`,
  },
  {
    id: 'csharp', label: 'C#', filename: 'Program.cs',
    code: `using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;

var client = new HttpClient();
client.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", "{{SECRET}}");

var body = new StringContent("""
{ "amount": 5000, "currency": "KES", "provider": "test",
  "customer": { "email": "customer@example.com" } }
""", Encoding.UTF8, "application/json");

var res = await client.PostAsync("{{API}}/v1/payments/test", body);
Console.WriteLine(await res.Content.ReadAsStringAsync());`,
  },
  {
    id: 'java', label: 'Java', filename: 'Main.java',
    code: `import java.net.URI;
import java.net.http.*;

var client = HttpClient.newHttpClient();
var request = HttpRequest.newBuilder()
    .uri(URI.create("{{API}}/v1/payments/test"))
    .header("Authorization", "Bearer {{SECRET}}")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString("""
        { "amount": 5000, "currency": "KES", "provider": "test",
          "customer": { "email": "customer@example.com" } }
    """))
    .build();

var res = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(res.body());`,
  },
  {
    id: 'kotlin', label: 'Kotlin', filename: 'Main.kt',
    code: `import java.net.URI
import java.net.http.*

val client = HttpClient.newHttpClient()
val request = HttpRequest.newBuilder()
    .uri(URI.create("{{API}}/v1/payments/test"))
    .header("Authorization", "Bearer {{SECRET}}")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(
        """{ "amount": 5000, "currency": "KES", "provider": "test",
             "customer": { "email": "customer@example.com" } }"""
    ))
    .build()

val res = client.send(request, HttpResponse.BodyHandlers.ofString())
println(res.body())`,
  },
  {
    id: 'swift', label: 'Swift', filename: 'main.swift',
    code: `import Foundation

var request = URLRequest(url: URL(string: "{{API}}/v1/payments/test")!)
request.httpMethod = "POST"
request.setValue("Bearer {{SECRET}}", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = """
{ "amount": 5000, "currency": "KES", "provider": "test",
  "customer": { "email": "customer@example.com" } }
""".data(using: .utf8)

let (data, _) = try await URLSession.shared.data(for: request)
print(String(data: data, encoding: .utf8)!)`,
  },
  {
    id: 'cpp', label: 'C++', filename: 'main.cpp',
    code: `// Using libcurl
#include <curl/curl.h>
#include <string>

int main() {
    CURL* curl = curl_easy_init();
    const char* body =
        R"({"amount":5000,"currency":"KES","provider":"test",)"
        R"("customer":{"email":"customer@example.com"}})";

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Authorization: Bearer {{SECRET}}");
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, "{{API}}/v1/payments/test");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body);
    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
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
// Human speed label. Only ever renders a real, known value — unknown shows "—",
// NEVER a fabricated number of days.
function speedLabel(settlement, days) {
  if (settlement === 'instant' || days === 0) return 'Instant';
  if (settlement === 't1' || days === 1) return 'Next day';
  if (settlement === 't2' || days === 2) return '2 days';
  if (settlement === 't3' || days === 3) return '3 days';
  if (days != null && days > 0 && days < 99) return `${days} days`;
  return '—';
}

export default function DevPanel() {
  const [activeId, setActiveId] = useState('curl');
  const [runState, setRunState] = useState('idle'); // idle | running | done
  const [result, setResult] = useState(null);
  const [showIntel, setShowIntel] = useState(false);
  const [showEnv, setShowEnv] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const active = LANGUAGES.find((l) => l.id === activeId) || LANGUAGES[0];
  const renderedCode = render(active.code);

  async function handleRun() {
    if (runState === 'running') return;
    setRunState('running'); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/v1/demo/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 500000, currency: 'KES' }),
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

        {/* 1. Set your key */}
        <div className="step-label">1. Set your key</div>
        <p className="step-hint">
          Keep your secret key out of your code — put it in an environment variable your app reads at runtime.
          {' '}
          <button type="button" className="env-toggle" onClick={() => setShowEnv((v) => !v)}>
            New to .env files? Set one up (2 minutes) {showEnv ? '▲' : '▼'}
          </button>
        </p>
        {showEnv && (
          <div className="env-help">
            <div className="env-step"><span className="env-num">1</span> In your project root, create a file named <code>.env</code></div>
            <div className="env-step"><span className="env-num">2</span> Add this line:</div>
            <div className="code-box env-code">
              <div className="code-box-head"><span>.env</span><CopyButton text={`KONDUYT_SECRET_KEY=${KEYS.secret}`} /></div>
              <pre className="code-pre">{`KONDUYT_SECRET_KEY=${KEYS.secret}`}</pre>
            </div>
            <div className="env-step"><span className="env-num">3</span> Add <code>.env</code> to your <code>.gitignore</code> so it&apos;s never committed</div>
            <div className="env-step"><span className="env-num">4</span> Read it in code (e.g. <code>process.env.KONDUYT_SECRET_KEY</code> in Node, <code>os.environ[&quot;KONDUYT_SECRET_KEY&quot;]</code> in Python)</div>
          </div>
        )}

        {/* 2. Language selector — matches the dashboard set */}
        <div className="step-label">2. Choose your language</div>
        <div className="lang-pills">
          {LANGUAGES.map((l) => (
            <button key={l.id} type="button"
              className={l.id === activeId ? 'pill active' : 'pill'}
              onClick={() => selectLang(l.id)}>
              {l.label}
            </button>
          ))}
        </div>

        {/* 3. Real code */}
        <div className="step-row">
          <div className="step-label" style={{ marginBottom: 0 }}>3. Copy, run, and see it work</div>
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

        {/* View more in test mode — appears after a run */}
        {runState === 'done' && payment && (
          <button className="view-more-btn" type="button" onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Hide test details ▲' : 'View more in test mode ▼'}
          </button>
        )}
        {showMore && runState === 'done' && payment && (
          <div className="test-more">
            <div className="test-more-block">
              <div className="test-more-h">Full payment object</div>
              <pre className="code-pre">{JSON.stringify(payment, null, 2)}</pre>
            </div>
            <div className="test-more-block">
              <div className="test-more-h">What each way to pay would cost</div>
              <div className="test-more-rails">
                {options.map((o, i) => (
                  <div key={o.label} className={`test-more-rail test-more-rail-2col ${i === 0 ? 'best' : ''}`}>
                    <span className="test-more-rail-name">{o.label}</span>
                    <span className="test-more-rail-fee">{o.fee_minor != null ? fmtMoney(o.fee_minor, payment.currency) : '—'}{o.fee_percent_effective != null ? ` · ${o.fee_percent_effective}%` : ''}</span>
                    {i === 0 && <span className="test-more-rail-reason">Best value for this payment — chosen automatically.</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="test-more-block">
              <div className="test-more-h">What happens on a real (live) project</div>
              <ul className="test-more-list">
                <li>You connect your own provider (Paystack, M-Pesa, PayPal, etc.) in the dashboard.</li>
                <li>Konduyt routes the payment to the cheapest option automatically.</li>
                <li>A webhook confirms the payment; the ledger records it.</li>
                <li>The Money and Taxes tabs update with the real transaction.</li>
              </ul>
              <div className="test-more-note">Test mode — no real charge, nothing stored. This mirrors the live result.</div>
            </div>
          </div>
        )}
      </div>

      {/* Payment intelligence popup — the real ranked vendors from the engine */}
      {showIntel && options.length > 0 && (
        <div className="intel-modal-overlay" onClick={() => setShowIntel(false)}>
          <div className="intel-modal" onClick={(e) => e.stopPropagation()}>
            <button className="intel-modal-close" onClick={() => setShowIntel(false)} type="button">✕</button>
            <div className="intel-modal-head">
              <div className="intel-modal-title">Payment intelligence</div>
              <div className="intel-modal-sub">
                A {fmtMoney(payment.amount, payment.currency)} payment, every way your customer can pay —
                ranked cheapest-first by real charges. This is exactly what you get on a real project once you connect a provider.
              </div>
            </div>
            <div className="intel-modal-table">
              <div className="intel-modal-row intel-modal-row-head intel-row-2col">
                <span>Pay with</span><span>Charge</span><span></span>
              </div>
              {options.map((o, i) => (
                <div key={o.label} className={`intel-modal-row intel-row-2col ${i === 0 ? 'best' : ''}`}>
                  <span className="intel-rail-name">{o.label}</span>
                  <span className="intel-rail-fee">
                    {o.fee_minor != null ? fmtMoney(o.fee_minor, payment.currency) : '—'}
                    {o.fee_percent_effective != null && <span className="intel-rail-money"> · {o.fee_percent_effective}%</span>}
                  </span>
                  <span>{i === 0 ? <span className="intel-best-badge">Best value</span> : null}</span>
                </div>
              ))}
            </div>
            <div className="intel-modal-foot">
              Test mode — no real charge. Konduyt routes to the best-value option automatically for your customers.
            </div>
            <a href="/demo/" className="intel-modal-cta">View the full demo →</a>
          </div>
        </div>
      )}
    </div>
  );
}
