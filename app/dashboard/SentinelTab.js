'use client';

// Konduyt Sentinel -- the transaction-fee intelligence & audit command centre,
// rendered under Dashboard -> Sentinel (admin only).
//
// This component only DISPLAYS and CONTROLS. Every number is read live from
// /sentinel/*; nothing is computed here, so the view and the database cannot
// disagree. Sentinel is read-only by design: it monitors external provider fees,
// audits Konduyt's own transaction fees, reconciles records, investigates
// discrepancies and reports. It never changes a fee and never performs a
// financial correction -- the UI offers no control that could.

import { useState, useEffect, useCallback } from 'react';

const VIEWS = [
  ['overview', 'Overview'],
  ['agents', 'Agents'],
  ['providers', 'Provider Intelligence'],
  ['audits', 'Transaction Audits'],
  ['reconciliation', 'Reconciliation'],
  ['investigations', 'Investigations'],
  ['approvals', 'Approvals'],
  ['notifications', 'Notifications'],
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
function money(minor, currency) {
  if (minor === null || minor === undefined) return '—';
  const n = Number(minor);
  if (Number.isNaN(n)) return String(minor);
  return `${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ' ' + currency : ''}`;
}
function sevClass(sev) {
  const s = (sev || 'info').toLowerCase();
  if (s === 'critical') return 'sentinel-pill sentinel-pill-critical';
  if (s === 'high') return 'sentinel-pill sentinel-pill-high';
  if (s === 'medium') return 'sentinel-pill sentinel-pill-med';
  if (s === 'low') return 'sentinel-pill sentinel-pill-low';
  return 'sentinel-pill sentinel-pill-info';
}
function statusClass(st) {
  const s = (st || '').toLowerCase();
  return `growth-agent-status ${s}`;
}

export default function SentinelTab({ apiBase, authHeaders, onError }) {
  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'overview';
    const v = new URLSearchParams(window.location.search).get('sentinel');
    return VIEWS.some(([id]) => id === v) ? v : 'overview';
  });
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const api = useCallback(async (path, opts = {}) => {
    const r = await fetch(`${apiBase}/sentinel${path}`, {
      ...opts,
      headers: { ...(authHeaders ? authHeaders() : {}), ...(opts.headers || {}) },
    });
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.json()).detail || ''; } catch (e) { /* ignore */ }
      throw new Error(detail || `${r.status} ${r.statusText}`);
    }
    return r.json();
  }, [apiBase, authHeaders]);

  async function runAgent(agent) {
    setBusy('run:' + agent);
    setNotice('');
    try {
      const res = await api('/agents/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent }),
      });
      if (res.skipped) setNotice(`Skipped: ${res.reason}`);
      else setNotice(`Ran ${agent}. ${res.findings || 0} findings.`);
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  return (
    <div className="sentinel-root">
      <div className="con-home-head con-home-head-row" style={{ marginBottom: 4 }}>
        <div>
          <h1 className="con-h1">Sentinel</h1>
          <p className="con-sub">
            Transaction-fee intelligence and audit. Sentinel monitors provider pricing, audits
            Konduyt&rsquo;s own fees against the deterministic calculation, reconciles records,
            investigates discrepancies and reports here. It is read-only: it never changes a fee
            and never performs a financial correction.
          </p>
        </div>
      </div>

      <nav className="con-tabs" style={{ marginBottom: 16 }}>
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button"
            className={view === id ? 'con-tab active' : 'con-tab'}
            onClick={() => setView(id)}>{label}</button>
        ))}
      </nav>

      {notice && <p className="con-sub" style={{ marginBottom: 12 }}>{notice}</p>}

      {view === 'overview' && <Overview api={api} onError={onError} onRun={runAgent} busy={busy} />}
      {view === 'agents' && <Agents api={api} onError={onError} onRun={runAgent} busy={busy} />}
      {view === 'providers' && <Providers api={api} onError={onError} />}
      {view === 'audits' && <Audits api={api} onError={onError} />}
      {view === 'reconciliation' && <Reconciliation api={api} onError={onError} />}
      {view === 'investigations' && <Investigations api={api} onError={onError} />}
      {view === 'approvals' && <Approvals api={api} onError={onError} />}
      {view === 'notifications' && <Notifications api={api} onError={onError} />}
      {view === 'settings' && <Settings api={api} onError={onError} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
function Overview({ api, onError, onRun, busy }) {
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setSnap(await api('/command-centre')); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!snap) return <p className="con-sub">Loading Sentinel…</p>;

  const o = snap.overview || {};
  const h = o.health || {};
  const w = o.worker || {};

  return (
    <div>
      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <h2 className="an-section-h" style={{ marginBottom: 0 }}>System health</h2>
          <span className={`sentinel-pill sentinel-pill-${(h.state || '').toLowerCase()}`}>
            {fmt(h.state)}
          </span>
        </div>
        <div className="sentinel-stats">
          <Stat label="Open findings" value={o.outstanding_findings} hint={`${fmt(o.findings_by_severity?.high || 0)} high · ${fmt(o.findings_by_severity?.critical || 0)} critical`} />
          <Stat label="Unresolved incidents" value={o.high_severity_incidents} hint="high + critical" />
          <Stat label="Confirmed discrepancies" value={o.confirmed_discrepancies} />
          <Stat label="Estimated exposure" value={money(o.estimated_exposure_minor)} hint="sum of open incidents" />
          <Stat label="Active jobs" value={o.active_jobs} hint={`${fmt(o.completed_jobs)} recently completed`} />
          <Stat label="Last successful run" value={fmtDate(o.last_successful_run)} />
        </div>
        <p className="con-sub" style={{ marginTop: 8 }}>
          Engine {h.engine_running ? 'running' : 'paused'} · read-only {h.read_only ? 'on' : 'OFF'} ·
          worker {w.thread_alive ? 'alive' : 'stopped'} · {fmt(w.passes)} passes recorded
          {w.durable ? ' (durable)' : ''}. {w.last_error ? `Last error: ${w.last_error}` : ''}
        </p>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Coverage</h2>
        <p className="con-sub">
          {fmt(o.provider_coverage?.enabled_sources)} of {fmt(o.provider_coverage?.total_sources)} fee
          sources enabled; last checked {fmtDate(o.provider_coverage?.last_checked_at)}.
        </p>
        <div className="sentinel-coverage">
          {Object.entries(o.reconciliation_coverage?.by_provider || {}).map(([p, states]) => (
            <div key={p} className="sentinel-coverage-row">
              <span className="sentinel-coverage-p">{p}</span>
              <span className="con-sub">
                {Object.entries(states).map(([s, n]) => `${s}: ${n}`).join(' · ')}
              </span>
            </div>
          ))}
          {Object.keys(o.reconciliation_coverage?.by_provider || {}).length === 0 &&
            <p className="con-sub">No reconciliation has run yet in the last 7 days.</p>}
        </div>
      </div>

      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <h2 className="an-section-h" style={{ marginBottom: 0 }}>Run an agent now</h2>
          <span className="con-sub">A bounded, read-only pass. Safe to run at any time.</span>
        </div>
        <div className="sentinel-run-row">
          {['fee_intelligence', 'fee_policy', 'transaction_audit', 'reconciliation', 'investigation', 'coordinator'].map((a) => (
            <button key={a} className="preview-checkout-btn" type="button"
              disabled={busy === 'run:' + a} onClick={() => onRun(a)}>
              {busy === 'run:' + a ? 'Running…' : a.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="sentinel-stat">
      <div className="sentinel-stat-v">{fmt(value)}</div>
      <div className="sentinel-stat-l">{label}</div>
      {hint && <div className="sentinel-stat-h">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------
function Agents({ api, onError, onRun, busy }) {
  const [agents, setAgents] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { const d = await api('/agents'); setAgents(d.agents || []); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  async function toggle(a) {
    try {
      await api(`/agents/${a.agent}/pause`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: !a.paused }),
      });
      load();
    } catch (e) { onError && onError(e.message); }
  }

  async function open(a) {
    try { setDetail(await api(`/agents/${a.agent}`)); }
    catch (e) { onError && onError(e.message); }
  }

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;

  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Agents — live</h2>
        <p className="con-sub">
          Status is derived from each agent&rsquo;s heartbeat: &ldquo;running&rdquo; is only shown while
          something is demonstrably still working. Deterministic agents never need AI.
        </p>
        <div className="growth-live-agents">
          {agents.map((a) => (
            <div key={a.agent} className="growth-live-agent">
              <div className="growth-live-agent-top">
                <span className="growth-live-agent-name">{(a.name || a.agent).replace(/_/g, ' ')}</span>
                <span className={statusClass(a.status)}>{a.status}{a.stale ? ' (stale)' : ''}</span>
              </div>
              {a.responsibility && <div className="growth-live-agent-task">{a.responsibility}</div>}
              <div className="growth-live-agent-meta">
                Last run {fmtDate(a.last_run?.started_at)} · {a.last_run?.status || 'never'} ·
                {' '}{a.totals?.processed || 0} processed · {a.totals?.signals || 0} signals
              </div>
              <div className="sentinel-run-row" style={{ marginTop: 8 }}>
                <button className="link-inline" type="button" onClick={() => open(a)}>Details</button>
                <button className="link-inline" type="button" disabled={busy === 'run:' + a.agent}
                  onClick={() => onRun(a.agent)}>
                  {busy === 'run:' + a.agent ? 'Running…' : 'Run now'}
                </button>
                <button className="link-inline" type="button" onClick={() => toggle(a)}>
                  {a.paused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <div className="growth-drawer-backdrop" onClick={() => setDetail(null)}>
          <div className="growth-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="con-home-head-row" style={{ alignItems: 'center' }}>
              <h2 className="an-section-h" style={{ marginBottom: 0 }}>
                {detail.name || detail.agent}
              </h2>
              <button className="link-inline" type="button" onClick={() => setDetail(null)}>Close</button>
            </div>
            <p className="con-sub">{detail.responsibility}</p>
            {detail.needs_ai && <p className="con-sub">AI-assisted (optional; falls back to deterministic text).</p>}
            <h3 className="an-section-h">Recent runs</h3>
            <table className="sentinel-table">
              <thead><tr><th>Started</th><th>Status</th><th>Processed</th><th>Signals</th><th>Summary</th></tr></thead>
              <tbody>
                {(detail.runs || []).map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.started_at)}</td>
                    <td><span className={statusClass(r.status)}>{r.status}</span></td>
                    <td>{r.items_processed}</td>
                    <td>{r.signals_found}</td>
                    <td>{fmt(r.summary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 className="an-section-h">Recent actions</h3>
            <table className="sentinel-table">
              <thead><tr><th>When</th><th>Action</th><th>Detail</th></tr></thead>
              <tbody>
                {(detail.actions || []).map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDate(a.created_at)}</td>
                    <td>{fmt(a.action)}</td>
                    <td>{fmt(a.detail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider intelligence
// ---------------------------------------------------------------------------
function Providers({ api, onError }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setD(await api('/provider-intelligence')); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!d) return <p className="con-sub">Loading…</p>;

  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Monitored sources ({d.sources?.length || 0})</h2>
        <p className="con-sub">Each source is a provider&rsquo;s published pricing. Sentinel snapshots it and records only real changes.</p>
        <table className="sentinel-table">
          <thead><tr><th>Provider</th><th>Source</th><th>Interval</th><th>Enabled</th><th>Last checked</th></tr></thead>
          <tbody>
            {(d.sources || []).map((s) => (
              <tr key={s.id}>
                <td>{fmt(s.connector_id)}</td>
                <td>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : s.name}</td>
                <td>{fmt(s.check_interval)}s</td>
                <td>{s.enabled ? 'yes' : 'no'}</td>
                <td>{fmtDate(s.last_checked_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Detected changes ({d.changes?.length || 0})</h2>
        {(d.changes || []).length === 0 && <p className="con-sub">No changes detected yet. Sentinel records a change only when a fee value actually moves.</p>}
        {(d.changes || []).length > 0 && (
          <table className="sentinel-table">
            <thead><tr><th>Provider</th><th>Field</th><th>From</th><th>To</th><th>Material</th><th>Confidence</th><th>Detected</th></tr></thead>
            <tbody>
              {(d.changes || []).map((c) => (
                <tr key={c.id}>
                  <td>{fmt(c.provider)}</td><td>{fmt(c.field)}</td>
                  <td>{fmt(c.old_value)}</td><td>{fmt(c.new_value)}</td>
                  <td>{c.material ? 'yes' : 'no'}</td><td>{fmt(c.confidence)}</td>
                  <td>{fmtDate(c.detected_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Latest snapshots ({d.snapshots?.length || 0})</h2>
        <table className="sentinel-table">
          <thead><tr><th>Provider</th><th>Currency</th><th>%</th><th>Fixed</th><th>Verification</th><th>Retrieved</th></tr></thead>
          <tbody>
            {(d.snapshots || []).map((s, i) => (
              <tr key={i}>
                <td>{fmt(s.provider)}</td><td>{fmt(s.currency)}</td>
                <td>{fmt(s.percentage_fee)}</td>
                <td>{s.fixed_fee != null ? `${s.fixed_fee} ${fmt(s.fixed_fee_currency)}` : '—'}</td>
                <td>{fmt(s.verification)}</td><td>{fmtDate(s.retrieved_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction audits
// ---------------------------------------------------------------------------
function Audits({ api, onError }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setD(await api('/transaction-audits')); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!d) return <p className="con-sub">Loading…</p>;

  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Audit coverage</h2>
        <div className="sentinel-stats">
          <Stat label="Findings" value={d.total} />
          <Stat label="Audit runs" value={d.audit_runs} />
          <Stat label="Live payments" value={d.live_payments_total} />
          <Stat label="High severity" value={fmt(d.by_severity?.high || 0)} />
          <Stat label="Critical" value={fmt(d.by_severity?.critical || 0)} />
        </div>
      </div>
      <FindingsTable findings={d.findings || []} />
    </div>
  );
}

function FindingsTable({ findings }) {
  return (
    <div className="an-section">
      <h2 className="an-section-h">Findings ({findings.length})</h2>
      {findings.length === 0 && <p className="con-sub">No findings. Every audited payment matched the deterministic calculation.</p>}
      {findings.length > 0 && (
        <table className="sentinel-table">
          <thead><tr><th>Severity</th><th>Kind</th><th>Provider</th><th>Ref</th><th>Expected</th><th>Actual</th><th>Diff</th><th>State</th><th>Confidence</th><th>Last seen</th></tr></thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id}>
                <td><span className={sevClass(f.severity)}>{f.severity}</span></td>
                <td>{fmt(f.kind)}</td>
                <td>{fmt(f.provider)}</td>
                <td className="sentinel-mono">{fmt(f.transaction_ref)}</td>
                <td>{money(f.expected_fee, f.currency)}</td>
                <td>{money(f.actual_fee, f.currency)}</td>
                <td>{money(f.difference, f.currency)}</td>
                <td>{fmt(f.status)}</td>
                <td>{fmt(f.confidence)}</td>
                <td>{fmtDate(f.last_detected_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------
function Reconciliation({ api, onError }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setD(await api('/reconciliation')); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!d) return <p className="con-sub">Loading…</p>;

  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Reconciliation coverage</h2>
        <p className="con-sub">
          Sentinel never claims reconciliation is complete when provider data was unavailable.
          An unconfigured provider is reported as incomplete, not as reconciled.
        </p>
        <table className="sentinel-table">
          <thead><tr><th>Provider</th><th>Adapter supported</th><th>Credentials configured</th></tr></thead>
          <tbody>
            {(d.adapters || []).map((a) => (
              <tr key={a.provider}>
                <td>{a.provider}</td>
                <td>{a.supported ? 'yes' : 'no'}</td>
                <td>{a.configured ? 'yes' : <span className="sentinel-muted">no — data unavailable</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="an-section">
        <h2 className="an-section-h">Outcomes by provider (last 7 days)</h2>
        {Object.keys(d.by_provider || {}).length === 0 && <p className="con-sub">No reconciliation has run yet.</p>}
        {Object.entries(d.by_provider || {}).map(([p, states]) => (
          <div key={p} className="sentinel-coverage-row">
            <span className="sentinel-coverage-p">{p}</span>
            <span className="con-sub">{Object.entries(states).map(([s, n]) => `${s}: ${n}`).join(' · ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Investigations
// ---------------------------------------------------------------------------
function Investigations({ api, onError }) {
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setD(await api('/investigations')); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!d) return <p className="con-sub">Loading…</p>;

  return (
    <div className="an-section">
      <h2 className="an-section-h">Incidents ({d.total})</h2>
      {(d.incidents || []).length === 0 && <p className="con-sub">No incidents. Findings appear here once investigated.</p>}
      {(d.incidents || []).map((inc) => (
        <div key={inc.id} className="sentinel-incident">
          <div className="sentinel-incident-top">
            <span className={sevClass(inc.severity)}>{inc.severity}</span>
            <span className="sentinel-incident-title">{inc.title}</span>
            <span className="con-sub">{inc.state} · {inc.confidence} · seen {inc.occurrences}×</span>
          </div>
          <p className="con-sub">{inc.summary}</p>
          <div className="sentinel-incident-grid">
            <div><strong>Likely cause.</strong> {fmt(inc.likely_cause)}</div>
            <div><strong>Recommended action.</strong> {fmt(inc.recommended_action)}</div>
            <div><strong>Impact.</strong> {money(inc.financial_impact, inc.impact_currency)}</div>
            <div><strong>Limitations.</strong> {fmt(inc.limitations)}</div>
          </div>
          <button className="link-inline" type="button"
            onClick={() => setOpen(open === inc.id ? null : inc.id)}>
            {open === inc.id ? 'Hide evidence' : 'Show evidence'}
          </button>
          {open === inc.id && (
            <pre className="sentinel-evidence">{JSON.stringify(inc.evidence, null, 2)}</pre>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------
function Approvals({ api, onError }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setD(await api('/approvals')); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function decide(id, decision) {
    try {
      await api(`/approvals/${id}/decide`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      load();
    } catch (e) { onError && onError(e.message); }
  }

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!d) return <p className="con-sub">Loading…</p>;

  return (
    <div className="an-section">
      <h2 className="an-section-h">Approvals awaiting a decision ({d.total})</h2>
      <p className="con-sub">
        Sentinel proposes record-keeping actions only. It never proposes a refund, a transfer or a
        fee change. Decisions are enforced server-side and recorded with who and when.
      </p>
      {(d.approvals || []).length === 0 && <p className="con-sub">Nothing awaiting a decision.</p>}
      {(d.approvals || []).map((a) => (
        <div key={a.id} className="sentinel-incident">
          <div className="sentinel-incident-top">
            <span className="sentinel-pill sentinel-pill-info">{a.action_type}</span>
            <span className="sentinel-incident-title">{a.proposed_action}</span>
            <span className="con-sub">{fmtDate(a.created_at)}</span>
          </div>
          <div className="sentinel-run-row">
            <button className="preview-checkout-btn" type="button" onClick={() => decide(a.id, 'APPROVED')}>Approve</button>
            <button className="link-inline" type="button" onClick={() => decide(a.id, 'REJECTED')}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
function Notifications({ api, onError }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setD(await api('/notifications')); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function markAll() {
    try { await api('/notifications/read-all', { method: 'POST' }); load(); }
    catch (e) { onError && onError(e.message); }
  }

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!d) return <p className="con-sub">Loading…</p>;

  return (
    <div className="an-section">
      <div className="con-home-head-row" style={{ alignItems: 'center' }}>
        <h2 className="an-section-h" style={{ marginBottom: 0 }}>Notifications ({d.unread} unread)</h2>
        <button className="link-inline" type="button" onClick={markAll}>Mark all read</button>
      </div>
      {(d.notifications || []).length === 0 && <p className="con-sub">No notifications.</p>}
      {(d.notifications || []).map((n) => (
        <div key={n.id} className="sentinel-notification" style={{ opacity: n.read_at ? 0.6 : 1 }}>
          <span className={sevClass(n.severity)}>{n.severity}</span>
          <span className="sentinel-incident-title">{n.title}</span>
          <span className="con-sub">{fmt(n.body)}</span>
          <span className="con-sub" style={{ marginLeft: 'auto' }}>{fmtDate(n.created_at)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
function Settings({ api, onError }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try { setD(await api('/settings')); setError(''); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function setSchedule(agent, minutes) {
    try {
      await api('/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: { [agent]: Number(minutes) } }),
      });
      setNotice(`Updated ${agent} schedule.`);
      load();
    } catch (e) { onError && onError(e.message); }
  }

  async function toggleEngine(paused) {
    try {
      await api('/engine', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused }),
      });
      setNotice(paused ? 'Sentinel paused.' : 'Sentinel resumed.');
      load();
    } catch (e) { onError && onError(e.message); }
  }

  if (error) return <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>;
  if (!d) return <p className="con-sub">Loading…</p>;

  const engine = d.settings?.engine || {};
  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Controls</h2>
        <p className="con-sub">
          Read-only mode is on and is not an operator toggle: Sentinel detects, records, audits and
          recommends; it never changes a fee or performs a financial correction.
        </p>
        <div className="sentinel-run-row">
          <button className="preview-checkout-btn" type="button" onClick={() => toggleEngine(!engine.paused)}>
            {engine.paused ? 'Resume Sentinel' : 'Pause Sentinel'}
          </button>
          <span className="con-sub">Engine {engine.paused ? 'paused' : 'running'} · read-only {d.read_only ? 'on' : 'OFF'}</span>
        </div>
        {notice && <p className="con-sub">{notice}</p>}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Schedules</h2>
        <table className="sentinel-table">
          <thead><tr><th>Agent</th><th>Responsibility</th><th>Every (minutes)</th><th>AI</th><th>State</th></tr></thead>
          <tbody>
            {(d.agents || []).map((a) => (
              <tr key={a.agent}>
                <td>{a.name}</td>
                <td className="sentinel-responsibility">{a.responsibility}</td>
                <td>
                  <input className="growth-input" type="number" defaultValue={a.schedule_minutes}
                    style={{ maxWidth: 90 }}
                    onBlur={(e) => setSchedule(a.agent, e.target.value)} />
                </td>
                <td>{a.needs_ai ? 'yes' : 'no'}</td>
                <td>{a.paused ? 'paused' : 'active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Limits &amp; thresholds</h2>
        <pre className="sentinel-evidence">{JSON.stringify({ limits: d.settings?.limits, alerts: d.settings?.alerts }, null, 2)}</pre>
      </div>
    </div>
  );
}
