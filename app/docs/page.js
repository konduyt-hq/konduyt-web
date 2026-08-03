'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// Same universal keys as the homepage
const SECRET = 'kdu_test_secret_4f8Kd92MnQ7pXvR3sT6wY1bC5eH0jL8n';

// Same "create payment" examples as the homepage, keyed by language.
const SNIPPETS = {
  javascript: `import Konduyt from 'konduyt';

const konduyt = new Konduyt({ secretKey: '${SECRET}' });

const payment = await konduyt.payments.create({
  amount: 5000,
  currency: 'KES',
  provider: 'mpesa',
  customer: { email: 'customer@example.com' }
});`,
  python: `from konduyt import Konduyt

konduyt = Konduyt(secret_key="${SECRET}")

payment = konduyt.payments.create(
    amount=5000,
    currency="KES",
    provider="mpesa",
    customer={"email": "customer@example.com"},
)`,
  go: `kd := konduyt.New("${SECRET}")

payment, _ := kd.Payments.Create(&konduyt.PaymentParams{
    Amount:   5000,
    Currency: "KES",
    Provider: "mpesa",
    Customer: konduyt.Customer{Email: "customer@example.com"},
})`,
};

// Documentation sections — the searchable content.
const DOCS = [
  {
    id: 'introduction',
    group: 'Getting started',
    title: 'Introduction',
    body: 'Konduyt is payment infrastructure. It connects providers like Stripe, PayPal, M-Pesa and Flutterwave to your product through one integration. You bring your own provider keys — Konduyt never holds your money; it routes and observes.',
  },
  {
    id: 'quickstart',
    group: 'Getting started',
    title: 'Quickstart',
    body: 'Install the SDK for your language, add your universal test key, and create your first payment. No sign-up is required to test — the universal test keys work out of the box.',
    code: true,
  },
  {
    id: 'authentication',
    group: 'Getting started',
    title: 'Authentication',
    body: 'Authenticate every request with your secret key. Use the publishable key on the client for checkout, and keep the secret key on your server. Test keys are prefixed kdu_test_; live keys with kdu_live_.',
  },
  {
    id: 'create-payment',
    group: 'Payments',
    title: 'Create a payment',
    body: 'Create a payment by specifying an amount, currency, provider and customer. Konduyt routes the request to the chosen provider and returns a unified payment object with a consistent shape across every provider.',
    code: true,
  },
  {
    id: 'providers',
    group: 'Payments',
    title: 'Providers',
    body: 'Konduyt supports Stripe, PayPal, M-Pesa, Flutterwave, Square, Pesapal, Razorpay and Pix. For Kenya, M-Pesa and Paystack are the primary rails. Switch providers by changing a single field — the rest of your code stays the same.',
  },
  {
    id: 'webhooks',
    group: 'Payments',
    title: 'Webhooks',
    body: 'Subscribe to events like payment.succeeded, payment.failed and refund.created. Konduyt normalizes webhook payloads across providers and retries delivery for 24 hours with exponential backoff.',
  },
  {
    id: 'refunds',
    group: 'Payments',
    title: 'Refunds',
    body: 'Issue full or partial refunds against any payment. Refunds return to the original payment method through the same provider that processed the payment.',
  },
  {
    id: 'errors',
    group: 'Reference',
    title: 'Errors',
    body: 'Konduyt uses standard HTTP status codes. 2xx for success, 4xx for request errors such as invalid keys or parameters, and 5xx for provider-side failures. Every error includes a machine-readable code and a human-readable message.',
  },
  {
    id: 'idempotency',
    group: 'Reference',
    title: 'Idempotency',
    body: 'Pass an Idempotency-Key header to safely retry requests without creating duplicate payments. Konduyt stores the result of the first request and returns it for any retry with the same key.',
  },
];

const GROUPS = ['Getting started', 'Payments', 'Reference'];

export default function Docs() {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState('introduction');
  const [lang, setLang] = useState('javascript');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOCS;
    return DOCS.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q) ||
        d.group.toLowerCase().includes(q)
    );
  }, [query]);

  const active = DOCS.find((d) => d.id === activeId) || DOCS[0];

  return (
    <div className="docs-root">
      {/* Top bar */}
      <div className="docs-topbar">
        <Link href="/" className="docs-brand">
          <span className="docs-brand-name">Konduyt</span>
          <span className="docs-brand-tag">Docs</span>
        </Link>
        <div className="docs-search-wrap">
          <span className="docs-search-icon">⌕</span>
          <input
            className="docs-search"
            placeholder="Search the docs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Link href="/" className="docs-home-link">← Home</Link>
      </div>

      <div className="docs-body">
        {/* Sidebar */}
        <aside className="docs-sidebar">
          {query.trim() ? (
            <div className="docs-navgroup">
              <div className="docs-navgroup-title">
                {filtered.length} result{filtered.length === 1 ? '' : 's'}
              </div>
              {filtered.map((d) => (
                <button
                  key={d.id}
                  className={d.id === activeId ? 'docs-navitem active' : 'docs-navitem'}
                  onClick={() => {
                    setActiveId(d.id);
                    setQuery('');
                  }}
                  type="button"
                >
                  {d.title}
                </button>
              ))}
              {filtered.length === 0 && <div className="docs-noresult">No matches.</div>}
            </div>
          ) : (
            GROUPS.map((g) => (
              <div className="docs-navgroup" key={g}>
                <div className="docs-navgroup-title">{g}</div>
                {DOCS.filter((d) => d.group === g).map((d) => (
                  <button
                    key={d.id}
                    className={d.id === activeId ? 'docs-navitem active' : 'docs-navitem'}
                    onClick={() => setActiveId(d.id)}
                    type="button"
                  >
                    {d.title}
                  </button>
                ))}
              </div>
            ))
          )}
        </aside>

        {/* Content */}
        <main className="docs-content">
          <div className="docs-eyebrow">{active.group}</div>
          <h1 className="docs-title">{active.title}</h1>
          <p className="docs-para">{active.body}</p>

          {active.code && (
            <div className="docs-code-block">
              <div className="docs-code-langs">
                {['javascript', 'python', 'go'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={l === lang ? 'docs-langbtn active' : 'docs-langbtn'}
                    onClick={() => setLang(l)}
                  >
                    {l === 'javascript' ? 'JavaScript' : l === 'python' ? 'Python' : 'Go'}
                  </button>
                ))}
              </div>
              <pre className="code-pre">{SNIPPETS[lang]}</pre>
            </div>
          )}

          <div className="docs-footlinks">
            <Link href="/" className="docs-footlink">← Back to homepage</Link>
            <Link href="/demo/" className="docs-footlink">Try the live demo →</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
