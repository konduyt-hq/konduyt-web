'use client';

import { useState } from 'react';
import Link from 'next/link';

const METHODS = [
  { id: 'mpesa', label: 'M-Pesa', hint: 'Pay with your phone' },
  { id: 'card', label: 'Card', hint: 'Visa, Mastercard' },
];

export default function DemoCheckout() {
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [card, setCard] = useState('');
  const [stage, setStage] = useState('form'); // form | processing | prompt | success

  const amount = 'KES 4,200.00';

  function pay() {
    if (stage === 'processing') return;
    setStage('processing');
    if (method === 'mpesa') {
      // Simulate STK push: brief processing, then a "check your phone" prompt,
      // then success.
      setTimeout(() => setStage('prompt'), 1200);
      setTimeout(() => setStage('success'), 4200);
    } else {
      setTimeout(() => setStage('success'), 2000);
    }
  }

  function reset() {
    setStage('form');
    setPhone('');
    setCard('');
  }

  const canPay =
    method === 'mpesa' ? phone.replace(/\D/g, '').length >= 9 : card.replace(/\D/g, '').length >= 12;

  return (
    <div className="demo-root">
      <div className="demo-topbar">
        <Link href="/" className="demo-back">← Back to Konduyt</Link>
        <span className="demo-flag">Test mode — no real charge</span>
      </div>

      <div className="demo-center">
        <div className="checkout">
          {/* Merchant header */}
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
              <div className="amount-value">{amount}</div>
            </div>
          </div>

          {stage === 'success' ? (
            <div className="pay-success">
              <div className="success-check">✓</div>
              <div className="success-title">Payment successful</div>
              <div className="success-sub">{amount} paid to Rine Farm Feeds</div>
              <div className="success-receipt">
                <div className="receipt-row"><span>Reference</span><span className="mono">KDU-PAY-8F2A91</span></div>
                <div className="receipt-row"><span>Method</span><span>{method === 'mpesa' ? 'M-Pesa' : 'Card'}</span></div>
                <div className="receipt-row"><span>Date</span><span>2 Aug 2026, 14:32</span></div>
              </div>
              <button className="pay-btn" onClick={reset} type="button">Run the demo again</button>
              <Link href="/" className="demo-done-link">Done</Link>
            </div>
          ) : (
            <>
              {/* Method selector */}
              <div className="method-tabs">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={m.id === method ? 'method-tab active' : 'method-tab'}
                    onClick={() => setMethod(m.id)}
                    disabled={stage !== 'form'}
                  >
                    <span className="method-label">{m.label}</span>
                    <span className="method-hint">{m.hint}</span>
                  </button>
                ))}
              </div>

              {/* Inputs */}
              {method === 'mpesa' ? (
                <div className="field">
                  <label className="field-label">M-Pesa phone number</label>
                  <input
                    className="field-input"
                    inputMode="numeric"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={stage !== 'form'}
                  />
                </div>
              ) : (
                <div className="field">
                  <label className="field-label">Card number</label>
                  <input
                    className="field-input"
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    value={card}
                    onChange={(e) => setCard(e.target.value)}
                    disabled={stage !== 'form'}
                  />
                </div>
              )}

              {/* Prompt (STK push simulation) */}
              {stage === 'prompt' && method === 'mpesa' && (
                <div className="stk-prompt">
                  <div className="stk-spinner"></div>
                  <div>
                    <div className="stk-title">Check your phone</div>
                    <div className="stk-sub">Enter your M-Pesa PIN to authorize {amount}.</div>
                  </div>
                </div>
              )}

              <button
                className="pay-btn"
                onClick={pay}
                type="button"
                disabled={!canPay || stage === 'processing' || stage === 'prompt'}
              >
                {stage === 'processing'
                  ? 'Connecting…'
                  : stage === 'prompt'
                  ? 'Waiting for confirmation…'
                  : `Pay ${amount}`}
              </button>

              <div className="secured">
                Secured by <strong>Konduyt</strong> · Your money goes straight to the merchant
              </div>
            </>
          )}
        </div>

        <p className="demo-caption">
          This is exactly what your customers see. No Konduyt branding required — it&apos;s your checkout.
        </p>
      </div>
    </div>
  );
}
