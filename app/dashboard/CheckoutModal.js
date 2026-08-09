'use client';
import { useState, useEffect } from 'react';

// The Konduyt checkout modal — what the END CUSTOMER sees after clicking "Pay"
// on the developer's site. Embedded overlay (drop-in), not a hosted redirect.
//
// Props:
//   open        - whether the modal is shown
//   onClose     - close handler
//   merchant    - merchant/business display name
//   amount      - integer minor units (e.g. 150000 = KES 1,500.00)
//   currency    - ISO code (KES, USD, ...)
//   methods     - [{ id, name, treatment, available_via:[{name}] }] the customer can pay with
//   reference   - the payment reference (shown subtly)
//   onPay       - async (methodId) => { ok, next, message } ; drives the real next step
//   preview     - if true, shows a small "Preview" ribbon (dashboard preview mode)

const CURRENCY_SYMBOL = { KES: 'KSh', USD: '$', GBP: '£', EUR: '€', NGN: '₦', GHS: '₵', ZAR: 'R', INR: '₹', BRL: 'R$' };

function formatAmount(amount, currency) {
  const major = (Number(amount) || 0) / 100;
  const sym = CURRENCY_SYMBOL[currency] || (currency ? currency + ' ' : '');
  return `${sym}${major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// A tiny inline glyph per method category so the list reads visually.
function methodGlyph(id) {
  const map = {
    mpesa: '📱', airtel_money: '📱', mtn_momo: '📱',
    card: '💳',
    apple_pay: '', google_pay: 'G', samsung_pay: 'S',
    paypal_wallet: 'P', amazon_pay: 'a', alipay: '支', wechat_pay: '微',
    bank_transfer: '🏦', rtgs: '🏦', pesalink: '🏦', ach: '🏦', sepa: '🏦',
    eft: '🏦', wire_transfer: '🏦', pix: '⚡', upi: '⚡', ideal: '🏦', faster_payments: '⚡',
  };
  return map[id] ?? '•';
}

export default function CheckoutModal({
  open, onClose, merchant = 'Acme Store', amount = 150000, currency = 'KES',
  methods = [], reference = 'kdu_ref_preview', onPay, preview = false,
}) {
  const [selected, setSelected] = useState(null);
  const [stage, setStage] = useState('select'); // select | processing | next | done | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) { setSelected(null); setStage('select'); setMessage(''); }
  }, [open]);

  if (!open) return null;

  const payable = methods.filter((m) => m.connectable !== false);

  async function handlePay() {
    if (!selected) return;
    setStage('processing');
    setMessage('');
    try {
      const res = onPay ? await onPay(selected) : { ok: true, next: 'redirect', message: 'Demo: no live provider connected.' };
      if (res && res.ok) {
        setStage('next');
        setMessage(res.message || nextStepText(selected));
      } else {
        setStage('error');
        setMessage((res && res.message) || 'Could not start the payment.');
      }
    } catch (e) {
      setStage('error');
      setMessage('Something went wrong starting the payment.');
    }
  }

  function nextStepText(methodId) {
    if (methodId === 'mpesa') return 'An M-Pesa STK push would be sent to the customer’s phone to authorise payment.';
    if (['apple_pay', 'google_pay', 'samsung_pay'].includes(methodId)) return 'The device wallet sheet would open for the customer to confirm.';
    if (methodId === 'card') return 'The customer would enter card details on the secure card form.';
    if (['bank_transfer', 'rtgs', 'pesalink', 'ach', 'sepa', 'eft', 'wire_transfer', 'faster_payments'].includes(methodId)) return 'The customer would be shown bank transfer instructions / their bank’s authorisation flow.';
    if (methodId === 'paypal_wallet') return 'The customer would be redirected to PayPal to approve the payment.';
    if (['pix'].includes(methodId)) return 'A Pix QR code would be shown for the customer to scan.';
    if (['upi'].includes(methodId)) return 'A UPI collect request / QR would be shown for the customer to approve.';
    return 'The customer would be taken to the provider’s secure step to complete payment.';
  }

  const selMethod = payable.find((m) => m.id === selected);

  return (
    <div className="ckt-overlay" onClick={onClose}>
      <div className="ckt-modal" onClick={(e) => e.stopPropagation()}>
        {preview && <div className="ckt-preview-ribbon">Preview</div>}
        <button className="ckt-close" type="button" onClick={onClose} aria-label="Close">✕</button>

        {/* Header: merchant + amount */}
        <div className="ckt-head">
          <div className="ckt-merchant">{merchant}</div>
          <div className="ckt-amount">{formatAmount(amount, currency)}</div>
          <div className="ckt-ref">Ref: {reference}</div>
        </div>

        {stage === 'select' && (
          <>
            <div className="ckt-section-label">Choose how to pay</div>
            {payable.length === 0 ? (
              <div className="ckt-empty">
                No payment methods are available yet. The merchant needs to connect a provider.
              </div>
            ) : (
              <div className="ckt-methods">
                {payable.map((m) => {
                  const via = (m.available_via || [])[0];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`ckt-method ${selected === m.id ? 'sel' : ''}`}
                      onClick={() => setSelected(m.id)}
                    >
                      <span className="ckt-method-glyph"></span>
                      <span className="ckt-method-text">
                        <span className="ckt-method-name">{m.name}</span>
                        {via && <span className="ckt-method-via">via {via.name}</span>}
                      </span>
                      <span className={`ckt-radio ${selected === m.id ? 'on' : ''}`} />
                    </button>
                  );
                })}
              </div>
            )}
            <button
              className="ckt-pay-btn"
              type="button"
              disabled={!selected}
              onClick={handlePay}
            >
              {selected ? `Pay ${formatAmount(amount, currency)}` : 'Select a method'}
            </button>
          </>
        )}

        {stage === 'processing' && (
          <div className="ckt-processing">
            <div className="ckt-spinner" />
            <div>Starting your payment…</div>
          </div>
        )}

        {stage === 'next' && (
          <div className="ckt-next">
            <div className="ckt-next-icon">→</div>
            <div className="ckt-next-title">{selMethod ? selMethod.name : 'Payment'} — next step</div>
            <p className="ckt-next-msg">{message}</p>
            <button className="ckt-pay-btn" type="button" onClick={onClose}>Done</button>
          </div>
        )}

        {stage === 'error' && (
          <div className="ckt-next">
            <div className="ckt-next-icon err">!</div>
            <div className="ckt-next-title">Couldn’t start payment</div>
            <p className="ckt-next-msg">{message}</p>
            <button className="ckt-pay-btn secondary" type="button" onClick={() => setStage('select')}>Try again</button>
          </div>
        )}

        {/* Footer — the required Konduyt attribution */}
        <div className="ckt-footer">
          <span className="ckt-lock" aria-hidden="true">🔒</span>
          <span>Secured &amp; optimized by</span>
          <a href="https://konduyt.dev" target="_blank" rel="noreferrer" className="ckt-brand">Konduyt.dev</a>
        </div>
      </div>
    </div>
  );
}
