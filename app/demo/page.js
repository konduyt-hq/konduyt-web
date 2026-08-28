'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const BASE_KES = 420000; // KES 4,200.00 in minor units

// M-Pesa's real cost is a flat tariff band (KES), not a percentage. Others use
// their real percentage rates. Each method appears ONCE — no "M-Pesa via X"
// duplication (a customer just picks M-Pesa).
function mpesaTariffMinor(kesMinor) {
  const kes = kesMinor / 100;
  const bands = [
    [100, 0], [500, 7], [1000, 13], [1500, 23], [2500, 33], [3500, 53],
    [5000, 57], [7500, 78], [10000, 90], [15000, 100], [20000, 105],
    [35000, 108], [50000, 108], [150000, 108],
  ];
  for (const [upper, tariff] of bands) if (kes <= upper) return tariff * 100;
  return 108 * 100;
}

// feeKesMinor(baseKesMinor) -> this method's charge in KES minor units.
const RAILS = [
  { id: 'mpesa', name: 'M-Pesa', feeKesMinor: (b) => mpesaTariffMinor(b), basis: 'M-Pesa tariff' },
  { id: 'pesalink', name: 'PesaLink', feeKesMinor: (b) => Math.round(b * 0.005), basis: '0.5%' },
  { id: 'card', name: 'Card', feeKesMinor: (b) => Math.round(b * 0.029), basis: '2.9%' },
  { id: 'applepay', name: 'Apple Pay', feeKesMinor: (b) => Math.round(b * 0.029), basis: '2.9%' },
  { id: 'paypal', name: 'PayPal', feeKesMinor: (b) => Math.round(b * 0.0349), basis: '3.49%' },
];

// Cost-based verdict only — no settlement/speed claims.
function verdict(rail, cheapestId, dearestId) {
  if (rail.id === cheapestId) return { label: 'Best value', kind: 'good' };
  if (rail.id === dearestId) return { label: 'Highest fee', kind: 'bad' };
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

  // Compute each method's real charge in KES, then convert to the display
  // currency. M-Pesa uses its tariff band; others use their percentage.
  const ranked = [...RAILS]
    .map((rail) => {
      const feeKes = rail.feeKesMinor(BASE_KES);
      const feeMinor = Math.round(feeKes * rate);
      return { ...rail, feeMinor, netMinor: displayAmount - feeMinor,
               effPct: Math.round((feeKes / BASE_KES) * 1000) / 10 };
    })
    .sort((a, b) => a.feeMinor - b.feeMinor);
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
            {country && fxStatus === 'live' && currency !== 'KES' && (
              <div className="demo-fx-note">Costs shown in {currency} for {country}, converted live from KES.</div>
            )}
            {fxStatus === 'native' && (
              <div className="demo-fx-note">Live rate unavailable. Showing native KES.</div>
            )}
          </div>

          <div className="demo-rail-table">
            <div className="demo-rail-row demo-rail-head demo-rail-row-3col">
              <span>Pay with</span><span>Transaction fee</span><span>Verdict</span>
            </div>
            {ranked.map((rail) => {
              const v = verdict(rail, cheapest.id, dearest.id);
              return (
                <div key={rail.id}
                  className={`demo-rail-row demo-rail-row-3col ${selected === rail.id ? 'sel' : ''} ${rail.id === cheapest.id ? 'best' : ''}`}
                  onClick={() => stage === 'form' && setSelected(rail.id)} role="button">
                  <span className="demo-rail-name">{rail.name}</span>
                  <span className="demo-rail-fee-cell">
                    <span className="demo-rail-cost">{fmt(rail.feeMinor, currency)}</span>
                    <span className="demo-rail-pct">{rail.effPct}%</span>
                  </span>
                  <span className={`demo-verdict demo-verdict-${v.kind}`}>{v.label}</span>
                </div>
              );
            })}
          </div>

          <div className="demo-saving">
            Lowest vs highest fee on this payment:
            <strong> you keep {fmt(savingMinor, currency)} more</strong> using {cheapest.name} instead of {dearest.name}.
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
                  <div className="receipt-row"><span>Method</span><span>{sel.name}</span></div>
                  <div className="receipt-row"><span>Fee</span><span>{fmt(sel.feeMinor, currency)} ({sel.effPct}%)</span></div>
                </div>
                <button className="pay-btn" onClick={reset} type="button">Run the demo again</button>
                <Link href="/" className="demo-done-link">Done</Link>
              </div>
            ) : (
              <>
                <div className="demo-selected-rail">
                  Paying with <strong>{sel.name}</strong> · {fmt(sel.feeMinor, currency)} fee ({sel.effPct}%)
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
                    <div className="demo-rail-inputnote">Selected from the intelligence panel: {sel.id === cheapest.id ? 'the cheapest rail' : 'your chosen rail'}.</div>
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
            Your customer sees the checkout. You get the intelligence: the cheapest rail, chosen automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
