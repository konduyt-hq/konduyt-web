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

// A connector's required credential fields must all be filled before Connect.
function schemaComplete(connector, values) {
  const fields = connector?.credential_schema?.fields || [];
  return fields
    .filter((f) => f.required)
    .every((f) => (values[f.name] || '').toString().trim().length > 0);
}

// Monogram from a connector name (logos come later).
function monogram(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

export default function Dashboard() {
  const [status, setStatus] = useState('loading'); // loading | ready | unauth
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [keys, setKeys] = useState(null);
  const [latestPayment, setLatestPayment] = useState(null);
  const [tab, setTab] = useState('discover'); // discover | accounts | overview | money | activity | settings
  const [providers, setProviders] = useState([]);
  const [capGroups, setCapGroups] = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [connections, setConnections] = useState([]);
  const [connectingId, setConnectingId] = useState(null);
  const [credValues, setCredValues] = useState({});
  const [connectError, setConnectError] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [methodGroups, setMethodGroups] = useState([]);
  const [activeMethod, setActiveMethod] = useState(null); // method id when viewing a method page
  const [activeCategory, setActiveCategory] = useState(null); // category id in Discover drill-down
  const [accounts, setAccounts] = useState([]); // connected accounts (provider-first tab)
  const [testResult, setTestResult] = useState({}); // provider_id -> {ok, message, testing}
  const [methodDetail, setMethodDetail] = useState(null);
  const [snippetLang, setSnippetLang] = useState('curl');
  const [projectStatus, setProjectStatus] = useState(null);
  const [activity, setActivity] = useState([]);
  const [summary, setSummary] = useState(null);
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
        if (list.length) {
          setProjects(list);
          setActiveId(list[0].id);
          setStatus('ready');
        } else {
          // No project yet — create the first one so the user never lands on
          // an empty "No project" state.
          fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My First Project' }),
          })
            .then((r) => r.json())
            .then((proj) => {
              setProjects([proj]);
              setActiveId(proj.id);
              setStatus('ready');
            })
            .catch(() => setStatus('ready'));
        }
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
    fetch(`${API_BASE}/projects/${pid}/payment-methods`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setPayMethods(d.methods || []); setMethodGroups(d.groups || []); })
      .catch(() => { setPayMethods([]); setMethodGroups([]); });
    fetch(`${API_BASE}/projects/${pid}/activity`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setActivity(d.activity || []))
      .catch(() => setActivity([]));
    fetch(`${API_BASE}/projects/${pid}/summary`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => setSummary(null));
    fetch(`${API_BASE}/projects/${pid}/status`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setProjectStatus(d))
      .catch(() => setProjectStatus(null));
    fetch(`${API_BASE}/projects/${pid}/connected-accounts`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []))
      .catch(() => setAccounts([]));
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

  // Load the detail for the currently open payment method.
  useEffect(() => {
    if (!activeId || !activeMethod) { setMethodDetail(null); return; }
    fetch(`${API_BASE}/projects/${activeId}/payment-methods/${activeMethod}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setMethodDetail(d))
      .catch(() => setMethodDetail(null));
  }, [activeId, activeMethod, connections]);

  // New users (no keys yet) land on Connections — the first meaningful action.
  useEffect(() => {
    if (status === 'ready' && keys !== null) {
      if (!hasKeys) setTab('discover');
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
    setTab('discover');
  }

  async function connectProvider(providerId) {
    setConnectError('');
    setConnectBusy(true);
    try {
      // Send whatever fields the schema collected, trimmed.
      const credentials = {};
      Object.entries(credValues).forEach(([k, v]) => {
        credentials[k] = typeof v === 'string' ? v.trim() : v;
      });
      const r = await fetch(`${API_BASE}/projects/${activeId}/connections`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        // Pass the method being enabled, so connecting also enables it.
        body: JSON.stringify({ provider_id: providerId, credentials, method_id: activeMethod }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const msg = typeof err.detail === 'string' ? err.detail
          : (err.detail?.message || 'Could not connect. Check your credentials.');
        setConnectError(msg);
        setConnectBusy(false);
        return;
      }
      setConnectingId(null);
      setCredValues({});
      loadProjectData(activeId);
      reloadMethodDetail();
    } catch (e) {
      setConnectError('Network error. Please try again.');
    }
    setConnectBusy(false);
  }

  // Enable a method using an ALREADY-CONNECTED account — no credentials.
  async function testConnection(providerId) {
    setTestResult((prev) => ({ ...prev, [providerId]: { testing: true } }));
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/connected-accounts/${providerId}/test`, {
        method: 'POST', headers: authHeaders(),
      });
      const d = await r.json();
      setTestResult((prev) => ({ ...prev, [providerId]: { testing: false, ok: d.ok, message: d.message } }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [providerId]: { testing: false, ok: false, message: 'Test failed to run.' } }));
    }
  }

  function disconnectAccount(providerId) {
    if (!confirm(`Disconnect ${providerId}? Any methods it powers will stop working.`)) return;
    fetch(`${API_BASE}/projects/${activeId}/connections/${providerId}`, {
      method: 'DELETE', headers: authHeaders(),
    }).then(() => loadProjectData(activeId));
  }

  function copyToClipboard(text, label) {
    try {
      navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    } catch (e) {}
  }

  async function enableMethod(providerId) {
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/enabled-methods`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ method_id: activeMethod, provider_id: providerId }),
      });
      if (r.ok) { loadProjectData(activeId); reloadMethodDetail(); }
    } catch (e) {}
  }

  function disableMethod() {
    fetch(`${API_BASE}/projects/${activeId}/enabled-methods/${activeMethod}`, {
      method: 'DELETE', headers: authHeaders(),
    }).then(() => { loadProjectData(activeId); reloadMethodDetail(); });
  }

  function reloadMethodDetail() {
    if (!activeId || !activeMethod) return;
    fetch(`${API_BASE}/projects/${activeId}/payment-methods/${activeMethod}`, { headers: authHeaders() })
      .then((r) => r.json()).then((d) => setMethodDetail(d)).catch(() => {});
  }

  function disconnectProvider(providerId) {
    if (!confirm('Disconnect this provider?')) return;
    fetch(`${API_BASE}/projects/${activeId}/connections/${providerId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(() => { loadProjectData(activeId); reloadMethodDetail(); });
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
          {/* Sandbox — the reference application collection */}
          <Link className="con-sandbox" href="/sandbox/">
            Sandbox
          </Link>

          <button className="con-avatar" onClick={logout} type="button" title="Sign out">
            {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      {/* ===== Tabs ===== */}
      <nav className="con-tabs">
        {[
          ['discover', 'Discover'],
          ['accounts', 'Connected Accounts'],
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
            {tab === 'discover' && !activeMethod && (
              <div className="mpesa-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Payment methods</h1>
                  <p className="con-sub">
                    Choose what your customers can pay with. Konduyt connects the provider behind each one.
                  </p>
                </div>

                {/* Project status: Live requires a connected provider AND an enabled method */}
                {projectStatus && (
                  <div className={`proj-status ${projectStatus.live ? 'live' : 'notlive'}`}>
                    <span className="proj-status-dot" />
                    <div className="proj-status-text">
                      <span className="proj-status-label">
                        {projectStatus.live ? 'Live' : 'Not live'}
                      </span>
                      <span className="proj-status-reason">{projectStatus.reason}</span>
                    </div>
                    {!projectStatus.live && (
                      <div className="proj-status-steps">
                        <span className={projectStatus.has_connection ? 'step done' : 'step'}>
                          {projectStatus.has_connection ? '✓' : '1'} Connect a provider
                        </span>
                        <span className={projectStatus.has_enabled_method ? 'step done' : 'step'}>
                          {projectStatus.has_enabled_method ? '✓' : '2'} Enable a method
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* API keys + code — the project's identity, always available */}
                {keys && keys.test && (
                  <div className="keys-panel">
                    <div className="keys-head">
                      <h3>Your API keys</h3>
                      <span className="keys-mode">Test mode</span>
                    </div>
                    <div className="keys-row">
                      <div className="keys-field">
                        <label>Publishable key</label>
                        <div className="keys-value">
                          <code>{keys.test.publishable_key}</code>
                          <button className="keys-copy" type="button"
                            onClick={() => copyToClipboard(keys.test.publishable_key, 'pub')}>
                            {copied === 'pub' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="keys-field">
                        <label>Secret key</label>
                        <div className="keys-value">
                          <code>{showSecret ? (keys.test.secret || keys.test.secret_masked) : keys.test.secret_masked}</code>
                          <button className="keys-copy" type="button"
                            onClick={() => setShowSecret((s) => !s)}>
                            {showSecret ? 'Hide' : 'Reveal'}
                          </button>
                          {keys.test.secret && (
                            <button className="keys-copy" type="button"
                              onClick={() => copyToClipboard(keys.test.secret, 'sec')}>
                              {copied === 'sec' ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="keys-note">Keep your secret key server-side. Never ship it to a browser or commit it.</p>

                    <div className="keys-code">
                      <div className="keys-code-head">
                        <span className="keys-code-title">Create a payment</span>
                        <div className="keys-langs">
                          {LANGUAGES.map((l) => (
                            <button key={l.id} type="button"
                              className={`keys-lang ${snippetLang === l.id ? 'sel' : ''}`}
                              onClick={() => setSnippetLang(l.id)}>
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(() => {
                        const lang = LANGUAGES.find((l) => l.id === snippetLang) || LANGUAGES[0];
                        const code = (lang.code || '')
                          .replaceAll('{{SECRET}}', keys.test.secret || 'YOUR_TEST_SECRET_KEY')
                          .replaceAll('{{API}}', API_BASE);
                        return (
                          <div className="keys-codeblock">
                            <button className="keys-code-copy" type="button"
                              onClick={() => copyToClipboard(code, 'code')}>
                              {copied === 'code' ? 'Copied' : 'Copy'}
                            </button>
                            <pre><code>{code}</code></pre>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                {methodGroups.length === 0 && (
                  <div style={{ marginTop: 12 }}>
                    {!activeId ? (
                      <div className="con-empty">
                        <p className="con-empty-sub">
                          You don&apos;t have a project yet. Create one to see payment methods.
                        </p>
                        <button
                          className="dash-btn-primary"
                          type="button"
                          style={{ marginTop: 14 }}
                          onClick={async () => {
                            try {
                              const r = await fetch(`${API_BASE}/projects`, {
                                method: 'POST',
                                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: 'My First Project' }),
                              });
                              if (!r.ok) { alert('Could not create project (status ' + r.status + ')'); return; }
                              const proj = await r.json();
                              setProjects([proj]);
                              setActiveId(proj.id);
                            } catch (e) {
                              alert('Network error creating project: ' + e.message);
                            }
                          }}
                        >
                          Create your first project
                        </button>
                      </div>
                    ) : (
                      <p className="con-sub">Loading payment methods…</p>
                    )}
                  </div>
                )}
                {/* Category drill-down: categories first, then methods in the chosen category */}
                {methodGroups.length > 0 && !activeCategory && (
                  <div className="cat-grid">
                    {methodGroups.map((group) => {
                      const enabledCount = group.methods.filter((m) => m.status === 'connected').length;
                      const availCount = group.methods.filter((m) => m.status === 'connectable').length;
                      return (
                        <button className="cat-tile" key={group.category} type="button"
                          onClick={() => setActiveCategory(group.category)}>
                          <span className="cat-tile-name">{group.label}</span>
                          <span className="cat-tile-count">{group.methods.length} method{group.methods.length !== 1 ? 's' : ''}</span>
                          <span className="cat-tile-meta">
                            {enabledCount > 0 && <span className="cat-badge on">{enabledCount} enabled</span>}
                            {availCount > 0 && <span className="cat-badge ready">{availCount} available</span>}
                          </span>
                          <span className="cat-tile-arrow">→</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {methodGroups.length > 0 && activeCategory && (() => {
                  const group = methodGroups.find((g) => g.category === activeCategory);
                  if (!group) { setActiveCategory(null); return null; }
                  return (
                    <div className="cat-detail">
                      <button className="pm-back" type="button" onClick={() => setActiveCategory(null)}>
                        ← All categories
                      </button>
                      <h2 className="cat-detail-title">{group.label}</h2>
                      <div className="pm-grid">
                        {group.methods.map((m) => (
                          <button
                            className={`pm-tile ${m.status === 'unavailable' ? 'soon' : ''}`}
                            key={m.id}
                            type="button"
                            onClick={() => { setActiveMethod(m.id); setConnectingId(null); setExpandedMethod(null); }}
                          >
                            <span className="pm-tile-mono" aria-hidden="true">{monogram(m.name)}</span>
                            <span className="pm-tile-name">{m.name}</span>
                            <span className={
                              m.status === 'connected' ? 'pm-tile-status connected'
                              : m.status === 'connectable' ? 'pm-tile-status ready'
                              : 'pm-tile-status'
                            }>
                              {m.status === 'connected' ? '✓ Enabled'
                                : m.status === 'connectable' ? 'Available'
                                : 'Not available yet'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {tab === 'discover' && activeMethod && methodDetail && (() => {
              const md = methodDetail;
              const activeConn = md.connectors.find((c) => c.status === 'connected');
              return (
                <div className="mpesa-page">
                  <button className="pm-back" type="button" onClick={() => { setActiveMethod(null); setConnectingId(null); }}>
                    ← All payment methods
                  </button>
                  <div className="con-home-head">
                    <h1 className="con-h1">{md.name}</h1>
                    <p className="con-sub">Accept payments from {md.name} customers.</p>
                  </div>

                  {md.id === 'card' && (
                    <div className="pm-networks">
                      <span className="pm-networks-label">Supported networks</span>
                      <div className="pm-networks-list">
                        {['Visa', 'Mastercard', 'American Express', 'Discover', 'JCB', 'UnionPay'].map((n) => (
                          <span className="pm-network" key={n}>{n}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeConn ? (
                    <div className="mpesa-success">
                      <div className="mpesa-success-badge">✓ {md.name} Connected</div>
                      <div className="mpesa-success-row">
                        <span className="mpesa-success-label">Connection method</span>
                        <span className="mpesa-success-val">{activeConn.name}</span>
                      </div>
                      <div className="mpesa-success-actions">
                        <button className="con-connect-btn" type="button" disabled>Manage</button>
                        <button className="con-disconnect-btn" type="button"
                          onClick={() => disconnectProvider(activeConn.id)}>Disconnect</button>
                        <button className="con-connect-btn secondary" type="button" disabled>Test Connection</button>
                      </div>
                    </div>
                  ) : md.connectors.length === 0 ? (
                    <div className="con-empty"><p className="con-empty-sub">No connectors provide this method yet.</p></div>
                  ) : (
                    <div className="mpesa-methods">
                      {md.connectors.map((c) => {
                        const isExpanded = expandedMethod === c.id;
                        const isConnecting = connectingId === c.id && c.connectable;
                        const statusLabel = c.status === 'available' ? 'Available'
                          : c.status === 'beta' ? 'Beta — unverified'
                          : 'Not available yet';
                        return (
                          <div className={`mpesa-card ${c.connectable ? '' : 'unavailable'}`} key={c.id}>
                            <div className="mpesa-card-main">
                              <div className="mpesa-card-info">
                                <div className="mpesa-card-title-row">
                                  <span className="mpesa-card-name">{c.name}</span>
                                  {c.type_label && <span className="mpesa-card-tagline">{c.type_label}</span>}
                                </div>
                                {c.enabled_here ? (
                                  <span className="mpesa-status available">✓ Enabled — powering {md.name}</span>
                                ) : c.account_connected ? (
                                  <span className="mpesa-status available">✓ Already connected</span>
                                ) : (
                                  <span className={
                                    c.status === 'available' ? 'mpesa-status available'
                                    : c.status === 'beta' ? 'mpesa-status beta' : 'mpesa-status'
                                  }>{statusLabel}</span>
                                )}
                              </div>
                              <div className="mpesa-card-action">
                                {c.enabled_here ? (
                                  <button className="con-disconnect-btn" type="button"
                                    onClick={disableMethod}>Disable</button>
                                ) : c.account_connected ? (
                                  // Already connected — enable with NO credentials.
                                  <button className="con-connect-btn" type="button"
                                    onClick={() => enableMethod(c.id)}>Enable</button>
                                ) : c.connectable ? (
                                  <button className="con-connect-btn" type="button"
                                    onClick={() => { setConnectingId(isConnecting ? null : c.id); setCredValues({}); setConnectError(''); }}>
                                    {isConnecting ? 'Cancel' : 'Connect'}
                                  </button>
                                ) : (
                                  <button className="con-connect-btn" type="button" disabled>Unavailable</button>
                                )}
                              </div>
                            </div>

                            {c.best_for && (
                              <button className="mpesa-learn-toggle" type="button"
                                onClick={() => setExpandedMethod(isExpanded ? null : c.id)}>
                                {isExpanded ? '▲ Learn more' : '▼ Learn more'}
                              </button>
                            )}
                            {isExpanded && (
                              <div className="mpesa-learn">
                                <p className="mpesa-learn-blurb">{c.best_for}</p>
                                {c.status === 'beta' && (
                                  <p className="mpesa-beta-note">
                                    This connector is newly built and not yet verified against the live API.
                                    Connect with real credentials — Konduyt validates them and connects only if they work.
                                  </p>
                                )}
                                {c.docs_url && (
                                  <a className="con-connect-docs" href={c.docs_url} target="_blank" rel="noreferrer">
                                    Where to find your credentials ↗
                                  </a>
                                )}
                              </div>
                            )}

                            {isConnecting && (
                              <div className="con-connect-form">
                                <div className="mpesa-connect-title">Connect {md.name} via {c.name}</div>
                                {(c.credential_schema?.fields || []).map((field) => (
                                  <div className="con-field" key={field.name}>
                                    <label className="con-connect-label">
                                      {field.label}{field.required && <span className="con-req">*</span>}
                                    </label>
                                    {field.type === 'select' ? (
                                      <select className="con-connect-input"
                                        value={credValues[field.name] || ''}
                                        onChange={(e) => setCredValues((v) => ({ ...v, [field.name]: e.target.value }))}>
                                        <option value="">Select…</option>
                                        {(field.options || []).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                      </select>
                                    ) : (
                                      <input className="con-connect-input"
                                        type={field.type === 'password' ? 'password' : 'text'}
                                        placeholder={field.placeholder || ''}
                                        value={credValues[field.name] || ''}
                                        onChange={(e) => setCredValues((v) => ({ ...v, [field.name]: e.target.value }))} />
                                    )}
                                    {field.help && <p className="con-field-help">{field.help}</p>}
                                  </div>
                                ))}
                                {connectError && <div className="con-connect-error">{connectError}</div>}
                                <button className="con-connect-submit"
                                  onClick={() => connectProvider(c.id)}
                                  disabled={connectBusy || !schemaComplete(c, credValues)}
                                  type="button">
                                  {connectBusy ? 'Validating…' : 'Connect'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {tab === 'accounts' && (
              <div className="acct-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Connected accounts</h1>
                  <p className="con-sub">
                    Your provider accounts. Each one can power multiple payment methods — connect once, reuse everywhere.
                  </p>
                </div>

                {accounts.length === 0 ? (
                  <div className="con-empty">
                    <p className="con-empty-sub">
                      No provider accounts connected yet. Head to Discover, pick a payment method, and connect a provider — it&apos;ll appear here.
                    </p>
                    <button className="dash-btn-primary" type="button" style={{ marginTop: 14 }}
                      onClick={() => { setTab('discover'); setActiveCategory(null); }}>
                      Go to Discover
                    </button>
                  </div>
                ) : (
                  <div className="acct-list">
                    {accounts.map((a) => {
                      const test = testResult[a.provider_id] || {};
                      return (
                        <div className="acct-card" key={a.provider_id}>
                          <div className="acct-head">
                            <div>
                              <div className="acct-name">{a.name}</div>
                              {a.account_label && <div className="acct-label">{a.account_label}</div>}
                            </div>
                            <span className="acct-status">● Connected</span>
                          </div>

                          <div className="acct-caps">
                            <div className="acct-caps-label">Capabilities</div>
                            <div className="acct-caps-list">
                              {a.capabilities.map((cap) => (
                                <span key={cap.id} className={`acct-cap ${cap.enabled ? 'on' : ''}`}>
                                  {cap.enabled ? '✓ ' : ''}{cap.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          {test.message && (
                            <div className={`acct-test-result ${test.ok ? 'ok' : 'err'}`}>
                              {test.ok ? '✓ ' : '✕ '}{test.message}
                            </div>
                          )}

                          <div className="acct-actions">
                            <button className="acct-btn" type="button"
                              onClick={() => testConnection(a.provider_id)} disabled={test.testing}>
                              {test.testing ? 'Testing…' : 'Test connection'}
                            </button>
                            <button className="acct-btn danger" type="button"
                              onClick={() => disconnectAccount(a.provider_id)}>
                              Disconnect
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'overview' && (
              <div className="ov-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Overview</h1>
                  <p className="con-sub">A live summary of this project, from real payment data.</p>
                </div>
                <div className="ov-stats">
                  <div className="ov-stat">
                    <span className="ov-stat-label">Completed volume</span>
                    <span className="ov-stat-value">
                      {summary ? `KES ${(summary.completed_volume || 0).toLocaleString()}` : '—'}
                    </span>
                  </div>
                  <div className="ov-stat">
                    <span className="ov-stat-label">Completed payments</span>
                    <span className="ov-stat-value">{summary ? summary.completed_count : '—'}</span>
                  </div>
                  <div className="ov-stat">
                    <span className="ov-stat-label">API requests</span>
                    <span className="ov-stat-value">{summary ? summary.total_api_requests : '—'}</span>
                  </div>
                </div>
                {summary && summary.payments_by_status && Object.keys(summary.payments_by_status).length > 0 ? (
                  <div className="ov-breakdown">
                    <h3>Payments by status</h3>
                    {Object.entries(summary.payments_by_status).map(([status, v]) => (
                      <div className="ov-row" key={status}>
                        <span className={`ov-status-dot ${status}`} />
                        <span className="ov-row-label">{status}</span>
                        <span className="ov-row-count">{v.count}</span>
                        <span className="ov-row-amount">KES {(v.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="con-sub">No payments yet. Connect a provider in Integrations, then create your first payment through the API — it'll show here.</p>
                )}
              </div>
            )}

            {tab === 'activity' && (
              <div className="ov-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Activity</h1>
                  <p className="con-sub">Every API request and webhook for this project, newest first.</p>
                </div>
                {activity.length === 0 ? (
                  <p className="con-sub">No activity yet. API calls to <code>/v1/payments</code> and incoming webhooks will appear here.</p>
                ) : (
                  <div className="act-list">
                    {activity.map((a) => (
                      <div className="act-item" key={a.id}>
                        {a.kind === 'api_request' ? (
                          <>
                            <span className={`act-method ${a.status >= 400 ? 'err' : 'ok'}`}>{a.method}</span>
                            <span className="act-path">{a.path}</span>
                            <span className={`act-status ${a.status >= 400 ? 'err' : 'ok'}`}>{a.status}</span>
                            <span className="act-meta">{a.duration_ms}ms</span>
                          </>
                        ) : (
                          <>
                            <span className="act-method wh">{a.direction === 'inbound' ? 'HOOK IN' : 'HOOK OUT'}</span>
                            <span className="act-path">{a.event_type || a.provider}</span>
                            <span className={`act-status ${a.verified === false || a.delivered === false ? 'err' : 'ok'}`}>
                              {a.direction === 'inbound' ? (a.verified ? 'verified' : 'rejected') : (a.delivered ? 'delivered' : 'failed')}
                            </span>
                            <span className="act-meta">{a.provider}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
