'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LANGUAGES } from './snippets';
import { LANG_SNIPPETS } from './langsnippets';
import { LANG_ICONS, LANG_BRAND } from './langicons';
import { ENV_SETUP, ENV_STEPS } from './envsetup';
import { MERCHANT_COUNTRIES } from './countries';

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
  const [tab, setTab] = useState('integrations'); // integrations | overview | money | activity | settings
  const [intSection, setIntSection] = useState('connections'); // connections | languages
  const [langTab, setLangTab] = useState('js'); // selected language in the Languages section
  const [envOpen, setEnvOpen] = useState(false); // ".env setup" explainer expand
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
  const [methodsCatalog, setMethodsCatalog] = useState([]); // /methods — treatment + available_via
  const [methodSearch, setMethodSearch] = useState(''); // search by method (PayPal, Apple Pay, SEPA...)
  const [savingCountry, setSavingCountry] = useState(false);
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

  // Payment-method graph, resolved for the active project's merchant country.
  useEffect(() => {
    if (status !== 'ready') return;
    const q = activeId ? `?project_id=${activeId}` : '';
    fetch(`${API_BASE}/methods${q}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setMethodsCatalog(d.methods || []))
      .catch(() => setMethodsCatalog([]));
  }, [status, activeId]);

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
      if (!hasKeys) setTab('integrations');
      else setTab('overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKeys, status]);

  function logout() {
    clearToken();
    window.location.href = '/';
  }

  async function connectProvider(providerId, schemaFields) {
    setConnectError('');
    setConnectBusy(true);
    try {
      // Send whatever fields the schema collected, trimmed. For optional
      // selects the user never touched, fall back to the first option so a
      // default (e.g. PayPal environment=live) is actually transmitted.
      const credentials = {};
      (schemaFields || []).forEach((f) => {
        let val = credValues[f.name];
        if ((val === undefined || val === '') && f.type === 'select' && !f.required) {
          val = (f.options || [])[0] || '';
        }
        if (val !== undefined && val !== '') {
          credentials[f.name] = typeof val === 'string' ? val.trim() : val;
        }
      });
      // Include any collected fields not present in the schema list (safety).
      Object.entries(credValues).forEach(([k, v]) => {
        if (!(k in credentials) && v !== undefined && v !== '') {
          credentials[k] = typeof v === 'string' ? v.trim() : v;
        }
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

  async function revokeSecret() {
    if (!confirm('Revoke this secret key? It stops working immediately and is replaced by a new one. Any app using the old key must be updated.')) return;
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/keys/rotate`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'live' }),
      });
      if (!r.ok) { alert('Could not revoke the key. Try again.'); return; }
      const kr = await fetch(`${API_BASE}/projects/${activeId}/keys`, { headers: authHeaders() });
      const kd = await kr.json();
      setKeys(kd.keys || null);
      setShowSecret(true);
    } catch (e) { alert('Could not revoke the key. Try again.'); }
  }

  async function saveMerchantCountry(country) {
    if (!activeId) return;
    setSavingCountry(true);
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/country`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_country: country || null }),
      });
      if (r.ok) {
        const proj = await r.json();
        setProjects((ps) => ps.map((p) => (p.id === proj.id ? { ...p, ...proj } : p)));
        // Re-resolve the method graph for the new country.
        const mq = await fetch(`${API_BASE}/methods?project_id=${activeId}`, { headers: authHeaders() });
        const md = await mq.json();
        setMethodsCatalog(md.methods || []);
      }
    } catch (e) { /* keep silent; selector reflects last saved */ }
    setSavingCountry(false);
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
            {tab === 'integrations' && (
              <div className="int-subnav">
                <button
                  className={intSection === 'connections' ? 'int-subtab active' : 'int-subtab'}
                  onClick={() => { setIntSection('connections'); setActiveMethod(null); }}
                  type="button"
                >Connections</button>
                <button
                  className={intSection === 'languages' ? 'int-subtab active' : 'int-subtab'}
                  onClick={() => { setIntSection('languages'); setActiveMethod(null); }}
                  type="button"
                >Languages</button>
              </div>
            )}

            {tab === 'integrations' && intSection === 'connections' && !activeMethod && (
              <div className="mpesa-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Payment methods</h1>
                  <p className="con-sub">
                    Choose what your customers can pay with. Konduyt connects the provider behind each one.
                  </p>
                </div>

                {/* Search by method — developers think in methods, not providers */}
                <div className="method-search">
                  <svg className="method-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    className="method-search-input"
                    type="text"
                    placeholder="Search a payment method — PayPal, Apple Pay, M-Pesa, SEPA, UPI…"
                    value={methodSearch}
                    onChange={(e) => setMethodSearch(e.target.value)}
                  />
                  {methodSearch && (
                    <button className="method-search-clear" type="button" onClick={() => setMethodSearch('')}>✕</button>
                  )}
                </div>

                {/* Cannot receive money without a connected provider */}
                {projectStatus && !projectStatus.has_connection && !methodSearch && (
                  <div className="receive-warn">
                    <span className="receive-warn-icon">⚠</span>
                    <div>
                      <strong>You cannot receive money yet.</strong> Connect a payment provider below to give
                      payments somewhere to settle. Until you do, any payment your app attempts will fail.
                    </div>
                  </div>
                )}

                {/* Project status: Live requires a connected provider AND an enabled method */}
                {projectStatus && !methodSearch && (
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

                {/* Search results — flat, filtered by method name */}
                {methodSearch && (() => {
                  const q = methodSearch.trim().toLowerCase();
                  const matches = methodsCatalog.filter((m) =>
                    m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
                  if (matches.length === 0) {
                    return (
                      <div className="con-empty" style={{ marginTop: 16 }}>
                        <p className="con-empty-sub">
                          No payment method matches “{methodSearch}”. Try PayPal, Apple Pay, M-Pesa, SEPA, UPI, ACH, Pix…
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="pm-grid" style={{ marginTop: 4 }}>
                      {matches.map((m) => {
                        const treatment = m.treatment || 'method';
                        const via = (m.available_via || []).map((v) => v.name);
                        const connectable = m.connectable !== false;
                        let statusText, statusClass;
                        if (!connectable) { statusText = 'Connect a provider that supports this'; statusClass = 'needs'; }
                        else if (treatment === 'capability') { statusText = `Turns on via ${via[0] || 'a processor'}`; statusClass = 'ready'; }
                        else if (treatment === 'direct') { statusText = 'Direct connect'; statusClass = 'ready'; }
                        else { statusText = via.length ? `Via ${via.join(', ')}` : 'Available'; statusClass = 'ready'; }
                        return (
                          <button className={`pm-tile ${!connectable ? 'needs' : ''}`} key={m.id} type="button"
                            onClick={() => { setActiveMethod(m.id); setConnectingId(null); setExpandedMethod(null); }}>
                            <span className="pm-tile-mono" aria-hidden="true">{monogram(m.name)}</span>
                            <span className="pm-tile-name">{m.name}</span>
                            {treatment === 'capability' && <span className="pm-tile-tag">capability</span>}
                            {treatment === 'direct' && <span className="pm-tile-tag direct">direct</span>}
                            <span className={`pm-tile-status ${statusClass}`}>{statusText}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {methodGroups.length === 0 && !methodSearch && (
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
                {methodGroups.length > 0 && !activeCategory && !methodSearch && (
                  <div className="cat-grid">
                    {methodGroups.map((group) => {
                      const catByCategory = methodsCatalog.filter((m) => m.category === group.category);
                      const methodCount = catByCategory.length || group.methods.length;
                      const enabledCount = group.methods.filter((m) => m.status === 'connected').length;
                      // "Connectable" = has a provider that can connect today (from /methods).
                      const connectableCount = catByCategory.filter((m) => m.connectable).length
                        || group.methods.filter((m) => m.status === 'connectable').length;
                      return (
                        <button className="cat-tile" key={group.category} type="button"
                          onClick={() => setActiveCategory(group.category)}>
                          <span className="cat-tile-name">{group.label}</span>
                          <span className="cat-tile-count">{methodCount} method{methodCount !== 1 ? 's' : ''}</span>
                          <span className="cat-tile-meta">
                            {enabledCount > 0 && <span className="cat-badge on">{enabledCount} enabled</span>}
                            {enabledCount === 0 && connectableCount > 0 && <span className="cat-badge ready">{connectableCount} available</span>}
                          </span>
                          <span className="cat-tile-arrow">→</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {methodGroups.length > 0 && activeCategory && !methodSearch && (() => {
                  const group = methodGroups.find((g) => g.category === activeCategory);
                  if (!group) { setActiveCategory(null); return null; }
                  // Connected/enabled status from the project's live method data.
                  const statusById = {};
                  group.methods.forEach((m) => { statusById[m.id] = m.status; });
                  // Source of truth for WHAT methods exist in this category = the
                  // country-resolved graph, so PayPal (direct) and capability
                  // wallets always appear, in sync with search.
                  const catMethods = methodsCatalog.filter((m) => m.category === activeCategory);
                  const label = group.label;
                  return (
                    <div className="cat-detail">
                      <button className="pm-back" type="button" onClick={() => setActiveCategory(null)}>
                        ← All categories
                      </button>
                      <h2 className="cat-detail-title">{label}</h2>
                      <div className="pm-grid">
                        {catMethods.map((cat) => {
                          const m = { id: cat.id, name: cat.name, status: statusById[cat.id] };
                          const treatment = cat.treatment || 'method';
                          const via = (cat.available_via || []).map((v) => v.name);
                          const connectable = cat.connectable !== false;
                          let statusText, statusClass;
                          if (m.status === 'connected') { statusText = '✓ Enabled'; statusClass = 'connected'; }
                          else if (!connectable) { statusText = 'Connect a provider that supports this'; statusClass = 'needs'; }
                          else if (treatment === 'capability') { statusText = `Turns on via ${via[0] || 'a processor'}`; statusClass = 'ready'; }
                          else if (treatment === 'direct') { statusText = 'Direct connect'; statusClass = 'ready'; }
                          else { statusText = via.length ? `Via ${via.join(', ')}` : 'Available'; statusClass = 'ready'; }
                          return (
                            <button
                              className={`pm-tile ${!connectable ? 'needs' : ''}`}
                              key={m.id}
                              type="button"
                              onClick={() => { setActiveMethod(m.id); setConnectingId(null); setExpandedMethod(null); }}
                            >
                              <span className="pm-tile-mono" aria-hidden="true">{monogram(m.name)}</span>
                              <span className="pm-tile-name">{m.name}</span>
                              {treatment === 'capability' && <span className="pm-tile-tag">capability</span>}
                              {treatment === 'direct' && <span className="pm-tile-tag direct">direct</span>}
                              <span className={`pm-tile-status ${statusClass}`}>{statusText}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {tab === 'integrations' && intSection === 'connections' && activeMethod && methodDetail && (() => {
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

                  {(() => {
                    const cat = methodsCatalog.find((m) => m.id === md.id) || {};
                    if (cat.treatment !== 'capability') return null;
                    const via = (cat.available_via || []).map((v) => v.name);
                    return (
                      <div className="cap-explainer">
                        <div className="cap-explainer-title">This turns on through a processor</div>
                        {via.length ? (
                          <p>
                            {md.name} isn&apos;t connected on its own — it rides on top of a card processor.
                            Connect <strong>{via.join(' or ')}</strong> and enable it there, and {md.name} becomes
                            available automatically at checkout for customers whose device supports it.
                          </p>
                        ) : (
                          <p>
                            {md.name} rides on top of a card processor. None of your connectable providers
                            expose it yet — connect a provider that supports {md.name} and it will turn on here.
                          </p>
                        )}
                        {via.length > 0 && (
                          <button className="con-connect-btn" type="button" style={{ marginTop: 12 }}
                            onClick={() => {
                              const processor = cat.available_via[0] || {};
                              // Land on the Cards method (which this processor provides) and
                              // auto-open that processor's connect form, so the button lands
                              // exactly where the developer connects it.
                              setActiveMethod('card');
                              setConnectingId(processor.id);
                              setCredValues({});
                              setConnectError('');
                            }}>
                            Connect {via[0]}
                          </button>
                        )}
                      </div>
                    );
                  })()}

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
                                        value={credValues[field.name] || (field.required ? '' : (field.options || [])[0] || '')}
                                        onChange={(e) => setCredValues((v) => ({ ...v, [field.name]: e.target.value }))}>
                                        {field.required && <option value="">Select…</option>}
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
                                  onClick={() => connectProvider(c.id, c.credential_schema?.fields || [])}
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

            {tab === 'integrations' && intSection === 'connections' && !activeMethod && (
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
                      onClick={() => { setTab('integrations'); setIntSection('connections'); setActiveCategory(null); }}>
                      Connect a provider
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

            {tab === 'integrations' && intSection === 'languages' && (
              <div className="lang-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Languages</h1>
                  <p className="con-sub">
                    Pick your language to see how to create a payment with Konduyt. Then grab your keys below.
                  </p>
                </div>

                <div className="lang-chips">
                  {LANG_SNIPPETS.map((l) => {
                    const brand = LANG_BRAND[l.icon] || '#0a0a0a';
                    const selected = langTab === l.id;
                    return (
                      <button key={l.id} type="button"
                        className={`lang-chip ${selected ? 'sel' : ''}`}
                        style={{ '--brand': brand }}
                        onClick={() => setLangTab(l.id)}>
                        {LANG_ICONS[l.icon] && (
                          <span className="lang-chip-icon"
                            dangerouslySetInnerHTML={{ __html: LANG_ICONS[l.icon] }} />
                        )}
                        {l.label}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const lang = LANG_SNIPPETS.find((l) => l.id === langTab) || LANG_SNIPPETS[0];
                  const env = ENV_SETUP[lang.icon] || {};
                  const isPlatform = Boolean(lang.platform);
                  return (
                    <>
                    {/* First-time .env setup — simple, no room for confusion */}
                    <div className="env-setup">
                      <button className="env-setup-head" type="button" onClick={() => setEnvOpen((o) => !o)}>
                        <span>{isPlatform ? 'Where does the secret key go?' : 'New to .env files? Set one up (2 minutes)'}</span>
                        <span className="env-setup-chevron">{envOpen ? '▲' : '▼'}</span>
                      </button>
                      {envOpen && (
                        <div className="env-setup-body">
                          {isPlatform ? (
                            <p className="env-p">
                              {lang.platform} apps are installed on your customers&apos; devices, and anything
                              shipped inside the app can be extracted — so the secret key must <strong>never</strong> live
                              in the app. Keep it on <strong>your own server</strong>: your app calls your server, and your
                              server (holding the key) calls Konduyt. {env.loaderNote}
                            </p>
                          ) : (
                            <>
                              <div className="env-step">
                                <span className="env-step-n">1</span>
                                <div>
                                  <div className="env-step-title">Put a file called <code className="inline-code">.env</code> at your project root</div>
                                  <p className="env-p">That&apos;s the top folder of your project — the same place as your <code className="inline-code">{env.rootFile || 'main file'}</code>. Not inside a subfolder.</p>
                                  <pre className="env-tree"><code>{`your-project/            ${'\u2190'} project root — .env goes HERE
${'\u251C\u2500\u2500'} .env                 ${'\u2190'} create it here${env.rootFile ? `
${'\u251C\u2500\u2500'} ${env.rootFile}` : ''}
${'\u251C\u2500\u2500'} src/
${'\u2502'}   ${'\u2514\u2500\u2500'} ... your code
${'\u2514\u2500\u2500'} ...`}</code></pre>
                                </div>
                              </div>

                              <div className="env-step">
                                <span className="env-step-n">2</span>
                                <div>
                                  <div className="env-step-title">Create the file</div>
                                  <p className="env-p"><strong>In VS Code:</strong> {ENV_STEPS.create_vscode}</p>
                                  <p className="env-p"><strong>In the terminal</strong> (from your project root):</p>
                                  <pre className="env-tree"><code>{`# macOS / Linux
${ENV_STEPS.create_terminal_mac}

# Windows
${ENV_STEPS.create_terminal_win}`}</code></pre>
                                  <p className="env-p env-warn">The filename is exactly <code className="inline-code">.env</code> — a dot, then &quot;env&quot;. No name before the dot, no <code className="inline-code">.txt</code> after.</p>
                                </div>
                              </div>

                              <div className="env-step">
                                <span className="env-step-n">3</span>
                                <div>
                                  <div className="env-step-title">Paste this line inside it</div>
                                  <p className="env-p">No spaces around the <code className="inline-code">=</code>. No quotes. One key per line:</p>
                                  <pre className="env-tree"><code>KONDUYT_SECRET_KEY=kdu_live_sk_your_key_here</code></pre>
                                </div>
                              </div>

                              <div className="env-step">
                                <span className="env-step-n">4</span>
                                <div>
                                  <div className="env-step-title">Never commit it — add it to <code className="inline-code">.gitignore</code></div>
                                  <p className="env-p">In a file called <code className="inline-code">.gitignore</code> at the same root, add one line:</p>
                                  <pre className="env-tree"><code>.env</code></pre>
                                </div>
                              </div>

                              {env.loader && (
                                <div className="env-step">
                                  <span className="env-step-n">5</span>
                                  <div>
                                    <div className="env-step-title">Load it in your code</div>
                                    <p className="env-p">A <code className="inline-code">.env</code> file doesn&apos;t load itself. Install the loader:</p>
                                    <pre className="env-tree"><code>{env.loader}</code></pre>
                                    <p className="env-p">{env.loaderNote}</p>
                                  </div>
                                </div>
                              )}
                              {!env.loader && env.loaderNote && (
                                <p className="env-p" style={{ marginTop: 4 }}>{env.loaderNote}</p>
                              )}

                              <p className="env-p env-host">On your host (Cloudflare / Render / Vercel) there is no <code className="inline-code">.env</code> file — instead, add <code className="inline-code">KONDUYT_SECRET_KEY</code> under the project&apos;s Settings → Environment Variables. The <code className="inline-code">.env</code> file is just for your own computer.</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="lang-blocks">
                      {lang.platform && (
                        <div className="lang-platform-note">Platform: {lang.platform}</div>
                      )}
                      {lang.sections.map((sec, i) => {
                        const code = sec.code.replaceAll('{{API}}', API_BASE);
                        const copyId = `lang_${lang.id}_${i}`;
                        return (
                          <div className="lang-block" key={i}>
                            <div className="lang-block-head">
                              <span className="lang-block-title">{sec.title}</span>
                              <button className="keys-code-copy static" type="button"
                                onClick={() => copyToClipboard(code, copyId)}>
                                {copied === copyId ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <div className="keys-codeblock">
                              <pre><code>{code}</code></pre>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  );
                })()}

                {/* Keys — mode toggle (test / live). Both work from signup. */}
                {keys && keys.live && (() => {
                  const k = keys.live;
                  return (
                  <div className="keys-panel" style={{ marginTop: 24 }}>
                    <div className="keys-head">
                      <h3>Your API keys</h3>
                      <span className="keys-mode live-badge">Live</span>
                    </div>
                    <div className="keys-row stacked">
                      <div className="keys-field">
                        <label>Publishable key</label>
                        <div className="keys-value">
                          <code>{k.publishable_key}</code>
                          <button className="keys-copy" type="button"
                            onClick={() => copyToClipboard(k.publishable_key, 'pub')}>
                            {copied === 'pub' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="keys-field">
                        <label>Secret key</label>
                        <div className="keys-value">
                          <code>{showSecret ? (k.secret || k.secret_masked) : k.secret_masked}</code>
                          <button className="keys-copy danger" type="button"
                            onClick={revokeSecret}>
                            Revoke
                          </button>
                          <button className="keys-copy" type="button"
                            onClick={() => setShowSecret((s) => !s)}>
                            {showSecret ? 'Hide' : 'Reveal'}
                          </button>
                          <button className="keys-copy" type="button"
                            onClick={() => k.secret && copyToClipboard(k.secret, 'sec')}>
                            {copied === 'sec' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="keys-note">
                      Keep your secret key server-side. Never ship it to a browser or commit it.
                    </p>

                    {/* You cannot receive money without connecting a provider */}
                    <div className={`keys-connect-note ${projectStatus && projectStatus.live ? 'ok' : ''}`}>
                      {projectStatus && projectStatus.live ? (
                        <span>✓ This project can receive money — a provider is connected and a method is enabled.</span>
                      ) : (
                        <span>
                          <strong>You cannot receive money yet.</strong> Your keys work, but a payment needs
                          somewhere to go. Go to <button className="link-inline" type="button"
                            onClick={() => setIntSection('connections')}>Connections</button>, connect a
                          provider account and enable a payment method — until then, payment attempts will
                          fail with <code className="inline-code">no_provider_connected</code>.
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })()}
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
                    <span className="con-setting-k">Merchant country</span>
                    <span className="con-setting-v">
                      <select
                        className="con-connect-input"
                        style={{ maxWidth: 260 }}
                        value={active?.merchant_country || ''}
                        disabled={savingCountry}
                        onChange={(e) => saveMerchantCountry(e.target.value)}
                      >
                        <option value="">Not set — showing all providers</option>
                        {MERCHANT_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </span>
                  </div>
                  <p className="con-setting-note">
                    Your merchant country decides which payment providers you can actually connect —
                    Konduyt shows only providers that onboard merchants where you operate, then resolves
                    the right one behind each payment method. Change it any time; the Connections list updates.
                  </p>
                  <div className="con-setting-row">
                    <span className="con-setting-k">Live keys</span>
                    <span className="con-setting-v">Active from signup</span>
                  </div>
                  <p className="con-setting-note">
                    Webhooks, domains, tax settings and delete-project controls will expand here in later milestones.
                  </p>
                </div>
              </div>
            )}
        </>
      </main>
    </div>
  );
}
