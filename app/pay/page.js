'use client';

import { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://konduyt-api.onrender.com';

// A real, standalone, Konduyt-hosted checkout page -- reached via a link a
// merchant sends directly (email, WhatsApp, SMS), never embedded on the
// merchant's own site. Deliberately a single static route reading ?id=...
// rather than a true dynamic path segment: konduyt-web is a Next.js static
// export, which can't pre-render a page for a link id that doesn't exist
// until a merchant creates one at runtime -- see the backend's own comment
// on payment_links URL generation for the same reasoning.
//
// Visiting this page fetches GET /checkout/link/{id}, which mints a fresh,
// ordinary payment_session under the hood for this visit and returns its
// session_id -- from there this page just calls Konduyt.checkout({
// sessionId }), the exact same real checkout flow every other Konduyt
// integration uses. Nothing about payment collection is reimplemented here.

const ERROR_MESSAGES = {
  invalid_link: 'This payment link doesn\u2019t exist. Double-check the link you were sent.',
  already_paid: 'This invoice has already been paid. No further action is needed.',
  link_expired: 'This payment link has expired. Ask the sender for a new one.',
  network: 'Could not reach Konduyt. Please try again in a moment.',
};

export default function PayLink() {
  const [state, setState] = useState('loading'); // loading | ready | paid | error
  const [errorCode, setErrorCode] = useState('');
  const [linkData, setLinkData] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => { document.title = 'Konduyt Pay'; }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkId = params.get('id');
    if (!linkId) {
      setErrorCode('invalid_link');
      setState('error');
      return;
    }
    fetch(`${API_BASE}/checkout/link/${linkId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setErrorCode(data.error || 'network');
          setState('error');
          return;
        }
        setLinkData(data);
        setState('ready');
      })
      .catch(() => {
        setErrorCode('network');
        setState('error');
      });
  }, []);

  useEffect(() => {
    if (state !== 'ready') return;
    const script = document.createElement('script');
    script.src = 'https://konduyt.dev/konduyt.js';
    script.onload = () => setSdkReady(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [state]);

  function pay() {
    if (!window.Konduyt || !linkData) return;
    window.Konduyt.checkout({
      sessionId: linkData.session_id,
      onSuccess: () => setState('paid'),
      onClose: () => {},
    });
  }

  function formatAmount(minor, currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format((minor || 0) / 100);
    } catch (e) {
      return `${((minor || 0) / 100).toFixed(2)} ${currency}`;
    }
  }

  return (
    <div className="pay-root">
      <header className="pay-header">
        <div className="pay-brand">Konduyt</div>
      </header>

      <main className="pay-card">
        {state === 'loading' && <p className="pay-status">Loading…</p>}

        {state === 'error' && (
          <div>
            <div className="pay-icon pay-icon-error">✕</div>
            <p className="pay-message">{ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.network}</p>
          </div>
        )}

        {state === 'ready' && linkData && (
          <>
            <p className="pay-merchant">{linkData.merchant}</p>
            <div className="pay-amount">{formatAmount(linkData.amount, linkData.currency)}</div>
            {linkData.description && <p className="pay-description">{linkData.description}</p>}
            <button className="pay-btn" onClick={pay} disabled={!sdkReady}>
              {sdkReady ? 'Pay now' : 'Loading checkout…'}
            </button>
          </>
        )}

        {state === 'paid' && (
          <div>
            <div className="pay-icon pay-icon-success">✓</div>
            <p className="pay-message">Payment complete. Thank you.</p>
          </div>
        )}
      </main>

      <footer className="pay-footer">Secured by Konduyt</footer>
    </div>
  );
}
