'use client';

// Konduyt Growth Agents -- the Growth surface, rendered under
// Dashboard -> Analytics -> Growth.
//
// This component only DISPLAYS and CONTROLS. Every decision (qualification,
// scoring, suppression, scheduling, whether a send is allowed) happens in the
// backend at /growth/*; the UI never re-implements a rule, so the two can never
// disagree about what a prospect's state means.
//
// The surface is exactly four tabs -- the four areas the product is organised
// around: Sources (where prospects come from), Prospects (the working
// spreadsheet), Approvals (the human gate) and Conversations (what was said,
// and what it led to). There is no secondary menu: any other surface is gone,
// not hidden.

import { useState, useEffect, useCallback } from 'react';

// The four tabs, in order. Nothing outside this list is a Growth surface.
const PRIMARY_VIEWS = [
  ['sources', 'Sources'],
  ['prospects', 'Prospects'],
  ['approvals', 'Approvals'],
  ['conversations', 'Conversations'],
];

function fmt(v) {
  if (v === null || v === undefined || v === '') return '—';
  return v;
}
function fmtDate(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleString(); } catch (e) { return String(v); }
}
function levelClass(level) {
  const l = (level || '').toUpperCase();
  if (l === 'HIGH') return 'growth-pill growth-pill-high';
  if (l === 'MEDIUM') return 'growth-pill growth-pill-med';
  if (l === 'LOW') return 'growth-pill growth-pill-low';
  return 'growth-pill growth-pill-unknown';
}

export default function GrowthTab({ apiBase, authHeaders, onError }) {
  const [view, setView] = useState(() => {
    // Deep link support: `?growth=<tab>` opens on that tab. Only the four tabs
    // exist, so anything else falls back to the first (Sources).
    if (typeof window === 'undefined') return 'sources';
    const v = new URLSearchParams(window.location.search).get('growth');
    return PRIMARY_VIEWS.some(([id]) => id === v) ? v : 'sources';
  });
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [engine, setEngine] = useState(null);

  const api = useCallback(async (path, opts = {}) => {
    const r = await fetch(`${apiBase}/growth${path}`, {
      ...opts,
      headers: { ...authHeaders(), ...(opts.headers || {}) },
    });
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { const d = await r.json(); msg = d.detail?.message || d.message || msg; } catch (e) {}
      throw new Error(msg);
    }
    const ct = r.headers.get('content-type') || '';
    return ct.startsWith('application/json') ? r.json() : r.text();
  }, [apiBase, authHeaders]);

  const loadEngine = useCallback(async () => {
    try {
      const s = await api('/live');
      setEngine(s.engine);
    } catch (e) { /* the engine badge reports its own state */ }
  }, [api]);

  useEffect(() => { loadEngine(); }, [loadEngine]);

  async function toggleEngine(paused) {
    setBusy('engine');
    try {
      const res = await api(paused ? '/engine/pause' : '/engine/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paused ? { reason: 'Paused from dashboard' } : {}),
      });
      setEngine(res);
      setNotice(paused
        ? 'Growth Engine paused. No agent work runs while paused; resume to continue.'
        : 'Growth Engine resumed. Agents will continue on their own schedules.');
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  return (
    <div className="growth-root">
      <div className="con-home-head con-home-head-row" style={{ marginBottom: 4 }}>
        <div>
          <h1 className="con-h1">Growth</h1>
          <p className="con-sub">
            A continuous acquisition engine: it finds developers and businesses with a real
            payment-integration problem, identifies the right person, starts legitimate
            conversations, and measures what converts.
          </p>
        </div>
        <div className="growth-head-actions">
          <GmailControl api={api} onError={onError} />
          <EngineBadge engine={engine} busy={busy === 'engine'}
            onToggle={toggleEngine} />
        </div>
      </div>

      <nav className="con-tabs" style={{ marginBottom: 16 }}>
        {PRIMARY_VIEWS.map(([id, label]) => (
          <button key={id} type="button"
            className={view === id ? 'con-tab active' : 'con-tab'}
            onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>

      {notice && <p className="con-sub" style={{ marginBottom: 12 }}>{notice}</p>}

      {view === 'sources' && <Sources api={api} onError={onError} />}
      {view === 'prospects' && <Prospects api={api} onError={onError} />}
      {view === 'approvals' && <Approvals api={api} onError={onError} />}
      {view === 'conversations' && <Conversations api={api} onError={onError} />}
    </div>
  );
}

// Gmail connection -- a compact control in the Growth header, replacing the
// Settings page that used to hold it. Connecting the account and enabling
// sending are two separate steps: connect uses Google OAuth and the refresh
// token is stored encrypted server-side, so nothing sensitive reaches the
// browser. Until both are done, every message is queued as a draft.
function GmailControl({ api, onError }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try { setStatus(await api('/email/status')); }
    catch (e) { /* the control simply stays in its loading state */ }
  }, [api]);
  useEffect(() => {
    // Surface the result of the Gmail OAuth redirect back from the API.
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('gmail') === 'connected') setNotice('Gmail connected.');
      else if (q.get('gmail') === 'error') {
        setNotice(`Gmail connection failed: ${q.get('reason') || 'unknown'}`);
      }
    }
    load();
  }, [load]);

  async function connect() {
    setBusy('connect');
    try {
      const r = await api('/email/oauth/start');
      if (r && r.authorize_url && typeof window !== 'undefined') {
        window.location.href = r.authorize_url;
        return;
      }
      onError && onError('No authorize URL returned');
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }
  async function disconnect() {
    // Both endpoints describe the same connection and either can fail alone.
    // Refresh regardless: when the first failed call threw out of the handler,
    // load() never ran and the control kept showing the stale "connected" value.
    let err = null;
    setBusy('disconnect');
    try { await api('/email/disconnect', { method: 'POST' }); }
    catch (e) { err = e; }
    try { await api('/channels/email/disconnect', { method: 'POST' }); }
    catch (e) { err = err || e; }
    await load();
    setBusy('');
    if (err) onError && onError(err.message);
  }
  async function setSending(enabled) {
    setBusy('sending');
    try {
      await api('/email/sending', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }) });
      await load();
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  const email = (status && status.email) || {};
  const connected = email.connection_status === 'connected';
  const canRead = status && status.inbox_read && status.inbox_read.can_read;

  return (
    <div className="growth-gmail">
      <span className="growth-gmail-state">
        <b>Gmail</b>{' '}
        {status
          ? (connected
            ? <>connected{email.connected_account ? ` · ${email.connected_account}` : ''}</>
            : 'not connected')
          : '…'}
        {connected && (
          <span className="con-sub">
            {canRead ? ' · replies readable' : ' · replies not readable'}
          </span>
        )}
      </span>
      {notice && <span className="con-sub">{notice}</span>}
      {!status ? null : connected ? (
        <>
          <label className="growth-gmail-toggle"
            title="Queue drafts until connected and enabled">
            <input type="checkbox" checked={!!email.sending_enabled}
              disabled={busy === 'sending'} onChange={(e) => setSending(e.target.checked)} />
            sending
          </label>
          <button className="preview-checkout-btn" type="button" disabled={busy === 'connect'}
            onClick={connect}
            title="Re-run Google consent to grant a new scope (e.g. inbox read) without disconnecting">
            Reconnect</button>
          <button className="preview-checkout-btn" type="button" disabled={busy === 'disconnect'}
            onClick={disconnect}>Disconnect</button>
        </>
      ) : (
        <button className="preview-checkout-btn" type="button" disabled={busy === 'connect'}
          onClick={connect}
          title="Start the real Google OAuth flow">Connect Gmail</button>
      )}
    </div>
  );
}

