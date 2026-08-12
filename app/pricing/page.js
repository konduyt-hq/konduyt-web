'use client';

import { useState } from 'react';
import Link from 'next/link';

const FREE_LIVE = 3;
const PRICE = 10;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://konduyt-api.onrender.com';

function calc(liveProjects) {
  const billable = Math.max(0, liveProjects - FREE_LIVE);
  return billable * PRICE;
}

export default function Pricing() {
  const [live, setLive] = useState(4);
  const [subMsg, setSubMsg] = useState('');
  const [subBusy, setSubBusy] = useState(false);

  async function subscribe() {
    // Requires a signed-in user; if not signed in, send to signup first.
    const token = typeof window !== 'undefined' ? localStorage.getItem('kdu_token') : null;
    if (!token) { window.location.href = '/signup/'; return; }
    if (calc(live) <= 0) { window.location.href = '/signup/'; return; }
    setSubBusy(true); setSubMsg('');
    try {
      const r = await fetch(`${API_BASE}/billing/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ live_projects: live, currency: 'USD' }),
      });
      const d = await r.json();
      if (d.ok && d.authorization_url) {
        window.location.href = d.authorization_url; // redirect to Paystack
      } else {
        setSubMsg(d.detail || d.error || 'Could not start checkout. Please try again.');
      }
    } catch (e) {
      setSubMsg('Could not reach billing. Please try again.');
    } finally {
      setSubBusy(false);
    }
  }

  return (
    <div className="pricing-root">
      {/* Nav */}
      <nav className="pricing-nav">
        <Link href="/" className="pricing-logo">Konduyt</Link>
        <div className="pricing-nav-links">
          <Link href="/" className="pricing-navlink">Home</Link>
          <Link href="/signin/" className="pricing-navcta">Sign in</Link>
        </div>
      </nav>

      <div className="pricing-wrap">
        {/* Header */}
        <header className="pricing-head">
          <span className="pricing-eyebrow">KONDUYTbuild pricing</span>
          <h1 className="pricing-title">One price. Every provider. No tiers.</h1>
          <p className="pricing-lede">
            No Developer, Team, or Enterprise plans. Everyone runs on the same Konduyt
            infrastructure with the same API and dashboard. You only pay for active
            production projects.
          </p>
        </header>

        {/* The single plan */}
        <section className="pricing-card-main">
          <div className="pricing-free">
            <div className="pricing-free-head">Free to start</div>
            <ul className="pricing-list">
              <li><span className="pricing-check">✓</span> Test mode — always free, every project</li>
              <li><span className="pricing-check">✓</span> 3 live projects — free</li>
              <li><span className="pricing-check">✓</span> Full SDK &amp; API — no feature restrictions</li>
              <li><span className="pricing-check">✓</span> Every payment provider Konduyt supports</li>
            </ul>
          </div>
          <div className="pricing-paid">
            <div className="pricing-paid-amount">
              <span className="pricing-dollar">$10</span>
              <span className="pricing-per">/ live project / month</span>
            </div>
            <p className="pricing-paid-note">
              Charged only for each additional live project beyond your 3 free. Test-mode
              projects never count.
            </p>
            <button className="pricing-start-btn" onClick={subscribe} type="button" disabled={subBusy}>
              {subBusy ? 'Starting checkout…' : calc(live) > 0 ? 'Subscribe' : 'Get started'}
            </button>
            {subMsg && <div className="pricing-sub-msg">{subMsg}</div>}
          </div>
        </section>

        {/* Interactive calculator */}
        <section className="pricing-calc">
          <div className="pricing-calc-title">Estimate your cost</div>
          <div className="pricing-calc-row">
            <label className="pricing-calc-label">Live projects</label>
            <div className="pricing-calc-control">
              <button
                className="pricing-step"
                onClick={() => setLive((n) => Math.max(0, n - 1))}
                type="button"
                aria-label="Fewer"
              >−</button>
              <span className="pricing-calc-num">{live}</span>
              <button
                className="pricing-step"
                onClick={() => setLive((n) => n + 1)}
                type="button"
                aria-label="More"
              >+</button>
            </div>
          </div>
          <div className="pricing-calc-out">
            <div className="pricing-calc-breakdown">
              {live <= FREE_LIVE ? (
                <span>All {live} project{live === 1 ? '' : 's'} are within your free allowance.</span>
              ) : (
                <span>
                  {FREE_LIVE} free + {live - FREE_LIVE} billable × ${PRICE}
                </span>
              )}
            </div>
            <div className="pricing-calc-total">
              ${calc(live)}<span className="pricing-calc-mo">/mo</span>
            </div>
          </div>
        </section>

        {/* Examples */}
        <section className="pricing-examples">
          <div className="pricing-ex-title">Examples</div>
          <div className="pricing-ex-grid">
            {[
              [3, 'All free'],
              [4, '$10'],
              [8, '$50'],
              [10, '$70'],
            ].map(([n, label]) => (
              <div className="pricing-ex" key={n}>
                <div className="pricing-ex-n">{n} live</div>
                <div className="pricing-ex-price">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* What counts */}
        <section className="pricing-what">
          <div className="pricing-what-col">
            <h3 className="pricing-what-h">What a project is</h3>
            <p className="pricing-what-p">
              One application or system connected to Konduyt — a mobile app, a SaaS product,
              a marketplace, or a website checkout.
            </p>
          </div>
          <div className="pricing-what-col">
            <h3 className="pricing-what-h">What isn&apos;t a project</h3>
            <p className="pricing-what-p">
              Environments, API keys, users, and individual payment attempts are not projects.
              You never pay per key or per transaction.
            </p>
          </div>
          <div className="pricing-what-col">
            <h3 className="pricing-what-h">When a project is billable</h3>
            <p className="pricing-what-p">
              Only active production projects count — those with live mode enabled, a production
              provider connected, or real transactions. Test-mode and archived projects are free.
            </p>
          </div>
        </section>

        {/* Why */}
        <section className="pricing-why">
          <h3 className="pricing-why-h">Why we price this way</h3>
          <p className="pricing-why-p">
            The value isn&apos;t extra features — it&apos;s Konduyt maintaining the payment
            infrastructure behind your apps: provider integrations, API changes, normalized
            payment flows, webhook handling and payment-state management. More applications mean
            more infrastructure we maintain on your behalf, so cost scales with active projects,
            not with locked-away features.
          </p>
        </section>

        {/* Intelligence teaser — a separate future product */}
        <Link href="/labs/" className="pricing-intel" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
          <span className="pricing-intel-badge">In the works</span>
          <h3 className="pricing-intel-h">Konduyt Intelligence →</h3>
          <p className="pricing-intel-p">
            A separate product, built on top of the same infrastructure: vendor performance
            analysis, payment optimization, revenue-leakage detection and market insights.
            Not part of KONDUYTbuild pricing — it&apos;s coming as its own thing.
          </p>
        </Link>

        <footer className="pricing-foot">
          <Link href="/" className="pricing-navlink">← Back to Konduyt</Link>
        </footer>
      </div>
    </div>
  );
}
