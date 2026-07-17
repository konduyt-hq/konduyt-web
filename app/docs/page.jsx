'use client'
import { useState } from 'react'
import Nav from '../../components/Nav'
import Footer from '../../components/Footer'

const SECTIONS = {
  quickstart: {
    title: 'Quick Start',
    content: `
## Install in under 5 minutes

### 1. Sign up and create a project

Sign up at konduyt.dev, create a project, and get your API keys from the Integration tab.

### 2. Add the SDK

**JavaScript (CDN — no npm needed):**
\`\`\`html
<script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>
\`\`\`

**Python:**
\`\`\`bash
pip install konduyt
\`\`\`

**PHP:**
\`\`\`bash
composer require konduyt/sdk
\`\`\`

### 3. Initialize and charge

\`\`\`javascript
const konduyt = new Konduyt({ publishableKey: 'pk_live_...' })

konduyt.checkout({
  amount: 2000,
  currency: 'KES',
  theme: { color: '#FF5C35', buttonText: 'Pay now' }
})

konduyt.on('payment.success', (txn) => {
  console.log('Paid!', txn.transaction_id)
})
\`\`\`

That is it. Konduyt shows your customer the cheapest available payment method first, processes the payment, calculates tax, and calls your webhook.
    `
  },
  javascript: {
    title: 'JavaScript SDK',
    content: `
## JavaScript SDK (CDN)

No npm install. No node_modules. Works in any browser, Chromebook, or lightweight setup.

### Installation
\`\`\`html
<script src="https://cdn.konduyt.dev/v1/konduyt.js"></script>
\`\`\`

### Initialize
\`\`\`javascript
const konduyt = new Konduyt({
  publishableKey: 'pk_live_...'  // from your project dashboard
})
\`\`\`

### konduyt.checkout(options)
Launch the Konduyt payment sheet. Konduyt picks the cheapest vendor automatically.

\`\`\`javascript
konduyt.checkout({
  amount: 2000,        // in smallest currency unit (e.g. cents, kobo)
  currency: 'KES',     // ISO 4217 currency code
  theme: {
    color: '#FF5C35',        // your brand color
    logo: 'https://...',     // your logo URL
    buttonText: 'Pay now'    // CTA text
  }
})
\`\`\`

### konduyt.on(event, handler)
Listen for payment events. These fire when the payment status changes.

\`\`\`javascript
konduyt.on('payment.success', (txn) => {
  // Save to your database, redirect user
  db.save(txn)
  window.location = '/success'
})

konduyt.on('payment.failed', (txn) => {
  // Show error to user
  alert('Payment failed: ' + txn.error.message)
})

konduyt.on('payment.refunded', (txn) => {
  // Update your records
  db.updateRefund(txn)
})
\`\`\`

### konduyt.tax(options)
Calculate tax for a transaction before charging.

\`\`\`javascript
const tax = await konduyt.tax({
  amount: 2000,
  currency: 'KES',
  jurisdiction: 'KE'
})

console.log(tax.total_owed)    // e.g. 320
console.log(tax.where_to_pay)  // e.g. "itax.kra.go.ke"
console.log(tax.deadline)      // e.g. "20th of following month"
\`\`\`

### Transaction response object
Every successful charge returns this unified shape regardless of vendor:

\`\`\`json
{
  "status": "success",
  "transaction_id": "txn_4f6e247a",
  "amount": 2000,
  "currency": "KES",
  "vendor": "mpesa",
  "vendor_reference": "MPE123456",
  "tax": {
    "amount_owed": 320,
    "jurisdiction": "KE",
    "where_to_pay": "itax.kra.go.ke",
    "deadline": "20th of following month"
  },
  "timestamp": "2026-07-17T10:30:00Z"
}
\`\`\`
    `
  },
  python: {
    title: 'Python SDK',
    content: `
## Python SDK

### Installation
\`\`\`bash
pip install konduyt
\`\`\`

### Initialize
\`\`\`python
from konduyt import Konduyt

kd = Konduyt(secret_key='sk_live_...')
\`\`\`

### Charge
\`\`\`python
result = kd.charge(
    amount=2000,
    currency='KES',
    vendor='mpesa',              # optional — Konduyt auto-picks if omitted
    customer_phone='+254712345678',
    customer_email='user@example.com'
)

if result.status == 'success':
    print(result.transaction_id)
elif result.status == 'failed':
    print(result.error['message'])
\`\`\`

### Tax calculation
\`\`\`python
tax = kd.tax(amount=2000, currency='KES', jurisdiction='KE')
print(f"Tax owed: {tax.total_owed} {tax.currency}")
print(f"File at: {tax.where_to_pay}")
\`\`\`

### Webhook handler (Flask example)
\`\`\`python
from flask import Flask, request
from konduyt import Konduyt

app = Flask(__name__)
kd = Konduyt(secret_key='sk_live_...')

@app.route('/webhook', methods=['POST'])
def webhook():
    event = request.json
    if event['event'] == 'payment.success':
        txn = event['data']
        db.save(txn)
    return {'ok': True}
\`\`\`
    `
  },
  php: {
    title: 'PHP SDK',
    content: `
## PHP SDK

### Installation
\`\`\`bash
composer require konduyt/sdk
\`\`\`

### Initialize
\`\`\`php
require 'vendor/autoload.php';

$konduyt = new Konduyt\\Client([
    'secret_key' => 'sk_live_...'
]);
\`\`\`

### Charge
\`\`\`php
$result = $konduyt->charge([
    'amount'           => 2000,
    'currency'         => 'KES',
    'vendor'           => 'mpesa',
    'customer_phone'   => '+254712345678',
    'customer_email'   => 'user@example.com',
]);

if ($result->status === 'success') {
    echo $result->transaction_id;
}
\`\`\`

### Tax calculation
\`\`\`php
$tax = $konduyt->tax([
    'amount'       => 2000,
    'currency'     => 'KES',
    'jurisdiction' => 'KE'
]);

echo "Tax owed: " . $tax->total_owed . " " . $tax->currency;
echo "File at: " . $tax->where_to_pay;
\`\`\`
    `
  },
  mobile: {
    title: 'Mobile (Kotlin & Dart)',
    content: `
## Mobile SDKs

### Kotlin (Android)

**build.gradle:**
\`\`\`gradle
implementation 'dev.konduyt:sdk:1.0.0'
\`\`\`

**Usage:**
\`\`\`kotlin
val konduyt = Konduyt(publishableKey = "pk_live_...")

konduyt.checkout(
    amount   = 2000,
    currency = "KES",
    theme    = KonduytTheme(color = "#FF5C35", buttonText = "Pay now")
) { result ->
    when (result.status) {
        "success" -> println("Paid: " + result.transactionId)
        "failed"  -> println("Failed: " + result.error?.message)
    }
}
\`\`\`

---

### Dart (Flutter)

**pubspec.yaml:**
\`\`\`yaml
dependencies:
  konduyt: ^1.0.0
\`\`\`

**Usage:**
\`\`\`dart
import 'package:konduyt/konduyt.dart';

final kd = Konduyt(publishableKey: 'pk_live_...');

final result = await kd.checkout(
  amount:   2000,
  currency: 'KES',
  theme:    KonduytTheme(color: '#FF5C35', buttonText: 'Pay now'),
);

if (result.status == 'success') {
  print('Paid: ' + result.transactionId);
}
\`\`\`
    `
  },
  webhooks: {
    title: 'Webhook Events',
    content: `
## Webhook Events

Konduyt calls your webhook URL when payment status changes. Add your handlers using \`konduyt.on()\` in JavaScript, or set up an HTTP endpoint for server-side events.

### Event list

| Event | When it fires |
|---|---|
| \`payment.success\` | Payment completed successfully |
| \`payment.failed\` | Payment failed (includes failover result) |
| \`payment.refunded\` | Payment was refunded |
| \`vendor.degraded\` | A vendor's performance dropped — Konduyt switched to backup |
| \`vendor.recovered\` | A vendor recovered — routing switched back |

### Event payload shape

\`\`\`json
{
  "event": "payment.success",
  "data": {
    "transaction_id":   "txn_4f6e247a",
    "amount":           2000,
    "currency":         "KES",
    "vendor":           "mpesa",
    "vendor_reference": "MPE123456",
    "customer_email":   "user@example.com",
    "customer_phone":   "+254712345678",
    "tax": {
      "amount_owed":  320,
      "jurisdiction": "KE"
    },
    "timestamp": "2026-07-17T10:30:00Z"
  }
}
\`\`\`

### Configuring webhooks

Set your webhook URLs in the Integration tab of your project dashboard under Step 5 — Configure webhooks.
    `
  },
  errors: {
    title: 'Error Codes',
    content: `
## Error Codes

Konduyt normalizes error codes across all vendors. You always get the same code regardless of which vendor processed the transaction.

| Code | Meaning | What to do |
|---|---|---|
| \`insufficient_funds\` | Customer cannot cover the amount | Ask customer to use a different payment method |
| \`customer_declined\` | Customer cancelled the payment | Show a friendly message and retry option |
| \`vendor_unavailable\` | Vendor is down — failover attempted | Konduyt already tried a backup. If this persists, check your dashboard. |
| \`invalid_credentials\` | Your vendor API key is wrong | Go to Integration tab and reconnect the vendor |
| \`invalid_amount\` | Amount is zero, negative, or too large | Check your charge() call |
| \`unsupported_currency\` | Vendor does not support this currency | Choose a different vendor for this currency |
| \`timeout\` | Vendor took too long to respond | Retry the transaction |
| \`kyc_required\` | You have not completed identity verification | Complete KYC in your dashboard |
| \`jurisdiction_locked\` | This jurisdiction requires Global plan | Upgrade at konduyt.dev/pricing |

### Error object shape

\`\`\`json
{
  "status": "failed",
  "error": {
    "code":              "insufficient_funds",
    "message":           "Customer has insufficient funds",
    "vendor":            "mpesa",
    "vendor_error_code": "1032",
    "failover_attempted": true,
    "failover_vendor":    "stripe",
    "failover_result":    "success"
  }
}
\`\`\`
    `
  },
  tax: {
    title: 'Tax Guidance',
    content: `
## Tax Guidance

Konduyt calculates what you owe and shows you exactly where and how to pay. We do not file on your behalf — you stay in control.

### Supported jurisdictions

| Country | Tax type | Rate | Authority |
|---|---|---|---|
| Kenya | VAT + DST | 16% + 1.5% | KRA iTax |
| Nigeria | VAT | 7.5% | FIRS |
| Ghana | VAT | 15% | GRA |
| More coming | — | — | — |

### How to pay — Kenya example

1. Log into iTax at itax.kra.go.ke
2. Navigate to Returns → File Return → VAT
3. Enter your output tax amount from the Konduyt dashboard
4. Submit and download the acknowledgement receipt
5. Pay any balance via M-Pesa PayBill 572572 or bank

Your Transactions tab shows the exact amount owed per jurisdiction and links directly to the correct portal.

### Tax API endpoint

\`\`\`bash
POST https://konduyt-api.onrender.com/tax/calculate
Content-Type: application/json

{
  "amount": 2000,
  "currency": "KES",
  "jurisdiction": "KE",
  "transaction_type": "services"
}
\`\`\`

Response:
\`\`\`json
{
  "total_owed": 320,
  "currency": "KES",
  "jurisdiction": "KE",
  "country": "Kenya",
  "taxes": [{
    "name": "Value Added Tax",
    "abbreviation": "VAT",
    "rate": 0.16,
    "amount_owed": 320,
    "filing_deadline": "20th of the following month",
    "where_to_pay": "https://itax.kra.go.ke"
  }]
}
\`\`\`
    `
  },
}

