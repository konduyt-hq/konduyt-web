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

import { useState, useEffect, useCallback, useRef } from 'react';

const VIEWS = [
  ['overview', 'Overview'],
  ['proposals', 'Fee Proposals'],
  ['discovery', 'Discovery'],
  ['transaction-fees', 'Transaction fees'],
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

// A discovery result's observed_value is a STRUCTURE ({currency, fixed_fee,
// percentage_fee, ...}), not a scalar. Rendering it raw would crash React
// ("objects are not valid as a React child"), so summarise it as a short
// readable string -- and never invent a number that is not there.
function observedSummary(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v !== 'object') return String(v);
  const parts = [];
  if (v.percentage_fee != null) parts.push(`${v.percentage_fee}%`);
  if (v.fixed_fee != null) parts.push(`${v.fixed_fee}${v.currency ? ' ' + v.currency : ''}`);
  if (parts.length === 0) {
    const keys = Object.keys(v);
    return keys.length ? keys.map((k) => `${k}: ${v[k]}`).join(', ') : '—';
  }
  // Flag an unconfirmed fee type rather than presenting it as exact.
  if (v.fee_type_confident === false) parts.push('(fee type unconfirmed)');
  return parts.join(' + ');
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
// A fee value is stored as JSONB {percentage, fixed_fee, currency}. Render it
// the way an approver reads a price: "2.5%" or "50.00 KES", never a raw object.
function fee(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v !== 'object') return String(v);
  const parts = [];
  if (v.percentage !== null && v.percentage !== undefined) parts.push(`${v.percentage}%`);
  if (v.fixed_fee !== null && v.fixed_fee !== undefined) {
    parts.push(`${v.fixed_fee}${v.currency ? ' ' + v.currency : ''}`);
  }
  return parts.length ? parts.join(' + ') : '—';
}
function propStatusClass(s) {
  const v = (s || '').toLowerCase();
  if (v === 'pending') return 'sentinel-pill sentinel-pill-med';
  if (v === 'approved') return 'sentinel-pill sentinel-pill-healthy';
  // Applied is distinct from approved on purpose: approved means "a human
  // said yes, nothing was written"; applied means the fee row was written.
  if (v === 'applied') return 'sentinel-pill sentinel-pill-applied';
  if (v === 'rejected') return 'sentinel-pill sentinel-pill-critical';
  if (v === 'failed') return 'sentinel-pill sentinel-pill-critical';
  return 'sentinel-pill sentinel-pill-info';
}

