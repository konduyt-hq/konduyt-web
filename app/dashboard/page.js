'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

const TOKEN_KEY = 'kdu_token';

export default function Dashboard() {
  const [status, setStatus] = useState('loading'); // loading | ready | unauth
  const [user, setUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    // 1. Grab the token (and is-new flag) from the URL fragment on first load,
    //    persist the token, then clean the URL.
    let token = null;
    if (window.location.hash.startsWith('#token=')) {
      // Fragment looks like: #token=<jwt>&new=1
      const frag = window.location.hash.slice(1); // drop leading '#'
      const params = new URLSearchParams(frag);
      token = params.get('token');
      const isNew = params.get('new') === '1';
      try {
        if (token) sessionStorage.setItem(TOKEN_KEY, token);
        // Store the first-time flag so the (future) tab routing can read it.
        sessionStorage.setItem('kdu_is_new', isNew ? '1' : '0');
      } catch (e) {}
      // Remove the token from the visible URL.
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      try {
        token = sessionStorage.getItem(TOKEN_KEY);
      } catch (e) {}
    }

    if (!token) {
      setStatus('unauth');
      return;
    }

    // 2. Verify with the API.
    fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('unauth');
        return r.json();
      })
      .then((u) => {
        setUser(u);
        try {
          setIsNew(sessionStorage.getItem('kdu_is_new') === '1');
        } catch (e) {}
        setStatus('ready');
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(TOKEN_KEY);
        } catch (e) {}
        setStatus('unauth');
      });
  }, []);

  function getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch (e) {
      return null;
    }
  }

  function logout() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    window.location.href = '/';
  }

  async function deleteAccount() {
    setDeleting(true);
    const token = getToken();
    try {
      await fetch(`${API_BASE}/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {}
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    window.location.href = '/?deleted=1';
  }

  if (status === 'loading') {
    return (
      <div className="dash-root">
        <div className="dash-center">
          <div className="dash-spinner"></div>
        </div>
      </div>
    );
  }

  if (status === 'unauth') {
    return (
      <div className="dash-root">
        <div className="dash-center">
          <div className="dash-card" style={{ textAlign: 'center' }}>
            <h1 className="dash-title">You&apos;re not signed in</h1>
            <p className="dash-sub">Sign in to see your dashboard.</p>
            <Link href="/signin/" className="dash-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initials = (user.name || user.email || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="dash-root">
      <div className="dash-topbar">
        <Link href="/" className="dash-brand">
          <span className="dash-brand-name">Konduyt</span>
        </Link>
        <button className="dash-logout" onClick={logout} type="button">Log out</button>
      </div>

      <div className="dash-center">
        <div className="dash-card">
          <div className="dash-user">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="dash-avatar-img" src={user.avatar_url} alt="" />
            ) : (
              <div className="dash-avatar">{initials}</div>
            )}
            <div>
              <div className="dash-name">{user.name || 'Konduyt user'}</div>
              <div className="dash-email">{user.email}</div>
            </div>
          </div>

          <div className="dash-badge-row">
            <span className="dash-badge">Signed in with {user.provider}</span>
          </div>

          <div className="dash-welcome">
            <h1 className="dash-title">{isNew ? 'Welcome to Konduyt.' : 'Welcome back.'}</h1>
            <p className="dash-sub">
              {isNew
                ? 'Your account is set up. Next, connect a payment provider to start accepting payments — that step comes in the console tabs (coming soon).'
                : 'Authentication works end to end. This is a placeholder console — workspaces and integrations come next.'}
            </p>
          </div>

          {/* Danger zone: delete account */}
          <div className="dash-danger">
            <div className="dash-danger-head">Delete account</div>
            <p className="dash-danger-sub">
              Permanently remove your Konduyt account. This cannot be undone.
            </p>
            {!confirmDelete ? (
              <button
                className="dash-btn-danger"
                onClick={() => setConfirmDelete(true)}
                type="button"
              >
                Delete my account
              </button>
            ) : (
              <div className="dash-confirm">
                <span className="dash-confirm-q">Are you sure?</span>
                <button
                  className="dash-btn-danger"
                  onClick={deleteAccount}
                  disabled={deleting}
                  type="button"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  className="dash-btn-ghost"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
