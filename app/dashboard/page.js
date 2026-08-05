'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LANGUAGES } from './snippets';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

const TOKEN_KEY = 'kdu_token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}
function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
}
function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
}
function migrateLegacyToken() {
  try {
    const legacy = sessionStorage.getItem(TOKEN_KEY);
    if (legacy && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, legacy);
    if (legacy) sessionStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function Dashboard() {
  const [status, setStatus] = useState('loading'); // loading | ready | unauth
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [keys, setKeys] = useState(null);
  const [latestPayment, setLatestPayment] = useState(null);
  const [tab, setTab] = useState('integrations'); // integrations | overview | money | activity | settings
  const [providers, setProviders] = useState([]);
  const [capGroups, setCapGroups] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectingId, setConnectingId] = useState(null);
  const [credInput, setCredInput] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);
  const [lang, setLang] = useState('curl');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [rotating, setRotating] = useState(false);

  const active = projects.find((p) => p.id === activeId) || null;

  // ---- Initial auth + token capture ----
  useEffect(() => {
    migrateLegacyToken();
    let token = null;
    if (window.location.hash.startsWith('#token=')) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      token = params.get('token');
      if (token) setToken(token);
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      token = getToken();
    }
    if (!token) {
      setStatus('unauth');
      return;
    }
    fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('unauth');
        return r.json();
      })
      .then((u) => {
        setUser(u);
        return fetch(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((r) => r.json())
      .then((data) => {
        const list = data.projects || [];
        setProjects(list);
        if (list.length) setActiveId(list[0].id);
        setStatus('ready');
      })
      .catch(() => {
        clearToken();
        setStatus('unauth');
      });
  }, []);

  // ---- Load keys + connections + latest payment when active project changes ----
  const loadProjectData = useCallback((pid) => {
    if (!pid) return;
    fetch(`${API_BASE}/projects/${pid}/keys`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        const k = d.keys || null;
        setKeys(k);
        setHasKeys(!!(k && k.test));
      })
      .catch(() => {
        setKeys(null);
        setHasKeys(false);
      });
    fetch(`${API_BASE}/projects/${pid}/connections`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setConnections(d.connections || []))
      .catch(() => setConnections([]));
    fetch(`${API_BASE}/projects/${pid}/capabilities`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setCapGroups(d.groups || []))
      .catch(() => setCapGroups([]));
    fetch(`${API_BASE}/projects/${pid}/latest-payment`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setLatestPayment(d.payment || null))
      .catch(() => setLatestPayment(null));
  }, []);

  // Load the provider catalog once.
  useEffect(() => {
    if (status !== 'ready') return;
    fetch(`${API_BASE}/connectors`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setProviders(d.connectors || []))
      .catch(() => setProviders([]));
  }, [status]);

  useEffect(() => {
    if (activeId) loadProjectData(activeId);
  }, [activeId, loadProjectData]);

  // New users (no keys yet) land on Connections — the first meaningful action.
  useEffect(() => {
    if (status === 'ready' && keys !== null) {
      if (!hasKeys) setTab('integrations');
      else setTab('overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKeys, status]);

  function logout() {
    clearToken();
    window.location.href = '/';
  }

  async function enterSandbox() {
    // A sandbox is a free project for experimenting. Create one and switch to it.
    const r = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Sandbox' }),
    });
    const p = await r.json();
    const rl = await fetch(`${API_BASE}/projects`, { headers: authHeaders() });
    const data = await rl.json();
    setProjects(data.projects || []);
    setActiveId(p.id);
    setTab('integrations');
  }

  async function connectProvider(providerId) {
    setConnectError('');
    setConnectBusy(true);
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/connections`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          credentials: { secret_key: credInput.trim() },
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setConnectError(err.detail || 'Could not connect. Check your credentials.');
        setConnectBusy(false);
        return;
      }
      // Success: reload keys + connections. Keys now exist.
      setConnectingId(null);
      setCredInput('');
      loadProjectData(activeId);
      // Keys + snippet now appear right here in Integrations.
    } catch (e) {
      setConnectError('Network error. Please try again.');
    }
    setConnectBusy(false);
  }

  function disconnectProvider(providerId) {
    if (!confirm('Disconnect this provider?')) return;
    fetch(`${API_BASE}/projects/${activeId}/connections/${providerId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(() => loadProjectData(activeId));
  }

  async function createProject() {
    setProjectMenuOpen(false);
    const r = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled Project' }),
    });
    const p = await r.json();
    const rl = await fetch(`${API_BASE}/projects`, { headers: authHeaders() });
    const data = await rl.json();
    setProjects(data.projects || []);
    setActiveId(p.id);
  }

  async function saveRename() {
    const name = renameVal.trim();
    if (!name) {
      setRenaming(false);
      return;
    }
    await fetch(`${API_BASE}/projects/${activeId}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setProjects((ps) => ps.map((p) => (p.id === activeId ? { ...p, name } : p)));
    setRenaming(false);
  }

  async function rotateTestKey() {
    if (!confirm('Roll your test secret key? The old key stops working immediately.')) return;
    setRotating(true);
    await fetch(`${API_BASE}/projects/${activeId}/keys/rotate`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'test' }),
    });
    loadProjectData(activeId);
    setRotating(false);
    setShowSecret(true);
  }

  function copy(text, label) {
    try {
      navigator.clipboard.writeText(text);
    } catch (e) {}
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  }

  // ---- Render states ----
  if (status === 'loading') {
    return (
      <div className="dash-root">
        <div className="dash-center"><div className="dash-spinner" /></div>
      </div>
    );
  }
  if (status === 'unauth') {
    return (
      <div className="dash-root">
        <div className="dash-center">
          <div className="dash-card" style={{ textAlign: 'center', maxWidth: 420 }}>
            <h1 className="dash-title">You&apos;re not signed in</h1>
            <p className="dash-sub">Sign in to open your console.</p>
            <Link href="/signin/" className="dash-btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const testKeys = keys?.test || null;
  const liveKeys = keys?.live || null;
  const kycVerified = active?.kyc_status === 'verified';
  const secretForSnippet = testKeys?.secret || 'kdu_test_secret_...';
  const apiForSnippet = API_BASE;

  const currentLang = LANGUAGES.find((l) => l.id === lang) || LANGUAGES[0];
  const filledCode = currentLang.code
    .replaceAll('{{SECRET}}', secretForSnippet)
    .replaceAll('{{API}}', apiForSnippet);

  return (
    <div className="dash-root">
      {/* ===== Top bar ===== */}
      <header className="con-topbar">
        <div className="con-topbar-left">
          <Link href="/" className="con-logo">Konduyt</Link>

          {/* Project switcher */}
          <div className="con-proj">
            <button
              className="con-proj-btn"
              onClick={() => setProjectMenuOpen((o) => !o)}
              type="button"
            >
              {active ? active.name : 'No project'} <span className="con-caret">▾</span>
            </button>
            {projectMenuOpen && (
              <div className="con-proj-menu">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    className="con-proj-item"
                    onClick={() => {
                      setActiveId(p.id);
                      setProjectMenuOpen(false);
                    }}
                    type="button"
                  >
                    <span>{p.id === activeId ? '✓ ' : ''}{p.name}</span>
                  </button>
                ))}
                <div className="con-proj-divider" />
                <button className="con-proj-item con-proj-new" onClick={createProject} type="button">
                  + New Project
                </button>
              </div>
            )}
          </div>

          {active && !renaming && (
            <button
              className="con-rename"
              onClick={() => {
                setRenameVal(active.name);
                setRenaming(true);
              }}
              type="button"
              title="Rename project"
            >
              ✎ Rename
            </button>
          )}
          {active && renaming && (
            <span className="con-rename-edit">
              <input
                className="con-rename-input"
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                autoFocus
              />
              <button className="con-rename-save" onClick={saveRename} type="button">Save</button>
            </span>
          )}
        </div>

        <div className="con-topbar-right">
          {/* Enter Sandbox — a free project for experimenting */}
          <button className="con-sandbox" type="button" onClick={enterSandbox}>
            Enter Sandbox
          </button>

          <button className="con-avatar" onClick={logout} type="button" title="Sign out">
            {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ===== Tabs ===== */}
      <nav className="con-tabs">
        {[
          ['integrations', 'Integrations'],
          ['overview', 'Overview'],
          ['money', 'Money'],
          ['activity', 'Activity'],
          ['settings', 'Settings'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'con-tab active' : 'con-tab'}
            onClick={() => setTab(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ===== Body ===== */}
      <main className="con-body">
        <>
            {tab === 'integrations' && !hasKeys && false && (
              <div className="con-empty">
                <h2 className="con-empty-title">Connect a provider to get your keys</h2>
                <p className="con-empty-sub">
                  Konduyt API keys are generated once you connect your first payment provider —
                  because keys are only useful when Konduyt has somewhere to route payments.
                </p>
                <button
                  className="dash-btn-primary"
                  onClick={() => setTab('connections')}
                  type="button"
                  style={{ marginTop: 18 }}
                >
                  Go to Connections
                </button>
              </div>
            )}

            {tab === 'integrations' && hasKeys && (
              <div className="con-home">
                <div className="con-home-head">
                  <h1 className="con-h1">Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
                  <p className="con-sub">
                    Copy the snippet, run it, and watch a real test payment appear below.
                  </p>
                </div>

                {/* Keys */}
                <section className="con-section">
                  <div className="con-section-title">Test API keys</div>
                  <div className="con-key-row">
                    <span className="con-key-label">Publishable</span>
                    <code className="con-key-val">{testKeys?.publishable_key || '—'}</code>
                    <div className="con-key-actions">
                      <button className="con-copy" onClick={() => copy(testKeys?.publishable_key, 'pub')} type="button">
                        {copied === 'pub' ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="con-key-row">
                    <span className="con-key-label">Secret</span>
                    <code className="con-key-val">
                      {showSecret ? (testKeys?.secret || '—') : (testKeys?.secret_masked || '—')}
                    </code>
                    <div className="con-key-actions">
                      <button className="con-copy" onClick={() => setShowSecret((s) => !s)} type="button">
                        {showSecret ? 'Hide' : 'Reveal'}
                      </button>
                      <button className="con-copy" onClick={() => copy(testKeys?.secret, 'sec')} type="button">
                        {copied === 'sec' ? '✓' : 'Copy'}
                      </button>
                      <button className="con-copy con-roll" onClick={rotateTestKey} disabled={rotating} type="button">
                        {rotating ? '…' : 'Roll'}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Snippet */}
                <section className="con-section">
                  <div className="con-section-title">Your first payment</div>
                  <div className="con-lang-row">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        className={l.id === lang ? 'con-lang active' : 'con-lang'}
                        onClick={() => setLang(l.id)}
                        type="button"
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <div className="con-install">{currentLang.install}</div>
                  <div className="con-code-wrap">
                    <button className="con-code-copy" onClick={() => copy(filledCode, 'code')} type="button">
                      {copied === 'code' ? '✓ Copied' : 'Copy'}
                    </button>
                    <pre className="con-code">{filledCode}</pre>
                  </div>
                </section>

                {/* Receipt strip */}
                <section className="con-receipt">
                  <div className="con-receipt-label">
                    <span className="con-env-dot" /> Test environment
                  </div>
                  {latestPayment ? (
                    <div className="con-receipt-body">
                      <div className="con-receipt-row">
                        <span className="con-receipt-k">Last test payment</span>
                        <code className="con-receipt-id">{latestPayment.id}</code>
                      </div>
                      <div className="con-receipt-row">
                        <span className="con-receipt-amt">
                          {latestPayment.currency} {(latestPayment.amount / 100).toLocaleString()}
                        </span>
                        <span className="con-receipt-status">✓ {latestPayment.status}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="con-receipt-empty">
                      No test payments yet. Run the snippet above — your first payment shows up here.
                    </div>
                  )}
                  <button className="con-receipt-refresh" onClick={() => loadProjectData(activeId)} type="button">
                    ↻ Refresh
                  </button>
                </section>
              </div>
            )}

            {tab === 'integrations' && (
              <div className="con-connections">
                <div className="con-home-head">
                  <h1 className="con-h1">Integrations</h1>
                  <p className="con-sub">
                    Connect your payment providers. Accept payments through one Konduyt integration.
                    {!hasKeys && ' Your Konduyt API keys are generated the moment your first connector connects.'}
                  </p>
                </div>

                {/* SECTION 1: Connectors — things you authenticate with */}
                <div className="con-section-head">Connectors</div>
                <p className="con-section-note">
                  Real integrations that require credentials.
                </p>
                <div className="con-provider-list">
                  {providers.map((p) => {
                    const conn = connections.find((c) => c.provider_id === p.id);
                    const isConnected = !!conn;
                    const isOpen = connectingId === p.id;
                    // Effective status: connected overrides catalogue status.
                    const status = isConnected ? 'connected' : p.status;
                    const isPlanned = p.status === 'planned';
                    return (
                      <div className={`con-provider ${isPlanned ? 'soon' : ''}`} key={p.id}>
                        <div className="con-provider-main">
                          <div className="con-provider-info">
                            <span className="con-provider-name">{p.name}</span>
                            <span className="con-provider-type">{p.type_label}</span>
                            {status === 'connected' && (
                              <span className="con-provider-badge connected">
                                ✓ Connected{conn.mode ? ` · ${conn.mode}` : ''}
                              </span>
                            )}
                            {status === 'available' && (
                              <span className="con-provider-badge available">Available</span>
                            )}
                            {status === 'planned' && (
                              <span className="con-provider-badge soon">Planned</span>
                            )}
                            {p.best_for && (
                              <span className="con-provider-bestfor">{p.best_for}</span>
                            )}
                          </div>
                          <div className="con-provider-action">
                            {status === 'available' && (
                              <button
                                className="con-connect-btn"
                                onClick={() => {
                                  setConnectingId(isOpen ? null : p.id);
                                  setCredInput('');
                                  setConnectError('');
                                }}
                                type="button"
                              >
                                {isOpen ? 'Cancel' : 'Connect'}
                              </button>
                            )}
                            {status === 'connected' && (
                              <button
                                className="con-disconnect-btn"
                                onClick={() => disconnectProvider(p.id)}
                                type="button"
                              >
                                Disconnect
                              </button>
                            )}
                            {status === 'planned' && (
                              <button className="con-connect-btn" disabled type="button">
                                Connect
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="con-provider-caps">
                          {p.capabilities?.length > 0 && (
                            <div className="con-cap-group">
                              <span className="con-cap-label">Provides</span>
                              <span className="con-cap-chips">
                                {p.capabilities.map((cap) => (
                                  <span className="con-cap-chip" key={cap.id}>{cap.name}</span>
                                ))}
                              </span>
                            </div>
                          )}
                          {p.countries?.length > 0 && (
                            <div className="con-cap-group">
                              <span className="con-cap-label">Countries</span>
                              <span className="con-cap-chips">
                                {p.countries.slice(0, 8).map((ct) => (
                                  <span className="con-cap-chip" key={ct.code}>
                                    <span className="con-cap-flag">{ct.flag}</span> {ct.name}
                                  </span>
                                ))}
                              </span>
                            </div>
                          )}
                        </div>

                        {isOpen && status === 'available' && (
                          <div className="con-connect-form">
                            <label className="con-connect-label">{p.credential_label}</label>
                            <input
                              className="con-connect-input"
                              type="password"
                              placeholder="sk_test_..."
                              value={credInput}
                              onChange={(e) => setCredInput(e.target.value)}
                              autoFocus
                            />
                            {p.credential_help && (
                              <p className="con-connect-help">{p.credential_help}</p>
                            )}
                            {p.docs_url && (
                              <a className="con-connect-docs" href={p.docs_url} target="_blank" rel="noreferrer">
                                Where to find this ↗
                              </a>
                            )}
                            {connectError && <div className="con-connect-error">{connectError}</div>}
                            <button
                              className="con-connect-submit"
                              onClick={() => connectProvider(p.id)}
                              disabled={connectBusy || !credInput.trim()}
                              type="button"
                            >
                              {connectBusy ? 'Validating…' : `Connect ${p.name}`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* SECTION 2: Payment Methods (capabilities) — derived, read-only */}
                <div className="con-section-head" style={{ marginTop: 40 }}>Payment methods</div>
                <p className="con-section-note">
                  What this project can accept, based on your connected connectors. Read-only —
                  connect a connector above to enable more.
                </p>
                <div className="con-caps-grid">
                  {capGroups.map((group) => (
                    <div className="con-cap-cat" key={group.category}>
                      <div className="con-cap-cat-label">{group.label}</div>
                      <div className="con-cap-cat-items">
                        {group.capabilities.map((cap) => (
                          <div
                            className={cap.enabled ? 'con-methodrow enabled' : 'con-methodrow'}
                            key={cap.id}
                          >
                            <span className="con-method-name">
                              {cap.enabled ? '✓ ' : ''}{cap.name}
                            </span>
                            {cap.enabled ? (
                              <span className="con-method-by">via {cap.enabled_by.join(', ')}</span>
                            ) : (
                              <span className="con-method-need">
                                Requires {cap.available_from.slice(0, 3).join(' or ')}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'overview' && (
              <div className="con-empty">
                <h2 className="con-empty-title">Overview</h2>
                <p className="con-empty-sub">
                  A summary of your project — recent payments, connected providers and
                  integration health — will live here as those systems come online. For now,
                  head to Integrations to connect providers and grab your code.
                </p>
                <button
                  className="dash-btn-primary"
                  onClick={() => setTab('integrations')}
                  type="button"
                  style={{ marginTop: 18 }}
                >
                  Go to Integrations
                </button>
              </div>
            )}

            {tab === 'activity' && (
              <div className="con-empty">
                <h2 className="con-empty-title">Activity</h2>
                <p className="con-empty-sub">
                  A live feed of API requests, test payments, webhooks and errors will appear
                  here — so you can watch exactly what your integration is doing. Arriving in
                  Milestone 3. Your most recent test payment already shows on the Home tab.
                </p>
              </div>
            )}

            {tab === 'money' && (
              <div className="con-empty">
                <h2 className="con-empty-title">Money</h2>
                <p className="con-empty-sub">
                  Transactions, refunds and settlement history will live here once live payments
                  are enabled — a unified view across every provider you connect. Arriving in
                  Milestone 4.
                </p>
              </div>
            )}

            {tab === 'settings' && (
              <div className="con-project">
                <h2 className="con-empty-title">Project settings</h2>
                <div className="con-proj-settings">
                  <div className="con-setting-row">
                    <span className="con-setting-k">Project name</span>
                    <span className="con-setting-v">{active?.name}</span>
                  </div>
                  <div className="con-setting-row">
                    <span className="con-setting-k">Verification (KYC)</span>
                    <span className="con-setting-v">
                      {kycVerified ? (
                        <span className="con-verified">✓ Verified</span>
                      ) : (
                        <span className="con-unverified">Not verified — required for Live mode</span>
                      )}
                    </span>
                  </div>
                  <div className="con-setting-row">
                    <span className="con-setting-k">Live keys</span>
                    <span className="con-setting-v">
                      {liveKeys?.enabled ? 'Active' : 'Disabled until KYC'}
                    </span>
                  </div>
                  <p className="con-setting-note">
                    API keys, webhooks, domains, tax settings and delete-project controls will
                    expand here in later milestones.
                  </p>
                </div>
              </div>
            )}
        </>
      </main>
    </div>
  );
}