function renderContent(content) {
  const lines = content.split('\n')
  const elements = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'16px',marginTop:'28px',marginBottom:'10px'}}>{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'22px',marginBottom:'14px',marginTop:'8px'}}>{line.slice(3)}</h2>)
    } else if (line.startsWith('```')) {
      const lang = line.slice(3)
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
      elements.push(
        <pre key={i} style={{background:'var(--surface-2)',border:'1px solid var(--border)',borderRadius:'8px',padding:'16px',overflow:'auto',fontFamily:'Courier New,monospace',fontSize:'13px',color:'#C8D4E8',lineHeight:1.65,marginBottom:'16px'}}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
    } else if (line.startsWith('| ')) {
      const tableLines = []
      while (i < lines.length && lines[i].startsWith('| ')) { tableLines.push(lines[i]); i++ }
      const headers = tableLines[0].split('|').filter(c => c.trim() && !c.includes('---')).map(c => c.trim())
      const rows = tableLines.slice(2).map(row => row.split('|').filter(c => c.trim()).map(c => c.trim()))
      elements.push(
        <div key={i} style={{overflowX:'auto',marginBottom:'16px'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'14px'}}>
            <thead><tr>{headers.map((h,j) => <th key={j} style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid var(--border)',color:'var(--text)',fontWeight:600,fontSize:'12px',textTransform:'uppercase',letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((row,j) => <tr key={j}>{row.map((cell,k) => <td key={k} style={{padding:'8px 12px',borderBottom:'1px solid rgba(255,255,255,.04)',color:'var(--text-muted)',fontSize:'13px'}}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    } else if (line.trim()) {
      elements.push(<p key={i} style={{fontSize:'15px',color:'var(--text-muted)',lineHeight:1.7,marginBottom:'12px'}}>{line}</p>)
    }
    i++
  }
  return elements
}

export default function DocsPage() {
  const [active, setActive] = useState('quickstart')
  const section = SECTIONS[active]

  return (
    <>
      <Nav />
      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'48px 32px 100px',display:'grid',gridTemplateColumns:'220px 1fr',gap:'48px',alignItems:'start'}}>

        {/* Sidebar */}
        <nav style={{position:'sticky',top:'80px'}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'11px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'14px'}}>SDK Reference</div>
          <ul style={{listStyle:'none',display:'grid',gap:'2px'}}>
            {Object.entries(SECTIONS).map(([key, s]) => (
              <li key={key}>
                <button
                  onClick={() => setActive(key)}
                  style={{
                    width:'100%',textAlign:'left',padding:'8px 12px',borderRadius:'6px',
                    fontSize:'14px',fontWeight: active===key ? 600 : 400,
                    color: active===key ? 'var(--text)' : 'var(--text-muted)',
                    background: active===key ? 'var(--surface)' : 'transparent',
                    border: active===key ? '1px solid var(--border)' : '1px solid transparent',
                    cursor:'pointer',transition:'all .15s',
                  }}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>

          <div style={{marginTop:'24px',paddingTop:'24px',borderTop:'1px solid var(--border)'}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'11px',letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:'14px'}}>Resources</div>
            <ul style={{listStyle:'none',display:'grid',gap:'4px'}}>
              <li><a href="https://konduyt-api.onrender.com/docs" target="_blank" rel="noopener" style={{fontSize:'13px',color:'var(--accent)',display:'block',padding:'6px 12px'}}>Live API reference →</a></li>
              <li><a href="https://github.com/konduyt-hq/konduyt-sdk" target="_blank" rel="noopener" style={{fontSize:'13px',color:'var(--text-muted)',display:'block',padding:'6px 12px'}}>GitHub →</a></li>
            </ul>
          </div>
        </nav>

        {/* Content */}
        <main>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:'28px',marginBottom:'24px',color:'var(--text)'}}>{section.title}</div>
          {renderContent(section.content)}
        </main>
      </div>
      <Footer />
    </>
  )
}
