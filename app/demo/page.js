'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const BASE_KES = 420000; // KES 4,200.00 in minor units

const RAILS = [
  { id: 'pesalink', name: 'PesaLink', via: 'Equity Bank', fee: 0.5, speed: 'Instant', speedRank: 0 },
  { id: 'mpesa', name: 'M-Pesa', via: 'Daraja', fee: 0.75, speed: 'Instant', speedRank: 0 },
  { id: 'bank', name: 'Bank Transfer', via: 'Flutterwave', fee: 1.4, speed: 'Next day', speedRank: 1 },
  { id: 'mpesa_ps', name: 'M-Pesa', via: 'Paystack', fee: 1.5, speed: 'Next day', speedRank: 1 },
  { id: 'card', name: 'Cards', via: 'Paystack', fee: 2.9, speed: 'Next day', speedRank: 1 },
  { id: 'applepay', name: 'Apple Pay', via: 'Stripe', fee: 2.9, speed: '2 days', speedRank: 2 },
  { id: 'paypal', name: 'PayPal', via: 'PayPal', fee: 3.49, speed: 'Instant', speedRank: 0 },
];

// Human labels for the recommendation, separate from the raw fee.
function verdict(rail, cheapestId, dearestId) {
  if (rail.id === cheapestId) return { label: 'Recommended', kind: 'good' };
  if (rail.id === dearestId) return { label: 'Not recommended', kind: 'bad' };
  if (rail.speedRank === 0) return { label: 'Fastest', kind: 'fast' };
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
  const [selected, setSelected] = useState('pesalink');
  const [stage, setStage] = useState('form');
  const [phone, setPhone] = useState('');

  const [currency, setCurrency] = useState('KES');
  const [rate, setRate] = useState(1);
  const [country, setCountry] = useState(null);
  const [fxStatus, setFxStatus] = useState('loading'); // loading | live | native

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      try {
        const geo = await fetch('https://ipapi.co/json/').then((r) => r.json());
        if (cancelled) return;
        const cur = geo && geo.currency ? geo.currency : 'KES';
        setCountry(geo && geo.country_name ? geo.country_name : null);
        if (cur === 'KES') { setCurrency('KES'); setRate(1); setFxStatus('live'); return; }
        const fx = await fetch('https://open.er-api.com/v6/latest/KES').then((r) => r.json());
        if (cancelled) return;
        const r = fx && fx.rates && fx.rates[cur];
        if (r) { setCurrency(cur); setRate(r); setFxStatus('live'); }
        else { setCurrency('KES'); setRate(1); setFxStatus('native'); }
      } catch {
        if (!cancelled) { setCurrency('KES'); setRate(1); setFxStatus('native'); }
      }
    }
    detect();
    return () => { cancelled = true; };
  }, []);

  const displayAmount = Math.round(BASE_KES * rate);

  const ranked = [...RAILS].sort((a, b) => a.fee - b.fee).map((rail) => {
    const feeMinor = Math.round(displayAmount * (rail.fee / 100));
    return { ...rail, feeMinor, netMinor: displayAmount - feeMinor };
  });
  const cheapest = ranked[0];
  const dearest = ranked[ranked.length - 1];
  const savingMinor = dearest.feeMinor - cheapest.feeMinor;

  function pay() {
    if (stage === 'processing') return;
    setStage('processing');
    if (selected.startsWith('mpesa')) {
      setTimeout(() => setStage('prompt'), 1200);
      setTimeout(() => setStage('success'), 4200);
    } else {
      setTimeout(() => setStage('success'), 2000);
    }
  }
  function reset() { setStage('form'); setPhone(''); }

  const sel = ranked.find((r) => r.id === selected) || ranked[0];

  return (
    <div className="demo-root">
      <div className="demo-topbar">
        <Link href="/" className="demo-back">← Back to Konduyt</Link>
        <span className="demo-flag">Demo — no real charge</span>
      </div>

      <div className="demo-center demo-two-col">
        <div className="demo-intel">
          <div className="demo-intel-head">
            <h2 className="demo-intel-h">The intelligence layer</h2>
            <p className="demo-intel-sub">
              Same {fmt(displayAmount, currency)} payment, every available rail — ranked cheapest-first
              by real fees and settlement time. Konduyt puts your customer on the best one by default.
            </p>
            {country && fxStatus === 'live' && currency !== 'KES' && (
              <div className="demo-fx-note">Costs shown in {currency} for {country} — converted live from KES.</div>
            )}
            {fxStatus === 'native' && (
              <div className="demo-fx-note">Live rate unavailable — showing native KES.</div>
            )}
          </div>

          <div className="demo-rail-table">
            <div className="demo-rail-row demo-rail-head">
              <span>Rail</span><span>Transaction fee</span><span>Speed</span><span>Verdict</span>
            </div>
            {ranked.map((rail) => {
              const v = verdict(rail, cheapest.id, dearest.id);
              return (
                <div key={rail.id}
                  className={`demo-rail-row ${selected === rail.id ? 'sel' : ''} ${rail.id === cheapest.id ? 'best' : ''}`}
                  onClick={() => stage === 'form' && setSelected(rail.id)} role="button">
                  <span className="demo-rail-name">
                    {rail.name} <span className="demo-rail-via">via {rail.via}</span>
                  </span>
                  <span className="demo-rail-fee-cell">
                    <span className="demo-rail-cost">{fmt(rail.feeMinor, currency)}</span>
                    <span className="demo-rail-pct">{rail.fee}%</span>
                  </span>
                  <span className="demo-rail-speed">{rail.speed}</span>
                  <span className={`demo-verdict demo-verdict-${v.kind}`}>{v.label}</span>
                </div>
              );
            })}
          </div>

          <div className="demo-saving">
            Cheapest vs most expensive on this payment:
            <strong> you keep {fmt(savingMinor, currency)} more</strong> routing to {cheapest.name} instead of {dearest.name}.
          </div>
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
                <div className="success-sub">{fmt(displayAmount, currency)} paid via {sel.name}</div>
                <div className="success-receipt">
                  <div className="receipt-row"><span>Reference</span><span className="mono">KDU-PAY-8F2A91</span></div>
                  <div className="receipt-row"><span>Rail</span><span>{sel.name} · {sel.via}</span></div>
                  <div className="receipt-row"><span>Fee</span><span>{fmt(sel.feeMinor, currency)} ({sel.fee}%)</span></div>
                </div>
                <button className="pay-btn" onClick={reset} type="button">Run the demo again</button>
                <Link href="/" className="demo-done-link">Done</Link>
              </div>
            ) : (
              <>
                <div className="demo-selected-rail">
                  Paying with <strong>{sel.name}</strong> via {sel.via} · {sel.fee}% fee · {sel.speed}
                </div>

                {selected.startsWith('mpesa') ? (
                  <div className="field">
                    <label className="field-label">M-Pesa phone number</label>
                    <input className="field-input" inputMode="numeric" placeholder="07XX XXX XXX"
                      value={phone} onChange={(e) => setPhone(e.target.value)} disabled={stage !== 'form'} />
                  </div>
                ) : (
                  <div className="field">
                    <label className="field-label">{sel.name}</label>
                    <div className="demo-rail-inputnote">Selected from the intelligence panel — {sel.id === cheapest.id ? 'the cheapest rail' : 'your chosen rail'}.</div>
                  </div>
                )}

                {stage === 'prompt' && selected.startsWith('mpesa') && (
                  <div className="stk-prompt">
                    <div className="stk-spinner"></div>
                    <div>
                      <div className="stk-title">Check your phone</div>
                      <div className="stk-sub">Enter your M-Pesa PIN to authorize {fmt(displayAmount, currency)}.</div>
                    </div>
                  </div>
                )}

                <button className="pay-btn" onClick={pay} type="button"
                  disabled={stage === 'processing' || stage === 'prompt' || (selected.startsWith('mpesa') && phone.replace(/\D/g, '').length < 9)}>
                  {stage === 'processing' ? 'Connecting…' : stage === 'prompt' ? 'Waiting for confirmation…' : `Pay ${fmt(displayAmount, currency)}`}
                </button>

                <div className="secured">by <strong>Konduyt.dev</strong> · Your money goes straight to the merchant</div>
              </>
            )}
          </div>
          <p className="demo-caption">
            Your customer sees the checkout. You get the intelligence — the cheapest rail, chosen automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
