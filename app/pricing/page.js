'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useHomeHref } from '../useHomeHref';

const FREE_LIVE = 3;
const PRICE = 10;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://konduyt-api.onrender.com';

function calc(liveProjects) {
  const billable = Math.max(0, liveProjects - FREE_LIVE);
  return billable * PRICE;
}

export default function Pricing() {
  const homeHref = useHomeHref();
  const [live, setLive] = useState(4);
  const [subMsg, setSubMsg] = useState('');
  const [subBusy, setSubBusy] = useState(false);
  const [localCur, setLocalCur] = useState(null);
  const [localRate, setLocalRate] = useState(null);

  // Detect visitor currency + a live USD rate so the $10 shows in their money.
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const geo = await fetch('https://ipapi.co/json/').then((r) => r.json());
        if (off || !geo || !geo.currency || geo.currency === 'USD') return;
        const fx = await fetch('https://open.er-api.com/v6/latest/USD').then((r) => r.json());
        if (off) return;
        const rate = fx && fx.rates && fx.rates[geo.currency];
        if (rate) { setLocalCur(geo.currency); setLocalRate(rate); }
      } catch { /* stay in USD */ }
    })();
    return () => { off = true; };
  }, []);

  function localPrice(usd) {
    if (!localCur || !localRate) return null;
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: localCur, maximumFractionDigits: 0 }).format(usd * localRate);
    } catch { return `${localCur} ${Math.round(usd * localRate)}`; }
  }

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
        <Link href={homeHref} className="pricing-logo">Konduyt</Link>
        <div className="pricing-nav-links">
          <Link href={homeHref} className="pricing-navlink">Home</Link>
          <Link href="/signin/" className="pricing-navcta">Sign in</Link>
        </div>
      </nav>

      <div className="pricing-wrap">
        {/* Header */}
        <header className="pricing-head">
          <span className="pricing-eyebrow">Konduyt pricing</span>
          <h1 className="pricing-title">Simple to explain. Scales with your business.</h1>
          <p className="pricing-lede">
            No feature paywalls. Intelligence, routing, tax awareness, reconciliation.
            All of it comes with Konduyt. You pay for access, for the volume we move,
            and for more room when you outgrow the basics.
          </p>
        </header>

        {/* The single plan */}
        <section className="pricing-card-main">
          <div className="pricing-free">
            <div className="pricing-free-head">Free to start</div>
            <ul className="pricing-list">
              <li><span className="pricing-check">✓</span> Test mode. Always free, every project.</li>
              <li><span className="pricing-check">✓</span> 3 live projects. Free.</li>
              <li><span className="pricing-check">✓</span> Full SDK &amp; API. Nothing locked.</li>
              <li><span className="pricing-check">✓</span> Every payment provider Konduyt supports</li>
            </ul>
          </div>
          <div className="pricing-paid">
            <div className="pricing-paid-amount">
              <span className="pricing-dollar">$10</span>
              <span className="pricing-per">/ live project / month</span>
            </div>
            {localPrice(PRICE) && (
              <div className="pricing-local-price">≈ {localPrice(PRICE)} / live project / month</div>
            )}
            <p className="pricing-paid-note">
              Charged only for each additional live project beyond your 3 free. Test-mode projects never count.
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

        {/* The three economic layers */}
        <section className="pricing-layers">
          <div className="pricing-layers-title">How Konduyt pricing works</div>
          <div className="pricing-layers-grid">
            <div className="pricing-layer">
              <div className="pricing-layer-num">1</div>
              <div className="pricing-layer-name">Access</div>
              <div className="pricing-layer-price">$10 / project / month</div>
              <p className="pricing-layer-desc">
                The full product. No feature restrictions. Your first 3 live projects are free.
              </p>
            </div>
            <div className="pricing-layer">
              <div className="pricing-layer-num">2</div>
              <div className="pricing-layer-name">Usage</div>
              <div className="pricing-layer-price">
                0.25% per transaction
              </div>
              <p className="pricing-layer-desc">
                A small 0.25% fee on what we successfully move. Same rate for everyone, free
                or paid. Your provider still charges its own fee and still settles your money.
                We never touch it. Test payments and failed ones cost nothing.
              </p>
            </div>
            <div className="pricing-layer">
              <div className="pricing-layer-num">3</div>
              <div className="pricing-layer-name">Scale</div>
              <div className="pricing-layer-price">Higher-capacity plans</div>
              <p className="pricing-layer-desc">
                Outgrow the basics (throughput, rate limits, volume, an SLA) and you move to a
                bigger plan. More room, not more features. Enterprise pricing is custom.
              </p>
            </div>
          </div>
          <p className="pricing-layers-foot">
            You pay more because you use more, not because we hid something behind a wall.
            Intelligence, routing, tax awareness, reconciliation: always included.
          </p>
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
              One app or system connected to Konduyt. A mobile app, a SaaS product,
              a marketplace, a checkout page.
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
              Only active production projects count: live mode on, a real provider connected,
              real transactions happening. Test projects and archived ones are free.
            </p>
          </div>
        </section>

        {/* Why */}
        <section className="pricing-why">
          <h3 className="pricing-why-h">Why we price this way</h3>
          <p className="pricing-why-p">
            You&apos;re not paying for extra features. You&apos;re paying us to keep the
            plumbing working: provider integrations, API changes, webhooks, payment states,
            all of it. More apps means more plumbing on our end. So the cost follows how
            much you use, not what we decided to lock away.
          </p>
        </section>

        {/* Intelligence teaser — a separate future product */}
        <Link href="/labs/" className="pricing-intel" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
          <span className="pricing-intel-badge">In the works</span>
          <h3 className="pricing-intel-h">Konduyt Intelligence →</h3>
          <p className="pricing-intel-p">
            A separate product, built on the same infrastructure. Vendor performance,
            payment optimization, catching revenue leaks, market insight.
            Not part of this pricing. It&apos;s coming on its own.
          </p>
        </Link>

        <footer className="pricing-foot">
          <Link href={homeHref} className="pricing-navlink">← Back to Konduyt</Link>
        </footer>
      </div>
    </div>
  );
}
