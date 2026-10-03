'use client';

// Konduyt Growth Agents -- the Growth surface, rendered under
// Dashboard -> Analytics -> Growth.
//
// This component only DISPLAYS and CONTROLS. Every decision (qualification,
// scoring, suppression, scheduling, whether a send is allowed) happens in the
// backend at /growth/*; the UI never re-implements a rule, so the two can never
// disagree about what a prospect's state means.
//
// The two screens that matter day to day are the Prospect spreadsheet and the
// Approval queue. Everything the agents propose that would touch a human lands
// in Approvals with its why + evidence, and nothing is sent without a decision.

import { useState, useEffect, useCallback } from 'react';

const VIEWS = [
  ['overview', 'Overview'],
  ['prospects', 'Prospects'],
  ['agents', 'Agents'],
  ['approvals', 'Approvals'],
  ['settings', 'Settings'],
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
  const [view, setView] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

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

  const loadOverview = useCallback(async () => {
    try { setOverview(await api('/overview')); }
    catch (e) { onError && onError(e.message); }
  }, [api, onError]);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  async function runAgents(agents) {
    setBusy('run'); setNotice('');
    try {
      const res = await api('/agents/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agents ? { agents } : {}),
      });
      const ran = (res.ran || []).join(', ') || 'none';
      setNotice(`Ran: ${ran}. Refresh to see the new prospects and drafts.`);
      await loadOverview();
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  return (
    <div className="growth-root">
      <div className="con-home-head con-home-head-row" style={{ marginBottom: 4 }}>
        <div>
          <h1 className="con-h1">Growth</h1>
          <p className="con-sub">
            Find developers and businesses with a real payment-integration problem,
            start legitimate conversations, and measure what converts.
          </p>
        </div>
        <button className="preview-checkout-btn" type="button" disabled={busy === 'run'}
          onClick={() => runAgents(null)}>
          {busy === 'run' ? 'Running…' : '▶ Run agents'}
        </button>
      </div>

      <nav className="con-tabs" style={{ marginBottom: 16 }}>
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button"
            className={view === id ? 'con-tab active' : 'con-tab'}
            onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>

      {notice && <p className="con-sub" style={{ marginBottom: 12 }}>{notice}</p>}

      {view === 'overview' && <Overview api={api} overview={overview} onRefresh={loadOverview} onRun={runAgents} busy={busy} />}
      {view === 'prospects' && <Prospects api={api} onError={onError} />}
      {view === 'agents' && <Agents api={api} onError={onError} />}
      {view === 'approvals' && <Approvals api={api} onError={onError} onChanged={loadOverview} />}
      {view === 'settings' && <Settings api={api} onError={onError} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
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

function Overview({ api, overview, onRefresh, onRun, busy }) {
  const [series, setSeries] = useState(null);
  useEffect(() => {
    api('/metrics/daily?days=30').then(setSeries).catch(() => {});
  }, [api]);

  if (!overview) return <p className="con-sub">Loading…</p>;
  const h = overview.headline || {};
  const f = overview.funnel || {};
  const funnelRows = [
    ['Signals discovered', f.signals],
    ['Unique prospects', f.unique_prospects],
    ['Qualified', f.qualified],
    ['Contacted', f.contacted],
    ['Replies', f.replies],
    ['Interested', f.interested],
    ['Signups', f.signups],
    ['Activated', f.activated],
  ];
  const max = Math.max(1, ...funnelRows.map(([, v]) => v || 0));

  return (
    <div>
      <div className="growth-stats">
        <Stat label="New today" value={h.new_today} />
        <Stat label="High intent" value={h.high_intent} />
        <Stat label="Replies today" value={h.replies_today} />
        <Stat label="Follow-ups due" value={h.followups_due} />
        <Stat label="Signups" value={h.signups} hint={`${h.signups_today || 0} today`} />
        <Stat label="Activated" value={h.activated} hint={`${h.activated_today || 0} today`} />
        <Stat label="Approvals pending" value={h.approvals_pending} />
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Funnel</h2>
        <p className="con-sub">Signals → Qualified → Contacted → Replies → Interested → Signups → Activated.</p>
        <div className="growth-funnel">
          {funnelRows.map(([label, v]) => (
            <div key={label} className="growth-funnel-row">
              <span className="growth-funnel-l">{label}</span>
              <span className="growth-funnel-bar" style={{ width: `${Math.round(((v || 0) / max) * 100)}%` }} />
              <span className="growth-funnel-n">{v || 0}</span>
            </div>
          ))}
        </div>
        <p className="con-sub" style={{ marginTop: 8 }}>
          Qualification rate: {((f.qualification_rate || 0) * 100).toFixed(1)}% of reviewed prospects.
        </p>
      </div>

      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <h2 className="an-section-h" style={{ marginBottom: 0 }}>Agents</h2>
          <button className="preview-checkout-btn" type="button" disabled={busy === 'run'}
            onClick={() => onRun(null)}>{busy === 'run' ? 'Running…' : '▶ Run now'}</button>
        </div>
        <div className="growth-agents">
          {(overview.agents || []).map((a) => (
            <div key={a.agent} className="growth-agent-card">
              <div className="growth-agent-name">{a.agent.replace(/_/g, ' ')}</div>
              <div className={`growth-agent-status ${a.paused ? 'paused' : (a.status || '').toLowerCase()}`}>
                {a.paused ? 'PAUSED' : a.status}
              </div>
              <div className="growth-agent-meta">
                {a.totals ? `${a.totals.qualified || 0} qualified · ${a.totals.actions || 0} actions` : ''}
              </div>
              <div className="growth-agent-meta">Last run: {a.last_run ? fmtDate(a.last_run.started_at) : 'never'}</div>
            </div>
          ))}
        </div>
      </div>

      {series && (
        <div className="an-section">
          <h2 className="an-section-h">Last 30 days</h2>
          <MiniSeries series={series} />
        </div>
      )}

      <div className="an-section">
        <h2 className="an-section-h">Recent activity</h2>
        {(overview.activity || []).length === 0 && <p className="con-sub">No activity yet. Run the agents to start discovering.</p>}
        <div className="growth-activity">
          {(overview.activity || []).slice(0, 20).map((it) => (
            <div key={it.id} className="growth-activity-row">
              <span className="growth-activity-kind">{it.kind}</span>
              <span className="growth-activity-agent">{it.agent || 'system'}</span>
              <span className="growth-activity-body">{(it.body || '').slice(0, 160)}</span>
              <span className="growth-activity-time">{fmtDate(it.occurred_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniSeries({ series }) {
  const max = Math.max(1, ...series.prospects, ...series.signups, ...series.activated);
  const w = 600, hgt = 120, step = w / Math.max(1, series.days.length - 1);
  const line = (arr, color) => {
    const pts = arr.map((v, i) => `${(i * step).toFixed(1)},${(hgt - (v / max) * hgt).toFixed(1)}`).join(' ');
    return <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />;
  };
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${hgt}`} width="100%" height="120" preserveAspectRatio="none">
        {line(series.prospects, '#7c9cff')}
        {line(series.signups, '#4ade80')}
        {line(series.activated, '#f59e0b')}
      </svg>
      <p className="con-sub">
        <span style={{ color: '#7c9cff' }}>■</span> prospects &nbsp;
        <span style={{ color: '#4ade80' }}>■</span> signups &nbsp;
        <span style={{ color: '#f59e0b' }}>■</span> activated
      </p>
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
          {['NEW', 'RESEARCHING', 'QUALIFIED', 'READY_FOR_OUTREACH', 'CONTACTED', 'FOLLOW_UP', 'REPLIED', 'INTERESTED', 'DEMO_REQUESTED', 'SIGNED_UP', 'PROVIDER_CONNECTED', 'ACTIVATED', 'CONVERTED', 'NOT_INTERESTED', 'REJECTED', 'DO_NOT_CONTACT'].map((s) => <option key={s} value={s}>{s}</option>)}
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
                No prospects match. Run the agents from Overview, add one manually, or import a CSV.
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
          <div><b>Confidence</b><div>{fmt(p.confidence)}</div></div>
          <div><b>Email</b><div>{fmt(p.email)}</div></div>
          <div><b>Website</b><div>{p.website ? <a href={p.website} target="_blank" rel="noreferrer">{p.website}</a> : '—'}</div></div>
          <div><b>X</b><div>{fmt(p.x_handle)}</div></div>
          <div><b>GitHub</b><div>{fmt(p.github_username)}</div></div>
          <div><b>Reddit</b><div>{fmt(p.reddit_username)}</div></div>
          <div><b>Source</b><div>{fmt(p.first_touch_source)}</div></div>
        </div>

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
// Agents
// ---------------------------------------------------------------------------
function Agents({ api, onError }) {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState(null);
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    try { setData(await api('/agents')); } catch (e) { onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function togglePause(agent, paused) {
    setBusy(agent);
    try { await api(`/agents/${agent}/pause`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paused }) }); await load(); }
    catch (e) { onError && onError(e.message); }
    setBusy('');
  }
  async function runOne(agent) {
    setBusy(agent);
    try { await api(`/agents/${agent}/run`, { method: 'POST' }); await load(); }
    catch (e) { onError && onError(e.message); }
    setBusy('');
  }
  async function showLogs(agent) {
    try { setLogs({ agent, ...(await api(`/agents/${agent}/logs?limit=50`)) }); }
    catch (e) { onError && onError(e.message); }
  }

  if (!data) return <p className="con-sub">Loading…</p>;
  return (
    <div>
      <div className="growth-agents">
        {(data.agents || []).map((a) => (
          <div key={a.agent} className="growth-agent-card">
            <div className="growth-agent-name">{a.agent.replace(/_/g, ' ')}</div>
            <div className={`growth-agent-status ${a.paused ? 'paused' : (a.status || '').toLowerCase()}`}>
              {a.paused ? 'PAUSED' : a.status}
            </div>
            <div className="growth-agent-meta">
              {a.totals ? `${a.totals.processed || 0} processed · ${a.totals.qualified || 0} qualified · ${a.totals.errors || 0} errors` : ''}
            </div>
            <div className="growth-toolbar">
              <button className="preview-checkout-btn" type="button" disabled={busy === a.agent} onClick={() => runOne(a.agent)}>Run</button>
              <button className="preview-checkout-btn" type="button" disabled={busy === a.agent}
                onClick={() => togglePause(a.agent, !a.paused)}>{a.paused ? 'Resume' : 'Pause'}</button>
              <button className="preview-checkout-btn" type="button" onClick={() => showLogs(a.agent)}>Logs</button>
            </div>
          </div>
        ))}
      </div>

      {logs && (
        <div className="an-section">
          <h2 className="an-section-h">{logs.agent} — recent runs</h2>
          {(logs.runs || []).map((r) => (
            <div key={r.id} className="growth-activity-row">
              <span className={`growth-agent-status ${(r.status || '').toLowerCase()}`}>{r.status}</span>
              <span className="growth-activity-body">{r.summary || '—'}</span>
              <span className="growth-activity-time">{fmtDate(r.started_at)}</span>
            </div>
          ))}
          <h3 className="an-section-h">Recent actions</h3>
          {(logs.actions || []).slice(0, 30).map((a) => (
            <div key={a.id} className="growth-activity-row">
              <span className="growth-activity-kind">{a.action}</span>
              <span className="growth-activity-body">{(a.detail || '').slice(0, 160)}</span>
              <span className="growth-activity-time">{fmtDate(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
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

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api('/approvals?status=PENDING'); setItems(res.rows || []); }
    catch (e) { onError && onError(e.message); }
    setLoading(false);
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function decide(id, decision, extra = {}) {
    try {
      await api(`/approvals/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, ...extra }) });
      setEditing(null); await load(); onChanged && onChanged();
    } catch (e) { onError && onError(e.message); }
  }
  async function execute(id) {
    try { await api(`/approvals/${id}/execute`, { method: 'POST' }); await load(); onChanged && onChanged(); }
    catch (e) { onError && onError(e.message); }
  }

  return (
    <div>
      <p className="con-sub">
        Nothing is sent automatically. Every proposed reply or email waits here with its
        reason and evidence until you approve, edit or reject it.
      </p>
      {items.length === 0 && !loading && <p className="con-sub">No approvals waiting.</p>}
      {items.map((a) => (
        <div key={a.id} className="an-section growth-approval">
          <div className="con-home-head-row">
            <div>
              <b>{a.prospect_name || 'Unknown'}</b>{a.prospect_company ? ` · ${a.prospect_company}` : ''}
              <span className="con-sub"> · {a.channel} · {a.kind}</span>
            </div>
            <span className={levelClass(a.prospect_fit)}>{a.prospect_fit || '—'}</span>
          </div>
          <p className="con-sub">{a.why}</p>
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
                <button className="preview-checkout-btn" type="button" onClick={() => decide(a.id, 'edit', { edited_subject: a.draft_subject, edited_body: a.draft_body })}>Save & approve</button>
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
                <button className="preview-checkout-btn" type="button" onClick={() => decide(a.id, 'approve')}>Approve</button>
                <button className="preview-checkout-btn" type="button" onClick={() => setEditing(a.id)}>Edit</button>
                <button className="preview-checkout-btn" type="button" onClick={() => decide(a.id, 'reject')}>Reject</button>
                <button className="preview-checkout-btn" type="button" onClick={() => execute(a.id)}>Execute</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings -- limits, schedules, email, keywords, sources
// ---------------------------------------------------------------------------
function Settings({ api, onError }) {
  const [settings, setSettings] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [sources, setSources] = useState([]);
  const [saved, setSaved] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, k, src] = await Promise.all([api('/settings'), api('/keywords'), api('/sources')]);
      setSettings(s); setKeywords(k.keywords || []); setSources(src.sources || []);
    } catch (e) { onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function save(key, value) {
    try { await api(`/settings/${key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }); setSaved(key); setTimeout(() => setSaved(''), 1500); }
    catch (e) { onError && onError(e.message); }
  }
  async function toggleKeyword(k) {
    try { await api(`/keywords/${k.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !k.enabled }) }); load(); }
    catch (e) { onError && onError(e.message); }
  }
  async function toggleSource(s, field) {
    try { await api(`/sources/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: !s[field] }) }); load(); }
    catch (e) { onError && onError(e.message); }
  }

  if (!settings) return <p className="con-sub">Loading…</p>;
  const limits = settings.limits || {};
  const schedules = settings.schedules || {};
  const email = settings.email || {};

  return (
    <div>
      {saved && <p className="con-sub">Saved {saved}.</p>}

      <div className="an-section">
        <h2 className="an-section-h">Daily limits</h2>
        <p className="con-sub">How much the system may do per day. Conservative by default.</p>
        {Object.entries(limits).filter(([, v]) => typeof v === 'number').map(([k, v]) => (
          <div key={k} className="growth-setting-row">
            <label>{k.replace(/_/g, ' ')}</label>
            <input className="growth-input" type="number" defaultValue={v}
              onBlur={(e) => save('limits', { ...limits, [k]: parseInt(e.target.value, 10) || 0 })} />
          </div>
        ))}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Agent schedules (minutes between runs)</h2>
        {Object.entries(schedules).map(([k, v]) => (
          <div key={k} className="growth-setting-row">
            <label>{k.replace(/_/g, ' ')}</label>
            <input className="growth-input" type="number" defaultValue={v}
              onBlur={(e) => save('schedules', { ...schedules, [k]: parseInt(e.target.value, 10) || 0 })} />
          </div>
        ))}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Email sending</h2>
        <p className="con-sub">
          Sending is OFF until a transport is configured and enabled. Until then every
          message is queued as a draft for approval.
        </p>
        <div className="growth-setting-row">
          <label>sending enabled</label>
          <input type="checkbox" checked={!!email.sending_enabled}
            onChange={(e) => save('email', { ...email, sending_enabled: e.target.checked })} />
        </div>
        <div className="growth-setting-row">
          <label>from name</label>
          <input className="growth-input" defaultValue={email.from_name || ''}
            onBlur={(e) => save('email', { ...email, from_name: e.target.value })} />
        </div>
        <div className="growth-setting-row">
          <label>from email</label>
          <input className="growth-input" defaultValue={email.from_email || ''}
            onBlur={(e) => save('email', { ...email, from_email: e.target.value })} />
        </div>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Sources ({sources.length})</h2>
        <div className="growth-table-wrap">
          <table className="growth-table">
            <thead><tr><th>Source</th><th>Category</th><th>Discovery</th><th>Outreach</th><th>Automation</th><th>Auth</th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td><td>{s.category}</td>
                  <td><input type="checkbox" checked={s.discovery} onChange={() => toggleSource(s, 'discovery')} /></td>
                  <td><input type="checkbox" checked={s.outreach} onChange={() => toggleSource(s, 'outreach')} /></td>
                  <td><input type="checkbox" checked={s.automation_allowed} onChange={() => toggleSource(s, 'automation_allowed')} /></td>
                  <td>{s.requires_auth ? (s.auth_env_var || 'required') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Keywords ({keywords.length})</h2>
        <p className="con-sub">What the Hunter searches for. Disable a keyword to stop using it without deleting it.</p>
        <div className="growth-keywords">
          {keywords.map((k) => (
            <button key={k.id} type="button"
              className={`growth-keyword ${k.enabled ? 'on' : 'off'}`}
              onClick={() => toggleKeyword(k)}>{k.keyword}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