// Turn an error response into something a person can act on. Sentinel's 409s
// carry an OBJECT detail ({"error": "...", "detail": {...}}), so a naive
// `new Error(detail)` stringifies to "[object Object]" and hides the server's
// actual reason -- exactly the misleading message we must not show.
function apiErrorMessage(body, res) {
  const d = (body && body.detail !== undefined) ? body.detail : body;
  if (typeof d === 'string' && d) return d;
  if (d && typeof d === 'object') {
    if (typeof d.message === 'string' && d.message) return d.message;
    if (typeof d.error === 'string' && d.error) {
      const inner = d.detail;
      if (typeof inner === 'string' && inner) return `${d.error}: ${inner}`;
      if (inner && typeof inner === 'object' && typeof inner.reason === 'string') {
        return `${d.error}: ${inner.reason}`;
      }
      return d.error;
    }
    if (typeof d.reason === 'string' && d.reason) return d.reason;
    try { return JSON.stringify(d); } catch (e) { /* fall through */ }
  }
  return (res && `${res.status} ${res.statusText}`) || 'Request failed';
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
      let body = null;
      try { body = await r.json(); } catch (e) { /* non-JSON error body */ }
      throw new Error(apiErrorMessage(body, r));
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
      {view === 'proposals' && <Proposals api={api} onError={onError} />}
      {view === 'discovery' && <Discovery api={api} onError={onError} />}
      {view === 'transaction-fees' && <TransactionFees api={api} onError={onError} />}
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
// Fee Proposals (discovery -> approval -> publication)
// ---------------------------------------------------------------------------
//
// This is the ONLY view in Sentinel that can change a fee, and only after an
// explicit human approval. Everything shown comes from the server: the proposal,
// the evidence, the confidence, the verification status and — critically — the
// scope statement, which says in plain words whether approving updates
// provider_fees alone or ALSO stages a separate rp_pricing_rules consequence.
// The UI never decides that; it renders what the server looked up.
function Proposals({ api, onError }) {
  const [status, setStatus] = useState('PENDING');
  const [d, setD] = useState(null);
  const [open, setOpen] = useState(null);      // the approval_view payload
  const [error, setError] = useState('');      // last LOAD error
  const [actionError, setActionError] = useState(''); // last approve/reject/publish error
  const [loadedAt, setLoadedAt] = useState(null);     // when d was last confirmed fresh
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const inflight = useRef(false); // survives re-render; blocks duplicate submits

  const load = useCallback(async () => {
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      const res = await api('/proposals' + q);
      setD(res); setError(''); setLoadedAt(new Date());
    } catch (e) {
      // Keep the last good payload but mark it stale. A failed request must
      // NEVER be rendered as "no proposals" -- that is the exact failure this
      // guards against. The error is shown, not swallowed.
      setError(e.message); onError && onError(e.message);
    }
  }, [api, onError, status]);

  useEffect(() => { load(); }, [load]);

  async function openProposal(id) {
    setNotice(''); setActionError('');
    try { setOpen(await api(`/proposals/${id}/approval-view`)); }
    catch (e) { setActionError(e.message); onError && onError(e.message); }
  }

  async function decide(id, decision) {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(id + ':' + decision); setNotice(''); setActionError('');
    try {
      const res = await api(`/proposals/${id}/decide`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      setNotice(`${decision === 'APPROVED' ? 'Approved' : 'Rejected'} ${id}`
        + ` (server status: ${res.status || decision}).`
        + (decision === 'APPROVED'
          ? ' Approving did NOT publish — use Publish to write the fee.' : ''));
      setOpen(null);
      await load();
    } catch (e) {
      setActionError(`Could not ${decision === 'APPROVED' ? 'approve' : 'reject'} ${id}: ${e.message}`);
      onError && onError(e.message);
    }
    setBusy(''); inflight.current = false;
  }

  async function publish(id) {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(id + ':apply'); setNotice(''); setActionError('');
    try {
      const res = await api(`/proposals/${id}/apply`, { method: 'POST' });
      const c = res.result && res.result.consequence_proposal;
      // The server reports a re-apply as reason:"already_applied" (idempotent
      // no-op). Say so plainly rather than claiming a second write happened.
      if (res.reason === 'already_applied') {
        setNotice(`Already published — no change made. Proposal ${id} was applied earlier; `
          + 'this request was a no-op, so the fee was not written twice.');
      } else {
        setNotice(`Published ${id} to provider_fees.`
          + (c ? ` A separate consequence proposal ${c.id} was staged for rp_pricing_rules — it is NOT applied.` : ''));
      }
      setOpen(null);
      await load();
    } catch (e) {
      setActionError(`Could not publish ${id}: ${e.message}`);
      onError && onError(e.message);
    }
    setBusy(''); inflight.current = false;
  }

  const props = (d && d.proposals) || [];
  const stale = !!error && !!d;

  return (
    <div className="an-section">
      <h2 className="an-section-h">Fee proposals</h2>
      <p className="con-sub">
        Changes Sentinel discovered and verified, staged for a human decision. A proposal changes
        nothing until it is approved and then published. Publication writes only provider_fees; a
        matching routing rule is staged as a separate consequence proposal, never applied as a
        side effect.
      </p>
      <p className="con-sub" style={{ marginTop: -6 }}>
        <strong>Not a catalogue change:</strong> publishing a proposal updates the provider&rsquo;s
        fee row only. It never changes <code>customer_fees</code> (what a customer is charged) and
        never changes <code>rp_pricing_rules</code>; if a routing rule is affected it is staged as
        a separate proposal that needs its own approval.
      </p>

      <div className="sentinel-run-row" style={{ marginBottom: 12 }}>
        {['PENDING', 'APPROVED', 'APPLIED', 'REJECTED', ''].map((s) => (
          <button key={s || 'all'} type="button"
            className={status === s ? 'con-tab active' : 'con-tab'}
            onClick={() => setStatus(s)}>{s || 'All'}</button>
        ))}
      </div>

      {/* Legend: the four states an operator must never confuse. */}
      <p className="con-sub sentinel-legend">
        <span className={propStatusClass('PENDING')}>PENDING</span> verified, waiting for a human —
        nothing written.&nbsp;
        <span className={propStatusClass('APPROVED')}>APPROVED</span> a human said yes — still
        nothing written.&nbsp;
        <span className={propStatusClass('APPLIED')}>APPLIED</span> the fee row was written.&nbsp;
        <span className={propStatusClass('REJECTED')}>REJECTED</span> dismissed — never written.
      </p>

      {notice && <p className="con-sub" style={{ marginBottom: 12, color: '#166534' }}>{notice}</p>}
      {actionError && (
        <p className="con-sub" style={{ marginBottom: 12, color: '#b91c1c' }}>{actionError}</p>
      )}

      {/* Load states, kept strictly separate from "no proposals". */}
      {!d && !error && <p className="con-sub">Loading proposals…</p>}
      {error && !d && (
        <p className="con-sub" style={{ color: '#b91c1c' }}>
          Could not load proposals: {error}. This is a fetch failure — it does not mean there are
          no pending proposals. Retry with the state buttons above.
        </p>
      )}
      {stale && (
        <p className="con-sub" style={{ color: '#b45309' }}>
          Showing the last successfully loaded list (from {loadedAt ? fmtDate(loadedAt) : 'earlier'})
          — the latest refresh failed: {error}. The list below may be out of date.
        </p>
      )}
      {d && props.length === 0 && !error && (
        <p className="con-sub">No proposals in this state.</p>
      )}

      {props.map((p) => (
        <div key={p.id} className="sentinel-incident">
          <div className="sentinel-incident-top">
            <span className={propStatusClass(p.status)}>{p.status}</span>
            <span className="sentinel-pill sentinel-pill-info">{p.kind}</span>
            <span className="sentinel-incident-title">{p.summary}</span>
            <span className="con-sub" style={{ marginLeft: 'auto' }}>{fmtDate(p.created_at)}</span>
          </div>
          <div className="sentinel-incident-grid">
            <div><span className="con-sub">Provider</span><div>{fmt(p.provider)}</div></div>
            <div><span className="con-sub">Method</span><div>{fmt(p.payment_method)}</div></div>
            <div><span className="con-sub">Country</span><div>{fmt(p.country)}</div></div>
            <div><span className="con-sub">Currency</span><div>{fmt(p.currency)}</div></div>
            <div><span className="con-sub">Current fee</span><div>{fee(p.old_value)}</div></div>
            <div><span className="con-sub">Proposed fee</span><div>{fee(p.proposed_value)}</div></div>
            <div><span className="con-sub">Confidence</span><div>{fmt(p.confidence)}</div></div>
            <div><span className="con-sub">Verification</span><div>{fmt(p.verification)}</div></div>
            <div><span className="con-sub">Target</span><div>{fmt(p.target_table)} · {fmt(p.target_record_id)}</div></div>
          </div>
          <div className="sentinel-run-row">
            <button className="link-inline" type="button" onClick={() => openProposal(p.id)}>
              View evidence &amp; scope
            </button>
            {p.status === 'PENDING' && (
              <>
                <button className="preview-checkout-btn" type="button"
                  disabled={!!busy} onClick={() => decide(p.id, 'APPROVED')}>
                  {busy === p.id + ':APPROVED' ? 'Approving…' : 'Approve'}
                </button>
                <button className="link-inline" type="button"
                  disabled={!!busy} onClick={() => decide(p.id, 'REJECTED')}>
                  {busy === p.id + ':REJECTED' ? 'Rejecting…' : 'Reject'}
                </button>
              </>
            )}
            {p.status === 'APPROVED' && (
              <button className="preview-checkout-btn" type="button"
                disabled={!!busy} onClick={() => publish(p.id)}>
                {busy === p.id + ':apply' ? 'Publishing…' : 'Publish to catalogue'}
              </button>
            )}
            {p.status === 'APPLIED' && (
              <span className="con-sub">Already written to provider_fees — no further action.</span>
            )}
          </div>
        </div>
      ))}

      {open && (
        <div className="sentinel-incident" style={{ borderColor: '#1d4ed8' }}>
          <div className="sentinel-incident-top">
            <span className="sentinel-pill sentinel-pill-info">Approval scope</span>
            <span className="sentinel-incident-title">{open.proposal && open.proposal.id}</span>
            <button className="link-inline" type="button" style={{ marginLeft: 'auto' }}
              onClick={() => setOpen(null)}>Close</button>
          </div>
          <p className="con-sub" style={{ fontWeight: 600, color: 'var(--ink)' }}>
            {open.scope_statement}
          </p>
          {open.caveat && (
            <p className="con-sub" style={{ color: '#b45309' }}>{open.caveat}</p>
          )}
          <div className="sentinel-incident-grid">
            <div><span className="con-sub">Changes</span><div>{open.changes && open.changes.table} · {open.changes && open.changes.record_id}</div></div>
            <div><span className="con-sub">Field</span><div>{fmt(open.changes && open.changes.field)}</div></div>
            <div><span className="con-sub">Old → new</span><div>{fee(open.changes && open.changes.old)} → {fee(open.changes && open.changes.new)}</div></div>
            <div><span className="con-sub">Execution engine changed?</span><div>{open.affects_execution_engine ? 'YES — this changes what is charged' : 'No'}</div></div>
          </div>
          <p className="con-sub">
            Consequence: {open.consequence && open.consequence.will_stage
              ? `a separate rp_pricing_rules proposal will be staged for ${open.consequence.record_id}`
              : (open.consequence && open.consequence.reason) || 'none'}
          </p>
          <p className="con-sub">Source: {open.source_url
            ? <a href={open.source_url} target="_blank" rel="noreferrer">{open.source_url}</a>
            : '—'}</p>
          <p className="con-sub">Evidence: {open.evidence
            ? <code>{JSON.stringify(open.evidence)}</code> : '—'}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discovery (the scheduled search sweep)
// ---------------------------------------------------------------------------
function Discovery({ api, onError }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadedAt, setLoadedAt] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const res = await api('/discovery'); setD(res); setError(''); setLoadedAt(new Date()); }
    catch (e) { setError(e.message); onError && onError(e.message); }
  }, [api, onError]);

  useEffect(() => { load(); }, [load]);

  async function seed() {
    setBusy(true); setNotice('');
    try {
      const res = await api('/discovery/seed', { method: 'POST' });
      setNotice(`Seeded ${res.inserted} new search queries.`);
      await load();
    } catch (e) { setError(`Could not seed searches: ${e.message}`); onError && onError(e.message); }
    setBusy(false);
  }

  const queries = (d && d.queries) || [];
  const results = (d && d.results) || [];
  const stale = !!error && !!d;

  return (
    <div className="an-section">
      <div className="con-home-head-row" style={{ alignItems: 'center' }}>
        <h2 className="an-section-h" style={{ marginBottom: 0 }}>
          Scheduled searches ({d ? d.total_queries : '…'})
        </h2>
        <button className="preview-checkout-btn" type="button" disabled={busy} onClick={seed}>
          {busy ? 'Seeding…' : 'Seed searches'}
        </button>
      </div>
      <p className="con-sub">
        The discovery sweep runs on a 15-minute cron; each query runs on its own interval (6 hours
        by default) and a repeatedly-failing query backs off exponentially. A market-discovery
        result is an UNVERIFIED lead routed to the catalogue review queue — it is never a
        catalogue row and never executable.
      </p>
      {notice && <p className="con-sub" style={{ color: '#166534' }}>{notice}</p>}

      {/* Load/error states, kept separate from "no searches". */}
      {!d && !error && <p className="con-sub">Loading discovery state…</p>}
      {error && !d && (
        <p className="con-sub" style={{ color: '#b91c1c' }}>
          Could not load discovery state: {error}. This is a fetch failure — it does not mean there
          are no scheduled searches. Use “Seed searches” or reopen the view to retry.
        </p>
      )}
      {stale && (
        <p className="con-sub" style={{ color: '#b45309' }}>
          Showing the last successfully loaded state (from {loadedAt ? fmtDate(loadedAt) : 'earlier'})
          — the latest refresh failed: {error}.
        </p>
      )}

      <table className="sentinel-table">
        <thead><tr>
          <th>Query</th><th>Kind</th><th>Country</th><th>Every (min)</th>
          <th>Last run</th><th>Status</th><th>Failures</th>
        </tr></thead>
        <tbody>
          {queries.map((q) => (
            <tr key={q.id}>
              <td className="sentinel-responsibility">{q.query_text}</td>
              <td>
                {q.target_kind === 'market_discovery'
                  ? <span className="sentinel-pill sentinel-pill-info" title="Leads only — never a catalogue row">lead</span>
                  : q.target_kind}
              </td>
              <td>{fmt(q.country)}</td>
              <td>{q.schedule_minutes}</td>
              <td>{fmtDate(q.last_run_at)}</td>
              <td>{fmt(q.last_status)}</td>
              <td>{q.consecutive_failures}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d && queries.length === 0 && !error && (
        <p className="con-sub">No scheduled searches yet. Use “Seed searches” to add the defaults.</p>
      )}

      {/* Recent results: these are LEADS, not proposals. Labelled UNVERIFIED
          so an operator never reads a search hit as a confirmed fee. */}
      <h3 className="an-section-h" style={{ marginTop: 22 }}>
        Recent results ({results.length})
      </h3>
      <p className="con-sub">
        A result is a source Sentinel found, not a confirmed fee. Nothing here is a proposal or a
        catalogue row until a human reviews the lead and it is verified against an official source.
      </p>
      <table className="sentinel-table">
        <thead><tr>
          <th>Status</th><th>Result</th><th>Observed</th><th>Source score</th>
          <th>First seen</th><th>Seen</th>
        </tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id}>
              <td><span className="sentinel-pill sentinel-pill-info">UNVERIFIED lead</span></td>
              <td className="sentinel-responsibility">
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title || r.url}</a> : fmt(r.title)}
              </td>
              <td>{observedSummary(r.observed_value)}</td>
              <td>{fmt(r.source_score)}</td>
              <td>{fmtDate(r.first_seen_at)}</td>
              <td>{r.seen_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d && results.length === 0 && !error && (
        <p className="con-sub">No discovery results recorded yet.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction fees (moved here from the Analytics tab)
// ---------------------------------------------------------------------------
// The four-criteria view: provider gate (no verified Konduyt provider =
// discarded, not shown), max amount, real fee bands per currency, and instant
// recompute via "Update now" (just re-fetches; nothing is cached). It lived on
// the Analytics tab; it is a Sentinel fee surface, so it belongs here. The
// Analytics copy was removed rather than duplicated.
function TransactionFees({ api, onError }) {
  const [continent, setContinent] = useState('africa');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedAt, setLoadedAt] = useState(null);
  const [open, setOpen] = useState(null);              // the entry whose popup is open
  const [history, setHistory] = useState(null);        // fetched only on demand
  const [historyLoading, setHistoryLoading] = useState(false);
  const [observed, setObserved] = useState(null);      // fetched only on demand
  const [observedLoading, setObservedLoading] = useState(false);

  const load = useCallback(async (c) => {
    setLoading(true);
    try {
      const res = await api(`/transaction-fees?continent=${encodeURIComponent(c)}`);
      setData(res); setError(''); setLoadedAt(new Date());
    } catch (e) { setError(e.message); onError && onError(e.message); }
    setLoading(false);
  }, [api, onError]);

  useEffect(() => { load(continent); }, [load, continent]);

  async function loadHistory(ruleId, schema) {
    setHistoryLoading(true);
    try { setHistory((await api(`/intelligence/history?rule_id=${encodeURIComponent(ruleId)}&schema=${schema}`)).versions || []); }
    catch (e) { setHistory([]); onError && onError(e.message); }
    setHistoryLoading(false);
  }

  async function loadObserved(ruleId, schema) {
    setObservedLoading(true);
    try { setObserved(await api(`/intelligence/observed?rule_id=${encodeURIComponent(ruleId)}&schema=${schema}`)); }
    catch (e) { setObserved({ status: 'no_observations' }); onError && onError(e.message); }
    setObservedLoading(false);
  }

  const entries = (data && data.entries) || [];
  const stale = !!error && !!data;

  return (
    <div className="an-section">
      <div className="con-home-head-row" style={{ alignItems: 'center' }}>
        <h2 className="an-section-h" style={{ marginBottom: 0 }}>Sentinel — transaction fees</h2>
        <button className="preview-checkout-btn" type="button" disabled={loading}
          onClick={() => load(continent)}>
          {loading ? 'Updating…' : '↻ Update now'}
        </button>
      </div>
      <p className="con-sub" style={{ marginTop: 6, marginBottom: 12 }}>
        Only shows methods with a real, verified Konduyt provider — everything else is
        discarded rather than shown with a fee nobody could actually route through.
        Konduyt continuously checks provider pricing; the dot next to a method shows how
        current the number actually is — when we can&rsquo;t verify something, we say so rather
        than showing it as if it were confirmed.
      </p>
      <div className="fee-bands-continent-tabs">
        {['africa', 'asia', 'europe', 'north_america', 'south_america', 'oceania'].map((c) => (
          <button key={c} type="button"
            className={continent === c ? 'fee-bands-tab active' : 'fee-bands-tab'}
            onClick={() => setContinent(c)}>
            {c === 'north_america' ? 'North America' : c === 'south_america' ? 'South America'
              : c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p className="con-sub" style={{ marginTop: 12 }}>Computing live from current data…</p>}
      {error && !data && (
        <p className="con-sub" style={{ color: '#b91c1c', marginTop: 12 }}>
          Could not load transaction fees: {error}. This is a fetch failure — it does not mean there
          are no fees to show.
        </p>
      )}
      {stale && (
        <p className="con-sub" style={{ color: '#b45309', marginTop: 12 }}>
          Showing the last successfully computed table (from {loadedAt ? fmtDate(loadedAt) : 'earlier'})
          — the latest refresh failed: {error}.
        </p>
      )}

      {!loading && data && (
        <>
          <p className="con-sub" style={{ marginTop: 10 }}>
            {data.count} payment method{data.count === 1 ? '' : 's'} with a verified provider.
          </p>
          <div className="fee-bands-table-wrap">
            <table className="fee-bands-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Method</th>
                  <th>Provider</th>
                  <th>Max</th>
                  {data.bands.map((b) => <th key={b}>{b}</th>)}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={`${e.country}-${e.payment_method}-${e.provider}-${i}`}>
                    <td>{e.country}</td>
                    <td>
                      {e.payment_method}{e.card_scope ? ` (${e.card_scope})` : ''}
                      {e.category && e.category !== e.payment_method && (
                        <span className="fee-bands-category"> · {e.category}</span>
                      )}
                      {e.intelligence && (
                        <button
                          type="button"
                          className={`fee-intel-dot ${e.intelligence.state.toLowerCase()}`}
                          title={`${e.intelligence.state} · ${e.intelligence.confidence} confidence`}
                          aria-label="Fee freshness and source"
                          onClick={() => { setOpen(e); setHistory(null); setObserved(null); }}
                        />
                      )}
                    </td>
                    <td>{e.provider}</td>
                    <td>{e.max_amount != null ? `${e.max_amount.toLocaleString()} ${e.currency}` : '—'}</td>
                    {e.bands.map((b, j) => (
                      <td key={j} title={b.note || ''}>
                        {b.known ? `${b.fee} ${e.currency}` : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!loading && data && data.count === 0 && !error && (
        <p className="con-sub" style={{ marginTop: 12 }}>
          No payment methods in this continent currently have a verified Konduyt provider.
        </p>
      )}

      {open && (() => {
        const intel = open.intelligence;
        const det = intel.detail;
        const STATE_COPY = {
          VERIFIED: 'Verified',
          RECENT: 'Verified',
          AGING: 'Verified, but ageing',
          UNVERIFIED: 'Not yet confirmed against an official source',
          STALE: 'Pricing may have changed',
          CHANGED: 'Source changed — pending re-check',
          UNKNOWN: 'We could not verify a current public fee',
        };
        const NOTE = {
          STALE: 'This is old enough that Konduyt no longer uses it to rank routes by cost.',
          CHANGED: 'Konduyt detected the source page changed and is no longer treating this number as reliable until it\u2019s re-checked.',
          UNKNOWN: 'No usable number exists yet — never estimated, never assumed.',
          UNVERIFIED: 'Found, but not yet confirmed against the provider\u2019s own source.',
        }[intel.state];
        let sourceHost = det.source;
        try { sourceHost = new URL(det.source).hostname.replace('www.', ''); } catch (e) {}
        return (
          <div className="fee-intel-overlay" onClick={() => setOpen(null)}>
            <div className="fee-intel-popup" onClick={(ev) => ev.stopPropagation()}>
              <button type="button" className="fee-intel-close"
                onClick={() => setOpen(null)} aria-label="Close">✕</button>
              <div className="fee-intel-state">
                <span className={`fee-intel-state-dot ${intel.state.toLowerCase()}`} />
                {STATE_COPY[intel.state] || intel.state}
              </div>
              <div className="fee-intel-method">
                {open.payment_method} · {open.country}
              </div>
              <div className="fee-intel-row">
                <span className="fee-intel-row-label">Confidence</span>
                <span className="fee-intel-row-value">{intel.confidence}</span>
              </div>
              {det.source && (
                <div className="fee-intel-row">
                  <span className="fee-intel-row-label">Source</span>
                  <span className="fee-intel-row-value">
                    <a href={det.source} target="_blank" rel="noreferrer">{sourceHost}</a>
                  </span>
                </div>
              )}
              {det.last_checked && (
                <div className="fee-intel-row">
                  <span className="fee-intel-row-label">Last checked</span>
                  <span className="fee-intel-row-value">{det.last_checked}</span>
                </div>
              )}
              {det.last_source_change && (
                <div className="fee-intel-row">
                  <span className="fee-intel-row-label">Last source change</span>
                  <span className="fee-intel-row-value">{det.last_source_change}</span>
                </div>
              )}
              {det.next_review && (
                <div className="fee-intel-row">
                  <span className="fee-intel-row-label">Next review</span>
                  <span className="fee-intel-row-value">{det.next_review}</span>
                </div>
              )}
              {NOTE && <div className="fee-intel-note">{NOTE}</div>}

              {/* Both below: real data, fetched only on demand -- never on
                  popup open -- and rendered inline, not as a second modal. */}
              {intel.rule_id && (
                <div className="fee-intel-expand">
                  {!history && !historyLoading && (
                    <button type="button" className="fee-intel-expand-btn"
                      onClick={() => loadHistory(intel.rule_id, intel.schema)}>
                      View history
                    </button>
                  )}
                  {historyLoading && <p className="fee-intel-expand-loading">Loading history…</p>}
                  {history && (
                    <div className="fee-intel-history">
                      {history.length === 0 ? (
                        <p className="fee-intel-expand-empty">No version history recorded yet.</p>
                      ) : history.map((v, i) => (
                        <div key={i} className={`fee-intel-history-row ${v.is_current ? 'current' : ''}`}>
                          <span>
                            {v.percentage_fee != null ? `${v.percentage_fee}%` : (v.fixed_fee != null ? v.fixed_fee : '—')}
                          </span>
                          <span className="fee-intel-history-date">
                            {v.is_current ? 'Current' : (v.superseded_at || '').slice(0, 10)}
                            {v.change_reason === 'sentinel_invalidated' && ' · source change detected'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {intel.rule_id && (
                <div className="fee-intel-expand">
                  {!observed && !observedLoading && (
                    <button type="button" className="fee-intel-expand-btn"
                      onClick={() => loadObserved(intel.rule_id, intel.schema)}>
                      Compare to real transactions
                    </button>
                  )}
                  {observedLoading && <p className="fee-intel-expand-loading">Checking…</p>}
                  {observed && (
                    <p className="fee-intel-expand-empty">
                      {observed.status === 'no_observations'
                        ? 'No real Konduyt transactions for this provider yet to compare against.'
                        : observed.status === 'match'
                          ? `Matches what Konduyt's own transactions actually show (${observed.sample_size} recent).`
                          : `Real transactions show ${observed.difference_pp}pp different from the official rate (${observed.sample_size} recent) — worth a re-check.`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
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
