// The reference application registry — the heart of the Sandbox.
//
// Each entry is a real application that consumes the public Konduyt API exactly
// like an external developer. An app only appears as "live" once it is actually
// built and only uses features Konduyt supports today. Apps that depend on
// capabilities Konduyt doesn't have yet are listed as "planned" with the exact
// capability they're waiting on — so the Sandbox never pretends.

export const REFERENCE_APPS = [
  {
    id: 'ecommerce',
    name: 'E-commerce',
    tagline: 'Electronics store — cart, checkout, receipts.',
    status: 'live',
    uses: ['One-time payments', 'Method-first checkout', 'Receipts'],
    repo: 'https://github.com/konduyt-hq/konduyt-reference-apps/tree/main/ecommerce',
    // A one-time-payment flow — fully supported today.
    requires: null,
  },
  {
    id: 'donations',
    name: 'Donations',
    tagline: 'Charity page — custom amounts, thank-you receipt.',
    status: 'planned',
    uses: ['One-time payments', 'Custom amounts'],
    repo: null,
    // Buildable today (one-time payments); simply not built yet.
    requires: 'Next to build — uses only features that exist today.',
  },
  {
    id: 'pos',
    name: 'Point of Sale',
    tagline: 'Coffee shop — cashier enters amount, customer pays.',
    status: 'planned',
    uses: ['One-time payments', 'Fast confirmation'],
    repo: null,
    requires: 'Buildable today — one-time payment flow.',
  },
  {
    id: 'digital-products',
    name: 'Digital Products',
    tagline: 'Sell an ebook — pay, instant download.',
    status: 'planned',
    uses: ['One-time payments', 'Instant fulfilment'],
    repo: null,
    requires: 'Buildable today — one-time payment flow.',
  },
  {
    id: 'invoices',
    name: 'Freelancer Invoices',
    tagline: 'Send an invoice — client pays, invoice marked paid.',
    status: 'planned',
    uses: ['One-time payments', 'Invoice tracking'],
    repo: null,
    requires: 'Buildable today — one-time payment flow.',
  },
  {
    id: 'ticketing',
    name: 'Event Ticketing',
    tagline: 'Conference tickets — limited quantity, QR delivery.',
    status: 'planned',
    uses: ['One-time payments', 'Inventory'],
    repo: null,
    requires: 'Buildable today — one-time payment flow.',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    tagline: 'Etsy-style — buy from a seller, platform takes commission.',
    status: 'blocked',
    uses: ['Split payments', 'Payouts'],
    repo: null,
    // Honestly blocked on a capability Konduyt does not have yet.
    requires: 'Begins when split payments exist.',
  },
  {
    id: 'saas',
    name: 'SaaS Subscriptions',
    tagline: 'Project tool — plans, recurring billing, upgrades.',
    status: 'blocked',
    uses: ['Subscriptions', 'Recurring billing'],
    repo: null,
    requires: 'Begins when subscriptions exist.',
  },
  {
    id: 'multi-region',
    name: 'Multi-region Merchant',
    tagline: 'One business, many markets and providers.',
    status: 'blocked',
    uses: ['Multiple connectors', 'Production routing', 'Failover'],
    repo: null,
    requires: 'Begins when multiple production connectors and routing exist.',
  },
];

export const STATUS_META = {
  live: { label: 'Live', note: 'Built and transacting through the real API.' },
  planned: { label: 'Buildable next', note: 'Uses only features that exist today.' },
  blocked: { label: 'Waiting on a feature', note: 'Begins when its capability ships.' },
};
