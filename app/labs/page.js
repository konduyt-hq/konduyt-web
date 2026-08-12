'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '../Logo';
import { useI18n } from '../i18n/I18nProvider';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://konduyt-api.onrender.com';

export default function Labs() {
  const { t } = useI18n();
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
        <Logo className="labs-logo" />
        <div className="labs-nav-links">
          <Link href="/" className="labs-navlink">{t('labs.home')}</Link>
          <Link href="/pricing/" className="labs-navlink">{t('nav.pricing')}</Link>
          <Link href="/signin/" className="labs-navcta">{t('nav.signin')}</Link>
        </div>
      </nav>

      <div className="labs-wrap labs-tease">
        <span className="labs-eyebrow">{t('labs.eyebrow')}</span>
        <h1 className="labs-h1">Konduyt Intelligence</h1>
        <p className="labs-tease-sub">
          {t('labs.teaser')}
        </p>

        {joined ? (
          <div className="labs-joined">
            <div className="labs-joined-check">✓</div>
            <div className="labs-joined-title">{t('labs.onlist')}</div>
            <div className="labs-joined-sub">{t('labs.onlist.d')}</div>
          </div>
        ) : (
          <div className="labs-join-box">
            <button className="labs-join-btn" onClick={join} type="button" disabled={busy}>
              {busy ? t('labs.joining') : t('labs.join')}
            </button>
            {!hasAccount && (
              <p className="labs-join-note">{t('labs.needaccount')}</p>
            )}
            {msg && <p className="labs-join-err">{msg}</p>}
          </div>
        )}

        <Link href="/" className="labs-navlink labs-tease-back">← Back to Konduyt</Link>
      </div>
    </div>
  );
}
