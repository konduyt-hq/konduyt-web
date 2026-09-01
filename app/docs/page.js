'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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

// Documentation sections — the searchable content. Reflects the real, current
// Konduyt architecture and product surface.
const DOCS = [
  {
    id: 'introduction',
    group: 'Getting started',
    title: 'Introduction',
    body: 'Konduyt is a payment orchestration layer. It connects providers like Paystack, Stripe, PayPal, Flutterwave, M-Pesa (Daraja), Razorpay and more to your product through one integration. You bring your own provider accounts. Konduyt routes and records payments. It never holds, receives, or settles your money. Funds always flow directly between the customer, the provider, and your own provider account.',
  },
  {
    id: 'how-it-works',
    group: 'Getting started',
    title: 'How it works',
    body: 'You connect your provider credentials once. When you create a payment, Konduyt selects the right provider for the method and country, executes the operation against that provider using your credentials, and records the result in an append-only ledger. A payment state machine tracks each payment from created through completed, failed or refunded. Konduyt is the conductor; your providers are the instruments.',
  },
  {
    id: 'architecture',
    group: 'Getting started',
    title: 'Architecture',
    body: 'The API is a FastAPI (Python 3.12) service deployed on Render, backed by Neon Postgres (EU/Frankfurt). The web app is Next.js on Cloudflare Pages. Authentication is token-based (JWT). Provider secret credentials are encrypted at rest with Fernet (authenticated AES). The transaction ledger is append-only for integrity. Konduyt Sentinel monitors provider fee pages and tax-authority rate pages for changes. Everything is organised around one idea: one integration, every provider, without touching your money.',
  },
  {
    id: 'quickstart',
    group: 'Getting started',
    title: 'Quickstart',
    body: 'Create a project in the dashboard to get your publishable and secret keys. Connect at least one provider (for Kenya, Paystack or M-Pesa). Then create your first payment from your server with your secret key, or drop the konduyt.js checkout onto your site with your publishable key.',
    code: true,
  },
  {
    id: 'authentication',
    group: 'Getting started',
    title: 'Authentication',
    body: 'Authenticate every server request with your project secret key as a Bearer token. Use the publishable key on the client, for checkout config and the embedded checkout. It exposes no secrets. Keys are issued per project at creation, and every Konduyt secret key is always live — there is no separate Konduyt-level test mode. What you connect underneath it can be live or your provider\'s own sandbox credentials instead: a project holds one connection per provider, in either mode. A payment routed through a sandbox connection is honestly recorded as a test payment; through a live connection, as live. Connect your provider\'s sandbox keys from the dashboard to test the real integration end to end before going live.',
  },
  {
    id: 'projects-keys',
    group: 'Getting started',
    title: 'Projects & keys',
    body: 'Each project has its own publishable and secret key and its own set of connected providers and merchant country. Both keys are generated at project creation. Your provider secret is encrypted before it is stored and is only decrypted in-memory to execute an operation you initiate.',
  },
  {
    id: 'env-vars',
    group: 'Getting started',
    title: 'Setting your key',
    body: 'A real key goes on your host as an environment variable, never hardcoded in source. Name the secret key KONDUYT_SECRET_KEY exactly, and read it from your server\'s environment at startup. Vercel, Render, Heroku, Fly.io, and any other host with real environment-variable settings all work the same way -- add a new variable in your project\'s dashboard, paste the key as its value, redeploy. Your publishable key isn\'t a secret -- it\'s safe to expose client-side -- but it\'s still worth setting as an environment variable too (e.g. KONDUYT_PUBLISHABLE_KEY): if your backend serves your frontend page, it needs a way to inject the key into what it sends the browser, and keeping both as env vars means one place to manage per environment instead of a value buried in source. Test with your provider\'s own sandbox credentials, connected from the dashboard, before you ever touch a live key -- this is real payments and real customer money once you switch.',
  },
  {
    id: 'create-payment',
    group: 'Payments',
    title: 'Create a payment',
    body: 'Create a payment with an amount (in minor units), currency, method and customer. Konduyt routes it to the best connected provider for that method and country and returns a unified payment object with the same shape across every provider: an authorization URL, or the provider-specific next step (M-Pesa STK push, card redirect, PayPal approval, Pix QR).',
    code: true,
  },
  {
    id: 'methods',
    group: 'Payments',
    title: 'Payment methods',
    body: 'Methods are country-aware. Konduyt maps a merchant country to eligible providers, and each provider to the methods it can serve: cards, M-Pesa and other mobile money, bank transfer, PesaLink, Apple Pay and Google Pay, PayPal, Pix, and more. Ask for a method; Konduyt picks the rail.',
  },
  {
    id: 'checkout',
    group: 'Payments',
    title: 'Embedded checkout',
    body: 'Drop konduyt.js onto any site and call Konduyt.checkout({ publishableKey, amount, currency, reference }). It renders a hosted-style popup with the available methods, each ranked cheapest-first with its fee and settlement time, the cheapest pre-selected. The popup never sees your secret key. Where the amount is decided server-side instead — a subscription, an invoice, a computed usage bill — create a payment session from your server first and call Konduyt.checkout({ sessionId }) instead; the browser never sees or can tamper with the amount. A React CheckoutModal is also available with a theme prop (accent, radius, font, logo) so you can match your own UI.',
  },
  {
    id: 'providers',
    group: 'Payments',
    title: 'Providers',
    body: 'Konduyt speaks to 23+ payment providers and a growing set of bank rails. Fully profiled providers include Paystack, Flutterwave, M-Pesa (Daraja), Stripe, PayPal, Razorpay, Mollie, GoCardless and Cashfree. For Kenya, Paystack and M-Pesa are the primary rails. Switch providers by changing a field. The rest of your code stays the same.',
  },
  {
    id: 'webhooks',
    group: 'Payments',
    title: 'Webhooks',
    body: 'Konduyt receives provider webhooks, verifies them, and normalizes the payloads across providers so you handle one shape. Payment state transitions are recorded in the ledger as they arrive. Konduyt also sends you a signed webhook when a payment you created changes status: set your endpoint URL from the dashboard (Settings), and you\'ll receive a one-time signing secret (whsec_...) -- store it server-side. Each delivery includes an X-Konduyt-Signature header: the HMAC-SHA256 hex digest of the raw request body, using your signing secret as the key. Recompute it the same way on your end and compare before trusting the payload. There are no retries yet if your endpoint is briefly down -- treat delivery as best-effort for now, and poll GET /v1/payments/{id} for anything you can\'t afford to miss.',
  },
  {
    id: 'idempotency',
    group: 'Payments',
    title: 'Idempotency',
    body: 'Pass an idempotency key when creating a payment to safely retry without creating duplicates. Konduyt stores the first result and returns it for any retry with the same key.',
  },
  {
    id: 'recurring',
    group: 'Payments',
    title: 'Recurring payments',
    body: 'Declare recurring: true when creating a payment session from your server, along with interval: \'monthly\' (the only interval supported today). The customer authorizes once through the checkout popup; Konduyt securely stores the resulting authorization and automatically bills the same amount every month using the provider\'s own recurring-charge capability. A failed automatic charge is retried daily; after repeated failures the project owner is notified. Recurring intent is declared once, server-side, at session creation — never something the browser or the checkout options can change. Today this works with providers whose connector supports storing and charging a saved authorization.',
  },
  {
    id: 'payment-links',
    group: 'Payments',
    title: 'Payment links',
    body: 'A payment link is a long-lived, shareable URL you send a customer directly — email, WhatsApp, SMS — never embedded on your own site. Create one from your server with an amount, currency and optional description; Konduyt returns a URL hosted on konduyt.dev. Unlike a checkout session, a link has no 30-minute expiry by default: an invoice needs to survive being opened whenever the customer gets to it. Once paid, a link is marked paid and further visits are honestly refused — this is invoice semantics, a link for one specific bill, not a reusable donate-or-tip-jar link.',
  },
  {
    id: 'marketplace',
    group: 'Payments',
    title: 'Marketplace payments',
    body: 'One checkout, proceeds split across multiple sellers — orchestrated using the connected provider\'s own real split-payment capability. Konduyt never holds funds or redistributes them internally; the provider performs the actual split. Register each seller\'s provider-specific sub-account reference once (a Paystack subaccount code, a Stripe connected account id, and so on — created directly with the provider through its own onboarding, never by Konduyt on your behalf), then pass a list of seller/amount splits when creating the payment. Whatever isn\'t allocated to a seller is your own commission, handled entirely by the provider\'s own mechanics. Support varies meaningfully by provider — check a connector\'s real, verified capability, including its exact requirements, before building against it. Never assume support from a provider\'s general marketplace documentation.',
  },
  {
    id: 'routing',
    group: 'Intelligence',
    title: 'Routing intelligence',
    body: 'Konduyt ranks the rails that can serve a payment using published facts: each provider\'s fees, its settlement time, and the customer\'s location (which selects domestic vs cross-border fees and triggers FX). It is smart from the first transaction; it needs no history. Ranking is cheapest-first, with the settlement time shown so you can trade cost against speed.',
  },
  {
    id: 'failover',
    group: 'Intelligence',
    title: 'Failover & rerouting',
    body: 'For a payment method, configure more than one provider — a primary, and one or more fallbacks, in order, from the dashboard\'s Payment Providers tab. If the primary fails in a way that\'s genuinely safe to retry elsewhere — it was unreachable, or it rejected the request before creating anything — Konduyt automatically tries the next configured provider. If the outcome is ambiguous instead — a timeout, an unclear response — Konduyt stops and never guesses; guessing wrong is exactly how a customer ends up double-charged. Every attempt, safe or not, is recorded and available on the payment record.',
  },
  {
    id: 'fee-model',
    group: 'Intelligence',
    title: 'Fee & settlement model',
    body: 'A sourced, versioned model of real 2026 rates for profiled providers: per-method percentage and fixed fees, caps, cross-border surcharges, FX spread, and a settlement bucket (instant, T+1, T+2, T+3). Foreign-currency fixed fees are flagged rather than converted with an invented rate. Unprofiled providers are never shown as free.',
  },
  {
    id: 'sentinel',
    group: 'Intelligence',
    title: 'Konduyt Sentinel',
    body: 'Sentinel watches provider fee pages and tax-authority rate pages. It fetches, normalizes, hashes and compares; only on a real change does it extract, diff and assess materiality, then alert a human via Telegram for review. It detects and records. It never silently changes the numbers your routing depends on.',
  },
  {
    id: 'taxes',
    group: 'Intelligence',
    title: 'Tax awareness',
    body: 'Konduyt shows reference consumption-tax rates (VAT / GST / sales tax) for 186 countries, following the customer\'s country. It is awareness, not a filing and not tax advice: rates are the standard national rate, clearly flagged where unverified, and shown as N/A where no single national rate exists. Per-payment, you see the countries you received from, the reference tax on each, filing cycles, and how-to-pay guidance.',
  },
  {
    id: 'money',
    group: 'Dashboard',
    title: 'Money',
    body: 'The Money view splits your real transaction volume by connected provider: volume, transaction count, share. Read straight from the ledger. It is empty until real payments exist; Konduyt never fabricates figures.',
  },
  {
    id: 'errors',
    group: 'Reference',
    title: 'Errors',
    body: 'Konduyt uses standard HTTP status codes: 2xx success, 4xx for request errors such as invalid keys or parameters, 5xx for provider-side failures. Every error response has the same shape: { detail: { error, message, request_id } } -- error is a stable, machine-readable code your code can branch on, message is for humans, request_id is unique to that one call. When no provider is connected for a method, Konduyt returns a clear no_provider_connected error rather than a fake success. POST /v1/payments, /v1/payment_sessions, and /v1/marketplace_payments are rate-limited per project (429 rate_limited once exceeded) -- all three also accept an Idempotency-Key header, so a network retry with the same key returns the original result instead of creating a duplicate.',
  },
  {
    id: 'api-reference',
    group: 'Reference',
    title: 'API Reference',
    body: 'Konduyt\'s full API reference is generated directly from the API itself, so it can\'t drift from what\'s actually deployed: an interactive explorer at konduyt-api.onrender.com/docs, and the raw OpenAPI spec at konduyt-api.onrender.com/openapi.json for generating your own client or importing into Postman/Insomnia. For Node.js/TypeScript, the official konduyt SDK (npm install konduyt) wraps the core payment endpoints with real types, automatic retry, and automatic idempotency-key handling -- see github.com/konduyt-hq/konduyt-node.',
  },
  {
    id: 'security',
    group: 'Reference',
    title: 'Security',
    body: 'Encryption in transit (TLS) and at rest for secret credentials (Fernet/AES), token-based auth, least-privilege provider access, and an append-only ledger. Konduyt never stores raw card data. That stays with the PCI-compliant providers you connect. Konduyt stores only the payment metadata needed to route and record a payment.',
  },
];

const GROUPS = ['Getting started', 'Payments', 'Intelligence', 'Dashboard', 'Reference'];

export default function Docs() {
  return (
    <Suspense fallback={null}>
      <DocsInner />
    </Suspense>
  );
}

function DocsInner() {
  const searchParams = useSearchParams();
  const requestedDoc = searchParams.get('doc');
  useEffect(() => { document.title = 'Konduyt Docs'; }, []);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(
    requestedDoc && DOCS.some((d) => d.id === requestedDoc) ? requestedDoc : 'introduction'
  );
  const [lang, setLang] = useState('javascript');
  const [homeHref, setHomeHref] = useState('/');
  useEffect(() => { try { if (localStorage.getItem('kdu_token')) setHomeHref('/dashboard/'); } catch (e) {} }, []);

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
        <Link href={homeHref} className="docs-brand">
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
        <Link href={homeHref} className="docs-home-link">← Home</Link>
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
            <Link href={homeHref} className="docs-footlink">← Back to homepage</Link>
            <Link href="/demo/" className="docs-footlink">Try the live demo →</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