function EngineBadge({ engine, busy, onToggle }) {
  if (!engine) return <span className="growth-engine-badge growth-engine-idle">Growth Engine: …</span>;
  const on = engine.running;
  const label = engine.enabled
    ? (engine.paused ? 'Growth Engine: PAUSED' : 'Growth Engine: ON')
    : 'Growth Engine: OFF';
  return (
    <button type="button" disabled={busy}
      className={`growth-engine-badge ${on ? 'on' : 'off'}`}
      onClick={() => onToggle(on)}
      title={engine.pause_reason ? `Paused: ${engine.pause_reason}` : 'Click to toggle continuous operation'}>
      <span className={`growth-engine-dot ${on ? 'on' : 'off'}`} />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Shared stat tile -- the labelled number used across the four tabs
// ---------------------------------------------------------------------------
function Stat({ label, value, hint }) {
  return (
    <div className="growth-stat">
      <div className="growth-stat-v">{fmt(value)}</div>
      <div className="growth-stat-l">{label}</div>
      {hint && <div className="growth-stat-h">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prospects (the spreadsheet)
// ---------------------------------------------------------------------------
function Prospects({ api, onError }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', status: '', type: '', fit: '', intent: '' });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [detail, setDetail] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ limit: '100' });
    Object.entries(filters).forEach(([k, v]) => { if (v) q.set(k, v); });
    try {
      const res = await api(`/prospects?${q.toString()}`);
      setRows(res.rows || []); setTotal(res.total || 0);
    } catch (e) { onError && onError(e.message); }
    setLoading(false);
  }, [api, filters, onError]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id) {
    try { setDetail(await api(`/prospects/${id}`)); }
    catch (e) { onError && onError(e.message); }
  }
  async function setStatus(id, status) {
    try { await api(`/prospects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); load(); if (detail) openDetail(id); }
    catch (e) { onError && onError(e.message); }
  }
  async function bulk(action, value) {
    try {
      await api('/prospects/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prospect_ids: selected, action, value }) });
      setSelected([]); load();
    } catch (e) { onError && onError(e.message); }
  }
  function toggle(id) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  return (
    <div>
      <div className="growth-toolbar">
        <input className="growth-input" placeholder="Search name, company, email, handle…"
          value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className="growth-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {['NEW', 'RESEARCHING', 'NURTURE', 'QUALIFIED', 'READY_FOR_OUTREACH', 'CONTACTED', 'FOLLOW_UP', 'REPLIED', 'INTERESTED', 'DEMO_REQUESTED', 'SIGNED_UP', 'PROVIDER_CONNECTED', 'ACTIVATED', 'CONVERTED', 'NOT_INTERESTED', 'REJECTED', 'DO_NOT_CONTACT'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="growth-input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option><option value="DEVELOPER">Developer</option><option value="BUSINESS">Business</option>
        </select>
        <select className="growth-input" value={filters.intent} onChange={(e) => setFilters({ ...filters, intent: e.target.value })}>
          <option value="">Any intent</option><option value="HIGH">High intent</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option>
        </select>
        <button className="preview-checkout-btn" type="button" onClick={() => setShowAdd(true)}>+ Add</button>
        <button className="preview-checkout-btn" type="button" onClick={() => setShowImport(true)}>Import CSV</button>
        <button className="preview-checkout-btn" type="button" onClick={() => exportCsv(api)}>Export CSV</button>
      </div>

      {selected.length > 0 && (
        <div className="growth-toolbar" style={{ background: 'rgba(124,156,255,0.08)' }}>
          <span className="con-sub">{selected.length} selected</span>
          <button className="preview-checkout-btn" type="button" onClick={() => bulk('tag', 'high-intent')}>Tag high-intent</button>
          <button className="preview-checkout-btn" type="button" onClick={() => bulk('reject')}>Reject</button>
          <button className="preview-checkout-btn" type="button" onClick={() => bulk('do_not_contact')}>Do not contact</button>
        </div>
      )}

      <p className="con-sub">{total} prospect{total === 1 ? '' : 's'}{loading ? ' · loading…' : ''}</p>

      <div className="growth-table-wrap">
        <table className="growth-table">
          <thead>
            <tr>
              <th></th><th>Name</th><th>Company</th><th>Type</th><th>Country</th>
              <th>Providers</th><th>Fit</th><th>Intent</th><th>Status</th><th>Source</th><th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="growth-row" onClick={() => openDetail(p.id)}>
                <td onClick={(e) => { e.stopPropagation(); toggle(p.id); }}>
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                </td>
                <td>{fmt(p.display_name)}</td>
                <td>{fmt(p.company)}</td>
                <td>{p.prospect_type}</td>
                <td>{fmt(p.country_code)}</td>
                <td>{(p.payment_providers || []).join(', ') || '—'}</td>
                <td><span className={levelClass(p.fit)}>{p.fit || '—'}</span></td>
                <td><span className={levelClass(p.intent)}>{p.intent || '—'}</span></td>
                <td>{p.status}</td>
                <td>{fmt(p.first_touch_source)}</td>
                <td>{fmtDate(p.last_activity_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan="11" className="con-sub" style={{ padding: 16 }}>
                No prospects match. Add one manually, import a CSV, or wait for discovery.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && <ProspectDrawer detail={detail} onClose={() => setDetail(null)} onStatus={setStatus} />}
      {showImport && <ImportModal api={api} onClose={() => { setShowImport(false); load(); }} onError={onError} />}
      {showAdd && <AddModal api={api} onClose={() => { setShowAdd(false); load(); }} onError={onError} />}
    </div>
  );
}

function exportCsv(api) {
  // Use the same auth as the rest of the dashboard; open as a blob download.
  api('/export.csv').then((text) => {
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'growth-prospects.csv'; a.click();
    URL.revokeObjectURL(url);
  }).catch(() => {});
}

function ProspectDrawer({ detail, onClose, onStatus }) {
  const p = detail.prospect || {};
  const dims = p.scores || {};
  return (
    <div className="growth-drawer-backdrop" onClick={onClose}>
      <div className="growth-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="con-home-head-row">
          <h2 className="an-section-h" style={{ marginBottom: 0 }}>{fmt(p.display_name)}</h2>
          <button className="preview-checkout-btn" type="button" onClick={onClose}>Close</button>
        </div>
        <p className="con-sub">{fmt(p.company)} · {fmt(p.role)} · {fmt(p.country_code)}</p>

        <div className="growth-drawer-grid">
          <div><b>Status</b><div>{p.status}</div></div>
          <div><b>Fit</b><div><span className={levelClass(p.fit)}>{p.fit || '—'}</span></div></div>
          <div><b>Intent</b><div><span className={levelClass(p.intent)}>{p.intent || '—'}</span></div></div>
          <div><b>Evidence strength</b><div><span className={levelClass(p.evidence_strength)}>{p.evidence_strength || '—'}{p.evidence_score != null ? ` (${p.evidence_score})` : ''}</span></div></div>
          <div><b>Ranking</b><div>{p.ranking_score != null ? p.ranking_score : '—'}</div></div>
          <div><b>Ownership</b><div>{fmt(p.ownership)}</div></div>
          <div><b>Confidence</b><div>{fmt(p.confidence)}</div></div>
          <div><b>Email</b><div>{fmt(p.email)}</div></div>
          <div><b>Website</b><div>{p.website ? <a href={p.website} target="_blank" rel="noreferrer">{p.website}</a> : '—'}</div></div>
          <div><b>X</b><div>{fmt(p.x_handle)}</div></div>
          <div><b>GitHub</b><div>{fmt(p.github_username)}</div></div>
          <div><b>Reddit</b><div>{fmt(p.reddit_username)}</div></div>
          <div><b>Source</b><div>{fmt(p.first_touch_source)}</div></div>
        </div>

        {p.why_this_prospect && (
          <div className="an-section">
            <h3 className="an-section-h">Why this prospect</h3>
            <p className="con-sub">{p.why_this_prospect}</p>
            {(p.ranking_reasons || []).length > 0 && (
              <div className="growth-dims">
                {(p.ranking_reasons || []).map((r, i) => (
                  <div key={i} className="growth-dim">
                    <span className="growth-dim-name">{(r.factor || '').replace(/_/g, ' ')}</span>
                    <span className="growth-dim-reason">{r.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(p.pain_signals || []).length > 0 && (
          <div className="an-section">
            <h3 className="an-section-h">Pain signals</h3>
            <div className="growth-toolbar">
              {(p.pain_signals || []).map((s, i) => (
                <span key={i} className="con-sub">{s.category} · {s.severity}</span>
              ))}
            </div>
          </div>
        )}

        {p.qualification_reason && (
          <div className="an-section">
            <h3 className="an-section-h">Why we qualified this</h3>
            <p className="con-sub">{p.qualification_reason}</p>
            <div className="growth-dims">
              {Object.entries(dims).map(([k, d]) => (
                <div key={k} className="growth-dim">
                  <span className="growth-dim-name">{k.replace(/_/g, ' ')}</span>
                  <span className={levelClass(d.level)}>{d.level}</span>
                  <span className="growth-dim-reason">{d.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="an-section">
          <h3 className="an-section-h">Evidence ({detail.evidence?.length || 0})</h3>
          {(detail.evidence || []).map((e) => (
            <div key={e.id} className="growth-evidence">
              <a href={e.url} target="_blank" rel="noreferrer">{e.title || e.url}</a>
              <div className="con-sub">{(e.excerpt || '').slice(0, 240)}</div>
              <div className="con-sub">{fmt(e.source)} · {fmtDate(e.source_date || e.collected_at)}</div>
            </div>
          ))}
        </div>

        <div className="an-section">
          <h3 className="an-section-h">Timeline</h3>
          {(detail.timeline || []).map((t) => (
            <div key={t.id} className="growth-timeline-row">
              <span className="growth-activity-kind">{t.kind}</span>
              <span className="growth-activity-agent">{t.agent || 'system'}</span>
              <span className="growth-activity-body">{(t.body || '').slice(0, 200)}</span>
              <span className="growth-activity-time">{fmtDate(t.occurred_at)}</span>
            </div>
          ))}
        </div>

        <div className="an-section">
          <h3 className="an-section-h">Change status</h3>
          <div className="growth-toolbar">
            {['QUALIFIED', 'CONTACTED', 'REPLIED', 'INTERESTED', 'SIGNED_UP', 'ACTIVATED', 'NOT_INTERESTED', 'DO_NOT_CONTACT'].map((s) => (
              <button key={s} className="preview-checkout-btn" type="button" onClick={() => onStatus(p.id, s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ api, onClose, onError }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  async function submit() {
    try {
      const res = await api('/import.csv', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text });
      setResult(res);
    } catch (e) { onError && onError(e.message); }
  }
  return (
    <div className="growth-drawer-backdrop" onClick={onClose}>
      <div className="growth-drawer" onClick={(e) => e.stopPropagation()}>
        <h2 className="an-section-h">Import CSV</h2>
        <p className="con-sub">Columns: name, email, website, company, role, country, type, x, github, reddit.</p>
        <textarea className="growth-input" rows={10} style={{ width: '100%', fontFamily: 'monospace' }}
          value={text} onChange={(e) => setText(e.target.value)} placeholder="name,email,website&#10;Acme,two@acme.example,https://acme.example" />
        <div className="growth-toolbar">
          <button className="preview-checkout-btn" type="button" onClick={submit}>Import</button>
          <button className="preview-checkout-btn" type="button" onClick={onClose}>Done</button>
        </div>
        {result && <p className="con-sub">Created {result.created}, updated {result.updated}.</p>}
      </div>
    </div>
  );
}

function AddModal({ api, onClose, onError }) {
  const [form, setForm] = useState({ display_name: '', company: '', email: '', website: '', evidence_url: '', signal_summary: '', country_code: '', role: '' });
  const set = (k, v) => setForm({ ...form, [k]: v });
  async function submit() {
    try {
      await api('/prospects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      onClose();
    } catch (e) { onError && onError(e.message); }
  }
  return (
    <div className="growth-drawer-backdrop" onClick={onClose}>
      <div className="growth-drawer" onClick={(e) => e.stopPropagation()}>
        <h2 className="an-section-h">Add prospect</h2>
        {[['display_name', 'Name *'], ['company', 'Company'], ['role', 'Role'], ['country_code', 'Country code'],
          ['website', 'Website'], ['email', 'Email'], ['evidence_url', 'Evidence URL'], ['signal_summary', 'What did you see?']].map(([k, label]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <label className="con-sub">{label}</label>
            <input className="growth-input" style={{ width: '100%' }} value={form[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
        <div className="growth-toolbar">
          <button className="preview-checkout-btn" type="button" disabled={!form.display_name} onClick={submit}>Add</button>
          <button className="preview-checkout-btn" type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversations -- what was sent, what came back, and what it led to
//
// The product asked for one place to see sent messages, delivery status,
// replies, follow-ups, objections, opt-outs and conversion progress. Every row
// is a real interaction joined to its prospect; the summary counts come from
// GET /growth/analytics (outreach + queue), so the view and the backend cannot
// disagree. An unknown value renders as an em dash, never a guess.
// ---------------------------------------------------------------------------
const CONVERSATION_FILTERS = [
  ['all', 'All'],
  ['EMAIL_SENT', 'Sent'],
  ['EMAIL_DELIVERED', 'Delivered'],
  ['EMAIL_REPLY', 'Replies'],
  ['EMAIL_FAILED', 'Failed'],
  ['FOLLOW_UP', 'Follow-ups'],
  ['SUPPRESSION', 'Opt-outs'],
  ['SOCIAL_ACTION', 'Social'],
  ['SOCIAL_REPLY', 'Social replies'],
  ['NOTE', 'Notes'],
];

const KIND_LABEL = {
  EMAIL_SENT: 'Sent', EMAIL_DELIVERED: 'Delivered', EMAIL_REPLY: 'Reply',
  EMAIL_FAILED: 'Failed', EMAIL_QUEUED: 'Queued', FOLLOW_UP: 'Follow-up',
  SUPPRESSION: 'Opt-out', SOCIAL_ACTION: 'Social', SOCIAL_REPLY: 'Social reply',
  NOTE: 'Note',
};

function Conversations({ api, onError }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [filter, setFilter] = useState('all');
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, an] = await Promise.all([
        api('/conversations?limit=300'),
        api('/analytics').catch(() => null),
      ]);
      setRows(d.conversations || []);
      setSummary(an);
    } catch (e) { onError && onError(e.message); }
    setLoading(false);
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  // A row is shown when it matches the selected kind (or "all") AND the free
  // text, which searches the prospect and the message body.
  const shown = rows.filter((r) => {
    if (filter !== 'all' && r.kind !== filter) return false;
    if (!text.trim()) return true;
    const t = text.toLowerCase();
    return [r.display_name, r.company, r.body, r.detail, r.summary, r.channel]
      .some((v) => String(v || '').toLowerCase().includes(t));
  });

  const q = (summary && summary.outreach && summary.outreach.queue) || {};
  const sending = (summary && summary.outreach && summary.outreach.sending) || {};
  const supp = (summary && summary.outreach && summary.outreach.suppression) || {};
  const inbox = (summary && summary.outreach && summary.outreach.inbox) || {};
  const ledger = sending.ledger || {};
  const countByKind = (kind) => rows.filter((r) => r.kind === kind).length;

  // Poll the mailbox for replies now, then re-read so the new rows appear
  // without waiting for the scheduler. This is the only manual trigger for
  // inbound ingestion; a reply that is never polled is never seen.
  async function pollNow() {
    setPolling(true);
    try {
      await api('/inbox/poll', { method: 'POST' });
      await load();
    } catch (e) { onError && onError(e.message); }
    setPolling(false);
  }

  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Conversations</h2>
        <p className="con-sub">
          Every two-way exchange, newest first: what was sent, what came back, and who it
          was with. These are the real interaction rows — nothing here is estimated.
        </p>

        {/* Delivery + conversation summary, counted from the same backend read. */}
        <div className="growth-stats">
          <Stat label="Sent" value={countByKind('EMAIL_SENT')}
            hint={`${fmt(ledger.SENT)} accepted by the provider`} />
          <Stat label="Delivered" value={countByKind('EMAIL_DELIVERED')}
            hint="provider-confirmed delivery" />
          <Stat label="Replies" value={countByKind('EMAIL_REPLY')}
            hint={inbox.can_read ? 'inbox readable' : 'inbox not readable'} />
          <Stat label="Failed" value={countByKind('EMAIL_FAILED')}
            hint={`${fmt(ledger.FAILED)} in the send ledger`} />
          <Stat label="Follow-ups due" value={fmt(q.followups_pending)}
            hint={`${fmt(q.stuck)} waiting over 24h`} />
          <Stat label="Opt-outs" value={fmt(supp.optouts)}
            hint={`${fmt(supp.total)} suppressions total`} />
          <Stat label="Approvals pending" value={fmt(q.pending_email)} hint="email drafts waiting" />
          <Stat label="Duplicate sends prevented" value={fmt(ledger.suppressed)}
            hint="never emailed twice" />
        </div>
        {inbox.can_read === false && (
          <p className="con-sub" style={{ color: '#b45309' }}>
            The connected mailbox cannot be read, so replies cannot be detected — a zero reply
            count here is missing data, not evidence. Reconnect Gmail with the inbox read scope
            {(inbox.missing_scopes && inbox.missing_scopes.length)
              ? ` (missing: ${inbox.missing_scopes.join(', ')})` : ''} above.
          </p>
        )}

        <div className="growth-toolbar" style={{ marginBottom: 8 }}>
          <div className="growth-filter-chips">
            {CONVERSATION_FILTERS.map(([id, label]) => (
              <button key={id} type="button"
                className={filter === id ? 'growth-chip active' : 'growth-chip'}
                onClick={() => setFilter(id)}>
                {label}
                {id !== 'all' ? ` (${countByKind(id)})` : ` (${rows.length})`}
              </button>
            ))}
          </div>
          <input className="growth-input" placeholder="Search prospect or message…"
            value={text} onChange={(e) => setText(e.target.value)} />
          <button className="preview-checkout-btn" type="button" onClick={pollNow}
            disabled={polling || !inbox.can_read}
            title={inbox.can_read ? 'Read the mailbox for new replies now'
              : 'Grant inbox read access first'}>
            {polling ? 'Checking…' : 'Check for replies'}
          </button>
          <button className="preview-checkout-btn" type="button" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {shown.length === 0 ? (
          <p className="con-sub">
            {rows.length === 0 ? 'No conversations recorded yet.' : 'No conversation matches this filter.'}
          </p>
        ) : (
          <div className="growth-table-wrap">
            <table className="growth-table">
              <thead>
                <tr><th>When</th><th>Kind</th><th>Channel</th><th>Prospect</th>
                  <th>Status</th><th>Detail</th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.occurred_at)}</td>
                    <td><span className={`growth-pill ${r.kind === 'EMAIL_REPLY' ? 'growth-pill-high' : 'growth-pill-unknown'}`}>
                      {KIND_LABEL[r.kind] || r.kind}</span></td>
                    <td>{fmt(r.channel)}</td>
                    <td>{fmt(r.display_name)}{r.company ? ` · ${r.company}` : ''}</td>
                    <td>{fmt(r.prospect_status)}</td>
                    <td className="growth-activity-body">{fmt(r.body || r.detail || r.summary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conversion progress: the stages after a conversation, as real counts. */}
      {summary && summary.overview && (
        <div className="an-section">
          <h2 className="an-section-h">Conversion progress</h2>
          <p className="con-sub">Where the people we talked to have got to, counted from real rows.</p>
          <div className="growth-stats">
            <Stat label="Contacted" value={fmt(summary.overview.contacted)} />
            <Stat label="Replies" value={fmt(summary.overview.replies)} />
            <Stat label="Interested" value={fmt(summary.overview.interested)} />
            <Stat label="Signups" value={fmt(summary.overview.signups)} />
            <Stat label="Activated" value={fmt(summary.overview.activated)} />
          </div>
        </div>
      )}

      {/* Objections and opt-outs: what stopped a conversation, and why. */}
      <div className="an-section">
        <h2 className="an-section-h">Objections &amp; opt-outs</h2>
        <p className="con-sub">
          A reply of any sentiment ends the outreach sequence; a negative reply or an
          unsubscribe also suppresses the address, so it is never contacted again. These are
          the recorded reasons, from the suppression list.
        </p>
        {Object.keys(supp.by_reason || {}).length === 0
          ? <p className="con-sub">No suppression recorded yet.</p>
          : (
            <div className="growth-stats">
              {Object.entries(supp.by_reason || {}).map(([reason, n]) => (
                <Stat key={reason} label={reason} value={n} />
              ))}
            </div>
          )}
        {(sending.failure_reasons || []).length > 0 && (
          <>
            <h3 className="an-sub-h">Why sends failed</h3>
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>Kind</th><th>Reason</th><th>Count</th><th>Last seen</th></tr></thead>
                <tbody>
                  {sending.failure_reasons.map((f, i) => (
                    <tr key={i}>
                      <td>{fmt(f.kind)}</td><td>{fmt(f.reason)}</td>
                      <td>{fmt(f.count)}</td><td>{fmtDate(f.last_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approvals -- the human gate
// ---------------------------------------------------------------------------
function Approvals({ api, onError, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [windowMin, setWindowMin] = useState(30);
  const [ledger, setLedger] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, cfg, led] = await Promise.all([
        api('/approvals?status=PENDING'),
        api('/settings').catch(() => null),
        api('/approvals/ledger').catch(() => null),
      ]);
      setItems(res.rows || []);
      setWindowMin(((cfg && cfg.approval) || {}).review_window_minutes ?? 30);
      setLedger(led);
    } catch (e) { onError && onError(e.message); }
    setLoading(false);
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function decide(id, decision, extra = {}) {
    setBusy(id);
    try {
      await api(`/approvals/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, ...extra }) });
      setEditing(null); await load(); onChanged && onChanged();
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }
  async function execute(id) {
    setBusy(id);
    try { await api(`/approvals/${id}/execute`, { method: 'POST' }); await load(); onChanged && onChanged(); }
    catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  // How long an item has waited, and how much of the review window is left.
  // The window gates the AUTONOMOUS path only: a human decision is never
  // delayed by it, which is why the buttons stay live below.
  function windowState(a) {
    if (!a.created_at || windowMin <= 0) return { label: 'window off', tone: 'growth-pill-unknown', mins: null };
    const age = (Date.now() - new Date(a.created_at).getTime()) / 60000;
    if (age >= windowMin) return { label: 'window elapsed — eligible to send', tone: 'growth-pill-high', mins: 0 };
    return { label: `held — ${Math.ceil(windowMin - age)}m of review left`, tone: 'growth-pill-med', mins: Math.ceil(windowMin - age) };
  }

  const eligible = items.filter((a) => windowState(a).mins === 0).length;

  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Approvals</h2>
        <p className="con-sub">
          Every proposed reply or email waits here with its reason and evidence. A draft that
          passes every gate is still held for a <strong>{windowMin}-minute human review window</strong>
          {' '}before the engine may send it on its own, so you have a real chance to review or
          pull it back. Your own approve, edit or reject is never delayed by the window.
        </p>
        <div className="growth-stats">
          <Stat label="Waiting for review" value={items.length} />
          <Stat label="Review window elapsed" value={eligible}
            hint="eligible for automatic send" />
          <Stat label="Sent (ledger)" value={fmt((ledger || {}).SENT)} />
          <Stat label="Duplicates prevented" value={fmt((ledger || {}).suppressed)}
            hint="never emailed twice" />
        </div>
      </div>

      {items.length === 0 && !loading && <p className="con-sub">No approvals waiting.</p>}
      {items.map((a) => {
        const ws = windowState(a);
        return (
        <div key={a.id} className="an-section growth-approval">
          <div className="con-home-head-row">
            <div>
              <b>{a.prospect_name || 'Unknown'}</b>{a.prospect_company ? ` · ${a.prospect_company}` : ''}
              <span className="con-sub"> · {a.channel} · {a.kind}</span>
            </div>
            <div className="growth-toolbar" style={{ margin: 0 }}>
              <span className={`growth-pill ${ws.tone}`}>{ws.label}</span>
              <span className={levelClass(a.prospect_fit)}>{a.prospect_fit || '—'}</span>
            </div>
          </div>
          <p className="con-sub">{a.why}</p>
          <p className="con-sub">
            Drafted {fmtDate(a.created_at)}
            {a.prospect_intent ? ` · intent ${a.prospect_intent}` : ''}
            {a.country_code ? ` · ${a.country_code}` : ''}
          </p>
          {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="con-sub">{a.url}</a>}
          {(a.evidence || []).slice(0, 3).map((e) => (
            <div key={e.id} className="con-sub">• {e.title || e.url} — {(e.excerpt || '').slice(0, 120)}</div>
          ))}

          {editing === a.id ? (
            <div>
              <input className="growth-input" style={{ width: '100%', marginBottom: 6 }} value={a.draft_subject || ''}
                onChange={(e) => setItems(items.map((x) => x.id === a.id ? { ...x, draft_subject: e.target.value } : x))} />
              <textarea className="growth-input" rows={8} style={{ width: '100%' }} value={a.draft_body || ''}
                onChange={(e) => setItems(items.map((x) => x.id === a.id ? { ...x, draft_body: e.target.value } : x))} />
              <div className="growth-toolbar">
                <button className="preview-checkout-btn" type="button" disabled={busy === a.id} onClick={() => decide(a.id, 'edit', { edited_subject: a.draft_subject, edited_body: a.draft_body })}>Save & approve</button>
                <button className="preview-checkout-btn" type="button" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="growth-draft">
                <b>{a.draft_subject}</b>
                <pre className="growth-draft-body">{a.draft_body}</pre>
              </div>
              <div className="growth-toolbar">
                <button className="preview-checkout-btn" type="button" disabled={busy === a.id} onClick={() => decide(a.id, 'approve')}>Approve</button>
                <button className="preview-checkout-btn" type="button" disabled={busy === a.id} onClick={() => setEditing(a.id)}>Edit</button>
                <button className="preview-checkout-btn" type="button" disabled={busy === a.id} onClick={() => decide(a.id, 'reject')}>Reject</button>
                <button className="preview-checkout-btn" type="button" disabled={busy === a.id} onClick={() => execute(a.id)}>Execute</button>
              </div>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

const RECOMMENDATION_CLASS = {
  KEEP: 'growth-pill-high',
  WATCH: 'growth-pill-med',
  PAUSE: 'growth-pill-low',
  RETIRE: 'growth-pill-unknown',
  RETIRED: 'growth-pill-unknown',
};

// The Sources surface -- a primary tab, not a settings subsection. The
// requirement puts discovery first: before a prospect can be qualified, the
// engine has to be pointed at sources that actually produce contactable
// businesses and developers. This view answers the two questions that matter:
// which sources are configured and running, and which ones really yield.
function Sources({ api, onError }) {
  const [sources, setSources] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [audit, setAudit] = useState(null);
  const [attribution, setAttribution] = useState([]);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    // Each read settles on its own. A single failing call must not blank the
    // whole panel: the keyword list is the only place these terms are visible,
    // so losing it to an unrelated audit failure reads as "empty" while
    // discovery is running. The audit and attribution are supplementary and
    // degrade to empty; the two core reads are what gate the surface.
    const [src, kw, aud, att] = await Promise.allSettled([
      api('/sources'), api('/keywords'), api('/sources/audit'),
      api('/metrics/attribution?dimension=first_touch_source'),
    ]);
    if (src.status === 'fulfilled') setSources(src.value.sources || []);
    if (kw.status === 'fulfilled') setKeywords(kw.value.keywords || []);
    if (aud.status === 'fulfilled') setAudit(aud.value);
    if (att.status === 'fulfilled') setAttribution(Array.isArray(att.value) ? att.value : []);
    const failed = [src, kw].find((r) => r.status === 'rejected');
    setLoadError(failed ? (failed.reason?.message || 'Could not load sources') : '');
  }, [api]);
  useEffect(() => { load(); }, [load]);

  async function toggleSource(s, field) {
    try {
      await api(`/sources/${s.id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !s[field] }) });
      load();
    } catch (e) { onError && onError(e.message); }
  }

  async function toggleKeyword(k) {
    try {
      await api(`/keywords/${k.id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !k.enabled }) });
      load();
    } catch (e) { onError && onError(e.message); }
  }

  async function addKeyword() {
    const kw = newKeyword.trim();
    if (!kw) return;
    try {
      await api('/keywords', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }) });
      setNewKeyword('');
      load();
    } catch (e) { onError && onError(e.message); }
  }

  async function removeKeyword(k) {
    if (typeof window !== 'undefined' && !window.confirm(`Delete the keyword "${k.keyword}"?`)) return;
    try { await api(`/keywords/${k.id}`, { method: 'DELETE' }); load(); }
    catch (e) { onError && onError(e.message); }
  }

  // Retiring and restoring are real, recorded decisions, not a toggle: the
  // reason is stored with an evidence snapshot, so a source is never silently
  // deleted and the decision can be explained later.
  async function retire(s) {
    if (!reason.trim()) { setNotice('Enter a reason before retiring a source.'); return; }
    setBusy(s.source); setNotice('');
    try {
      await api(`/sources/${s.source}/retire`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }) });
      setReason('');
      await load();
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  async function restore(s) {
    setBusy(s.source); setNotice('');
    try {
      await api(`/sources/${s.source}/restore`, { method: 'POST' });
      await load();
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  const rows = (audit && audit.sources) || [];
  const summary = (audit && audit.summary) || {};

  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Sources ({sources.length})</h2>
        <p className="con-sub">
          Discovery sources the engine searches. A source is a backend connector plus the
          keywords that run on it; a package registry does not get conversational queries,
          and a broad business search is not limited to the terms that name a source. Every
          yield number below is a count of real prospect rows, not an estimate.
        </p>
        <div className="growth-table-wrap">
          <table className="growth-table">
            <thead><tr>
              <th>Source</th><th>Category</th><th>Discovery</th><th>Outreach</th>
              <th>Automation</th><th>Auth</th>
            </tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}<span className="con-sub"> · {s.id}</span></td>
                  <td>{s.category}</td>
                  <td><input type="checkbox" checked={s.discovery}
                    onChange={() => toggleSource(s, 'discovery')} /></td>
                  <td><input type="checkbox" checked={s.outreach}
                    onChange={() => toggleSource(s, 'outreach')} /></td>
                  <td><input type="checkbox" checked={s.automation_allowed}
                    onChange={() => toggleSource(s, 'automation_allowed')} /></td>
                  <td>{s.requires_auth ? (s.auth_env_var || 'required') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Where prospects come from</h2>
        <p className="con-sub">
          Descriptive attribution by first-touch source: how many prospects each source
          produced, and how far they got. This is a description of what happened, not a
          ranking — a source with few prospects may simply be new.
        </p>
        {attribution.length === 0
          ? <p className="con-sub">No attribution recorded yet — nothing has been discovered.</p>
          : (
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr>
                  <th>First-touch source</th><th>Prospects</th><th>Conversations</th>
                  <th>Signups</th><th>Activated</th>
                </tr></thead>
                <tbody>
                  {attribution.map((r) => (
                    <tr key={r.k}>
                      <td>{fmt(r.k)}</td>
                      <td>{r.prospects ?? 0}</td>
                      <td>{r.conversations ?? 0}</td>
                      <td>{r.signups ?? 0}</td>
                      <td>{r.activated ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <div>
            <h2 className="an-section-h" style={{ marginBottom: 0 }}>Source audit</h2>
            <p className="con-sub">
              Each source judged on real outcomes: how many of its prospects qualify, are
              contactable, and convert — with a KEEP / WATCH / PAUSE / RETIRE recommendation.
              A retired source keeps its row and its history; it is switched off, not deleted.
            </p>
          </div>
        </div>
        {Object.keys(summary).length > 0 && (
          <p className="con-sub">
            {Object.entries(summary).map(([k, v]) => `${v} ${k}`).join(' · ')}
          </p>
        )}
        <div className="growth-setting-row">
          <input type="text" placeholder="Reason for retiring a source"
            value={reason} onChange={(e) => setReason(e.target.value)}
            style={{ minWidth: 280 }} />
        </div>
        {notice && <p className="con-sub">{notice}</p>}
        {rows.length === 0
          ? <p className="con-sub">No source has produced a signal yet.</p>
          : (
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr>
                  <th>Source</th><th>Recommendation</th><th>Discovered</th><th>Reviewed</th>
                  <th>Qualified</th><th>Contactable</th><th>Signups</th>
                  <th>OK / Fail</th><th>Reason</th><th />
                </tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.source}>
                      <td>{s.name || s.source}</td>
                      <td><span className={`growth-pill ${RECOMMENDATION_CLASS[s.recommendation] || 'growth-pill-unknown'}`}>
                        {s.recommendation}</span></td>
                      <td>{s.metrics.discovered ?? 0}</td>
                      <td>{s.metrics.reviewed ?? 0}</td>
                      <td>{s.metrics.qualified ?? 0}</td>
                      <td>{s.metrics.contactable ?? 0}</td>
                      <td>{s.metrics.signups ?? 0}</td>
                      <td>{s.metrics.success_count ?? 0} / {s.metrics.failure_count ?? 0}</td>
                      <td className="growth-activity-body">{s.reason || '—'}</td>
                      <td>
                        {s.retired
                          ? <button className="preview-checkout-btn" type="button"
                              disabled={busy === s.source} onClick={() => restore(s)}>
                              {busy === s.source ? '…' : 'Restore'}</button>
                          : <button className="preview-checkout-btn" type="button"
                              disabled={busy === s.source} onClick={() => retire(s)}>
                              {busy === s.source ? '…' : 'Retire'}</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Keywords ({keywords.length})</h2>
        <p className="con-sub">
          What the Hunter searches for. Disable a keyword to stop using it without deleting it,
          or add a new term to widen discovery.
        </p>
        {loadError && (
          <p className="con-sub" style={{ color: '#b91c1c' }}>
            Could not load the Sources data: {loadError}. Discovery may still be running — retry.
          </p>
        )}
        <div className="growth-toolbar">
          <input className="growth-input" placeholder="Add a keyword…"
            value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addKeyword(); }} />
          <button className="preview-checkout-btn" type="button" onClick={addKeyword}>+ Add keyword</button>
        </div>
        <div className="growth-keywords">
          {keywords.map((k) => (
            <span key={k.id} className={`growth-keyword ${k.enabled ? 'on' : 'off'}`}>
              <button type="button" className="growth-keyword-t"
                title={k.agent && k.agent !== 'shared' ? `Used by ${k.agent}` : 'Shared by all agents'}
                onClick={() => toggleKeyword(k)}>{k.keyword}</button>
              <button type="button" className="growth-keyword-x" title="Delete"
                onClick={() => removeKeyword(k)}>×</button>
            </span>
          ))}
        </div>
        {!loadError && keywords.length === 0 && (
          <p className="con-sub">
            No keywords yet. Add a term above to start discovery.
          </p>
        )}
      </div>
    </div>
  );
}
