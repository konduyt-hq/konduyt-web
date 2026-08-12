'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://konduyt-api.onrender.com';

export default function Labs() {
  const [hasAccount, setHasAccount] = useState(false);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasAccount(!!localStorage.getItem('kdu_token'));
    }
  }, []);

  async function join() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kdu_token') : null;
    if (!token) { window.location.href = '/signup/'; return; }
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${API_BASE}/labs/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product: 'konduyt-intelligence' }),
      });
      const d = await r.json();
      if (d.ok) { setJoined(true); }
      else { setMsg(d.detail || 'Could not join the list. Please try again.'); }
    } catch {
      setMsg('Could not reach the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="labs-root">
      <nav className="labs-nav">
        <Link href="/" className="labs-logo">Konduyt</Link>
        <div className="labs-nav-links">
          <Link href="/" className="labs-navlink">Home</Link>
          <Link href="/pricing/" className="labs-navlink">Pricing</Link>
          <Link href="/signin/" className="labs-navcta">Sign in</Link>
        </div>
      </nav>

      <div className="labs-wrap labs-tease">
        <span className="labs-eyebrow">KONDUYT LABS</span>
        <h1 className="labs-h1">Konduyt Intelligence</h1>
        <p className="labs-tease-sub">
          Something is coming. We&apos;re not saying much yet.
        </p>

        {joined ? (
          <div className="labs-joined">
            <div className="labs-joined-check">✓</div>
            <div className="labs-joined-title">You&apos;re on the list.</div>
            <div className="labs-joined-sub">We&apos;ll reach out when Konduyt Intelligence is ready.</div>
          </div>
        ) : (
          <div className="labs-join-box">
            <button className="labs-join-btn" onClick={join} type="button" disabled={busy}>
              {busy ? 'Joining…' : 'Join the list'}
            </button>
            {!hasAccount && (
              <p className="labs-join-note">You&apos;ll need a Konduyt account to join the list.</p>
            )}
            {msg && <p className="labs-join-err">{msg}</p>}
          </div>
        )}

        <Link href="/" className="labs-navlink labs-tease-back">← Back to Konduyt</Link>
      </div>
    </div>
  );
}
