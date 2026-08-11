'use client';

import Link from 'next/link';

export default function Labs() {
  return (
    <div className="labs-root">
      {/* Nav */}
      <nav className="labs-nav">
        <Link href="/" className="labs-logo">Konduyt</Link>
        <div className="labs-nav-links">
          <Link href="/" className="labs-navlink">Home</Link>
          <Link href="/pricing/" className="labs-navlink">Pricing</Link>
          <Link href="/signup/" className="labs-navcta">Start for free</Link>
        </div>
      </nav>

      <div className="labs-wrap">
        <header className="labs-head">
          <span className="labs-eyebrow">KONDUYT LABS</span>
          <h1 className="labs-h1">Konduyt Intelligence</h1>
          <p className="labs-sub">
            The routing layer already knows every provider&apos;s fees, settlement times and
            reach. Intelligence turns that knowledge into decisions — so every payment takes the
            cheapest, fastest rail that actually works for your customer.
          </p>
        </header>

        <section className="labs-grid">
          <article className="labs-card">
            <h3>Smart routing</h3>
            <p>
              Every checkout ranks the available rails cheapest-first, using published fees plus
              settlement time and the customer&apos;s location. Your customer lands on the best
              option by default — no history required, smart from the first transaction.
            </p>
          </article>
          <article className="labs-card">
            <h3>Fee &amp; settlement model</h3>
            <p>
              A sourced, versioned model of real 2026 rates across every connected provider —
              local and cross-border fees, FX spread, and settlement buckets. When a provider
              changes its pricing, Konduyt Sentinel catches it.
            </p>
          </article>
          <article className="labs-card">
            <h3>Konduyt Sentinel</h3>
            <p>
              An always-on watcher on provider fee pages and tax-authority rate pages. It fetches,
              normalises, hashes and diffs — and only alerts a human when a real rate or fee moves.
              No silent drift in the numbers your routing depends on.
            </p>
          </article>
          <article className="labs-card">
            <h3>Tax awareness</h3>
            <p>
              Reference consumption-tax rates for 186 countries, following the customer&apos;s
              country, with filing cycles so you batch into the period instead of paying
              repetitively. Awareness, not a filing — and honest where a rate isn&apos;t confirmed.
            </p>
          </article>
          <article className="labs-card">
            <h3>Revenue-leakage detection</h3>
            <p>
              Money split by provider from the real ledger, so you can see where volume flows and
              where a cheaper rail would have saved you. The gap between what you paid and what you
              could have paid, made visible.
            </p>
          </article>
          <article className="labs-card">
            <h3>Market insights</h3>
            <p>
              Which methods your customers actually reach for, by country — the shape of your
              payment demand, drawn from real transactions rather than guesswork.
            </p>
          </article>
        </section>

        <section className="labs-status">
          <span className="labs-status-badge">In the works</span>
          <p>
            Parts of Intelligence already run inside the Konduyt dashboard today — routing, the fee
            model, Sentinel and tax awareness are live. The standalone Intelligence product,
            packaging these into insights and alerts of their own, is being built next.
          </p>
        </section>

        <footer className="labs-foot">
          <Link href="/" className="labs-navlink">← Back to Konduyt</Link>
          <Link href="/pricing/" className="labs-navlink">See pricing →</Link>
        </footer>
      </div>
    </div>
  );
}
