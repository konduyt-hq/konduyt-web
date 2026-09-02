'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';
const REFERENCE_AMOUNT_KES = 420000; // KES 4,200.00 in minor units -- the reference price this demo quotes

// Cost-based verdict only — no settlement/speed claims.
function verdict(rail) {
  if (rail.recommended) return { label: 'Best value', kind: 'good' };
  return { label: 'An option', kind: 'neutral' };
}

function fmt(amountMinor, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
}

export default function DemoCheckout() {
  useEffect(() => { document.title = 'Konduyt Demo'; }, []);
  const [selected, setSelected] = useState(null);
  const [stage, setStage] = useState('form');
  const [phone, setPhone] = useState('');
  const [demo, setDemo] = useState(null); // the real /v1/demo/run response
  const [loadError, setLoadError] = useState(false);

  // Real data, not a client-side estimate: the backend does its own real
  // geo-detection (from the request itself, server-side) and returns the
  // visitor's actual country's real, sourced fee data where Konduyt has
  // it -- or Kenya's real data as an honestly-labelled representative
  // example otherwise. No client-side FX/geo logic needed here at all.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/v1/demo/run`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currency: 'KES', amount: REFERENCE_AMOUNT_KES }),
        });
        const data = await res.json();
        if (cancelled) return;
        setDemo(data);
        const opts = data?.intelligence?.options || [];
        if (opts.length) setSelected(opts[0].method);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const options = demo?.intelligence?.options || [];
  const displayAmount = demo?.payment?.amount ?? REFERENCE_AMOUNT_KES;
  const currency = demo?.payment?.currency ?? 'KES';
  const cheapest = options[0];
  const dearest = options[options.length - 1];
  const savingMinor = cheapest && dearest ? dearest.fee_minor - cheapest.fee_minor : 0;
  const sel = options.find((r) => r.method === selected) || cheapest;

  function pay() {
    if (stage === 'processing') return;
    setStage('processing');
    if (sel?.method === 'MPESA') {
      setTimeout(() => setStage('prompt'), 1200);
      setTimeout(() => setStage('success'), 4200);
    } else {
      setTimeout(() => setStage('success'), 2000);
    }
  }
  function reset() { setStage('form'); setPhone(''); }

  if (loadError) {
    return (
      <div className="demo-root">
        <div className="demo-topbar">
          <Link href="/" className="demo-back">← Back to Konduyt</Link>
        </div>
        <div className="demo-center"><p>Couldn&apos;t load the live demo right now — please try again shortly.</p></div>
      </div>
    );
  }

  if (!demo || !sel) {
    return (
      <div className="demo-root">
        <div className="demo-topbar">
          <Link href="/" className="demo-back">← Back to Konduyt</Link>
          <span className="demo-flag">Demo. No real charge.</span>
        </div>
        <div className="demo-center"><p>Loading real fee data for your location…</p></div>
      </div>
    );
  }

  return (
    <div className="demo-root">
      <div className="demo-topbar">
        <Link href="/" className="demo-back">← Back to Konduyt</Link>
        <span className="demo-flag">Demo. No real charge.</span>
      </div>

      <div className="demo-center demo-two-col">
        <div className="demo-intel">
          <div className="demo-intel-head">
            <h2 className="demo-intel-h">The intelligence layer</h2>
            <p className="demo-intel-sub">
              Same {fmt(displayAmount, currency)} payment, every available rail. Ranked cheapest-first.
              by real fees and settlement time. Konduyt puts your customer on the best one by default.
            </p>
            {demo.is_representative_example && (
              <div className="demo-fx-note">
                Showing Kenya&apos;s real connected-provider pricing as a representative example —
                Konduyt doesn&apos;t have sourced rail data for your detected location yet.
              </div>
            )}
          </div>

          <div className="demo-rail-table">
            <div className="demo-rail-row demo-rail-head demo-rail-row-3col">
              <span>Pay with</span><span>Transaction fee</span><span>Verdict</span>
            </div>
            {options.map((rail) => {
              const v = verdict(rail);
              return (
                <div key={rail.method}
                  className={`demo-rail-row demo-rail-row-3col ${selected === rail.method ? 'sel' : ''} ${rail.method === cheapest?.method ? 'best' : ''}`}
                  onClick={() => stage === 'form' && setSelected(rail.method)} role="button">
                  <span className="demo-rail-name">{rail.label}</span>
                  <span className="demo-rail-fee-cell">
                    {rail.estimated && rail.fee_minor_low != null ? (
                      <span className="demo-rail-cost">{fmt(rail.fee_minor_low, currency)}–{fmt(rail.fee_minor_high, currency)}</span>
                    ) : (
                      <span className="demo-rail-cost">{fmt(rail.fee_minor, currency)}</span>
                    )}
                    <span className="demo-rail-pct">{rail.fee_percent_effective}%{rail.estimated ? ' · estimated' : ''}</span>
                  </span>
                  <span className={`demo-verdict demo-verdict-${v.kind}`}>{v.label}</span>
                </div>
              );
            })}
          </div>

          {cheapest && dearest && cheapest !== dearest && (
            <div className="demo-saving">
              Lowest vs highest fee on this payment:
              <strong> you keep {fmt(savingMinor, currency)} more</strong> using {cheapest.label} instead of {dearest.label}.
            </div>
          )}
        </div>

        <div className="demo-checkout-col">
          <div className="checkout">
            <div className="checkout-head">
              <div className="merchant">
                <div className="merchant-avatar">RF</div>
                <div>
                  <div className="merchant-name">Rine Farm Feeds</div>
                  <div className="merchant-sub">Order #RF-2048</div>
                </div>
              </div>
              <div className="amount">
                <div className="amount-label">Amount due</div>
                <div className="amount-value">{fmt(displayAmount, currency)}</div>
              </div>
            </div>

            {stage === 'success' ? (
              <div className="pay-success">
                <div className="success-check">✓</div>
                <div className="success-title">Payment successful</div>
                <div className="success-sub">{fmt(displayAmount, currency)} paid via {sel.label}</div>
                <div className="success-receipt">
                  <div className="receipt-row"><span>Reference</span><span className="mono">KDU-PAY-8F2A91</span></div>
                  <div className="receipt-row"><span>Method</span><span>{sel.label}</span></div>
                  <div className="receipt-row"><span>Fee</span><span>{fmt(sel.fee_minor, currency)} ({sel.fee_percent_effective}%)</span></div>
                </div>
                <button className="pay-btn" onClick={reset} type="button">Run the demo again</button>
                <Link href="/" className="demo-done-link">Done</Link>
              </div>
            ) : (
              <>
                <div className="demo-selected-rail">
                  Paying with <strong>{sel.label}</strong> · {fmt(sel.fee_minor, currency)} fee ({sel.fee_percent_effective}%)
                </div>

                {sel.method === 'MPESA' ? (
                  <div className="field">
                    <label className="field-label">M-Pesa phone number</label>
                    <input className="field-input" inputMode="numeric" placeholder="07XX XXX XXX"
                      value={phone} onChange={(e) => setPhone(e.target.value)} disabled={stage !== 'form'} />
                  </div>
                ) : (
                  <div className="field">
                    <label className="field-label">{sel.label}</label>
                    <div className="demo-rail-inputnote">Selected from the intelligence panel: {sel.method === cheapest?.method ? 'the cheapest rail' : 'your chosen rail'}.</div>
                  </div>
                )}

                {stage === 'prompt' && sel.method === 'MPESA' && (
                  <div className="stk-prompt">
                    <div className="stk-spinner"></div>
                    <div>
                      <div className="stk-title">Check your phone</div>
                      <div className="stk-sub">Enter your M-Pesa PIN to authorize {fmt(displayAmount, currency)}.</div>
                    </div>
                  </div>
                )}

                <button className="pay-btn" onClick={pay} type="button"
                  disabled={stage === 'processing' || stage === 'prompt' || (sel.method === 'MPESA' && phone.replace(/\D/g, '').length < 9)}>
                  {stage === 'processing' ? 'Connecting…' : stage === 'prompt' ? 'Waiting for confirmation…' : `Pay ${fmt(displayAmount, currency)}`}
                </button>

                <div className="secured">by <strong>Konduyt.dev</strong> · Your money goes straight to the merchant</div>
              </>
            )}
          </div>
          <p className="demo-caption">
            Your customer sees the checkout. You get the intelligence: the cheapest rail, chosen automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
