'use client';

// Analytics -- the redesigned dashboard surface, in four areas.
//
//   A. Growth overview  -- where the pipeline is, and where it is blocked
//   B. Agents           -- what each agent is for, and what it is producing
//   C. Sources          -- which discovery sources earn their place
//   D. Outreach ops     -- what is queued, what left, and what is blocking
//
// This component only DISPLAYS. Every number comes from the backend snapshot at
// GET /growth/analytics, which counts real rows at query time; the UI never
// computes, estimates or caches a metric. Blockers are rendered first because
// the most useful thing on the page is what is stopping progress right now.
//
// Tax analytics and the transaction-price-change (fee monitor) panels that used
// to live here were removed with the tax feature; provider pricing is monitored
// under Konduyt Sentinel, not under Analytics.

import { useState, useEffect, useCallback } from 'react';

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString();
}

function pct(x) {
  if (x === null || x === undefined) return '—';
  return `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
}

function ago(iso) {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (!then) return 'never';
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const STATE_TONE = {
  HEALTHY: 'ok', WATCH: 'warn', UNDERPERFORMING: 'bad', PAUSED: 'muted',
  RETIRED: 'muted', DISABLED: 'muted',
  RUNNING: 'ok', IDLE: 'muted', WAITING: 'warn', ERROR: 'bad',
  RATE_LIMITED: 'warn', COMPLETED: 'ok', PARTIAL: 'warn', FAILED: 'bad',
  CANCELLED: 'muted', STALE: 'warn',
};

const REC_TONE = { KEEP: 'ok', WATCH: 'warn', PAUSE: 'bad', RETIRE: 'bad' };

function Pill({ value, tone }) {
  return <span className={`an-pill an-pill-${tone || STATE_TONE[value] || 'muted'}`}>{value}</span>;
}

export default function AnalyticsTab({ apiBase, authHeaders, onError }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [area, setArea] = useState('overview');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/growth/analytics`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      onError && onError(e.message);
    }
    setLoading(false);
  }, [apiBase, authHeaders, onError]);

  useEffect(() => { load(); }, [load]);

  const blockers = (data && data.blockers) || [];
  const ov = (data && data.overview) || null;

  return (
    <div className="an-root">
      <div className="con-home-head con-home-head-row">
        <div>
          <h1 className="con-h1">Analytics</h1>
          <p className="con-sub">
            The growth pipeline, its agents, its sources and its outreach — counted from real
            rows, never estimated. Blockers first.
          </p>
        </div>
        <button className="preview-checkout-btn" type="button" disabled={loading} onClick={load}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Blockers -- the first thing a reader should see. */}
      {blockers.length > 0 && (
        <div className="an-blockers">
          <h2 className="an-blockers-h">Blockers ({blockers.length})</h2>
          {blockers.map((b, i) => (
            <div className={`an-blocker an-blocker-${b.level}`} key={i}>
              <span className="an-blocker-area">{b.area}</span>
              <div className="an-blocker-body">
                <span className="an-blocker-msg">{b.message}</span>
                {b.action && <span className="an-blocker-action">{b.action}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {data && blockers.length === 0 && (
        <p className="an-clear">No blockers detected. The pipeline is running.</p>
      )}

      <nav className="con-tabs" style={{ marginTop: 18 }}>
        {[['overview', 'A · Growth overview'], ['agents', 'B · Agents'],
          ['sources', 'C · Sources'], ['outreach', 'D · Outreach ops']].map(([id, label]) => (
          <button key={id} type="button"
            className={area === id ? 'con-tab active' : 'con-tab'}
            onClick={() => setArea(id)}>{label}</button>
        ))}
      </nav>

      {!data && loading && <p className="con-sub" style={{ marginTop: 16 }}>Loading…</p>}

      {data && area === 'overview' && ov && <AreaOverview ov={ov} />}
      {data && area === 'agents' && <AreaAgents agents={data.agents}
        expanded={expanded} setExpanded={setExpanded} />}
      {data && area === 'sources' && <AreaSources sources={data.sources}
        apiBase={apiBase} authHeaders={authHeaders} onError={onError} reload={load} />}
      {data && area === 'outreach' && <AreaOutreach outreach={data.outreach} />}

      {data && (
        <p className="an-foot">
          Snapshot {ago(data.generated_at)} · workspace {data.workspace}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A. Growth overview -- the funnel, honestly staged.
// ---------------------------------------------------------------------------
function AreaOverview({ ov }) {
  const stages = [
    ['Discovered', ov.discovered, 'prospects found across all sources'],
    ['Qualified', ov.qualified, 'concrete payment evidence, cleared the gate'],
    ['With a contact channel', ov.qualified_with_contact,
      'qualified AND reachable — the growth target'],
    ['Contacted', ov.contacted, 'a real message left'],
    ['Replied', ov.replies, 'a real reply came back'],
    ['Signed up', ov.signups, ''],
    ['Converted', ov.conversions, ''],
  ];
  const max = Math.max(1, ...stages.map((s) => s[1] || 0));
  return (
    <div>
      <div className="ov-stats an-stats">
        <div className="ov-stat">
          <span className="ov-stat-label">Qualified</span>
          <span className="ov-stat-value">{fmt(ov.qualified)}</span>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-label">Contactable</span>
          <span className="ov-stat-value">{fmt(ov.qualified_with_contact)}</span>
          <span className="ov-stat-sub">{pct(ov.contactable_rate)} of qualified</span>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-label">Contacted</span>
          <span className="ov-stat-value">{fmt(ov.contacted)}</span>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-label">Replies</span>
          <span className="ov-stat-value">{fmt(ov.replies)}</span>
          <span className="ov-stat-sub">{pct(ov.reply_rate)} of contacted</span>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-label">Signups</span>
          <span className="ov-stat-value">{fmt(ov.signups)}</span>
        </div>
        <div className="ov-stat">
          <span className="ov-stat-label">Conversions</span>
          <span className="ov-stat-value">{fmt(ov.conversions)}</span>
          <span className="ov-stat-sub">{pct(ov.conversion_rate)} of contacted</span>
        </div>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Pipeline</h2>
        <div className="growth-funnel">
          {stages.map(([label, value, hint]) => (
            <div className="growth-funnel-row" key={label} title={hint}>
              <span className="growth-funnel-l">{label}</span>
              <div className="growth-funnel-bar"
                style={{ width: `${Math.max(2, Math.round(((value || 0) / max) * 100))}%` }} />
              <span className="growth-funnel-n">{fmt(value)}</span>
            </div>
          ))}
        </div>
        <p className="an-note">
          Qualification rate {pct(ov.qualification_rate)} of {fmt(ov.reviewed)} reviewed ·
          {' '}{fmt(ov.nurture)} nurture · {fmt(ov.rejected)} rejected.
        </p>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Email</h2>
        <div className="an-kv-grid">
          <div className="an-kv"><span>Queued</span><b>{fmt(ov.emails.queued)}</b></div>
          <div className="an-kv"><span>Accepted by transport</span><b>{fmt(ov.emails.accepted)}</b></div>
          <div className="an-kv"><span>Delivery confirmed</span><b>{fmt(ov.emails.delivered_confirmed)}</b></div>
          <div className="an-kv"><span>Failed</span><b>{fmt(ov.emails.failed)}</b></div>
          <div className="an-kv"><span>Duplicate-suppressed</span><b>{fmt(ov.emails.duplicate_suppressed)}</b></div>
          <div className="an-kv"><span>Unresolved</span><b>{fmt(ov.emails.unresolved)}</b></div>
        </div>
        <p className="an-note">{ov.delivery_confirmation_note}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// B. Agents
// ---------------------------------------------------------------------------
function AreaAgents({ agents, expanded, setExpanded }) {
  return (
    <div className="an-section">
      <h2 className="an-section-h">Agents ({agents.length})</h2>
      <div className="an-agents">
        {agents.map((a) => {
          const open = expanded === a.agent;
          return (
            <div className={`an-agent ${open ? 'open' : ''}`} key={a.agent}>
              <button type="button" className="an-agent-head"
                onClick={() => setExpanded(open ? null : a.agent)}>
                <span className="an-agent-name">{a.agent.replace(/_/g, ' ')}</span>
                <Pill value={a.status} />
              </button>
              <p className="an-agent-purpose">{a.purpose}</p>
              <div className="an-agent-stats">
                <span title="prospects this agent discovered">discovered <b>{fmt(a.discovered)}</b></span>
                <span title="of those, qualified">qualified <b>{fmt(a.qualified)}</b></span>
                <span title="actions recorded">actions <b>{fmt(a.totals.actions)}</b></span>
                <span title="errors recorded">errors <b>{fmt(a.totals.errors)}</b></span>
              </div>
              <div className="an-agent-meta">
                <span>Last run: {a.last_run ? ago(a.last_run.started_at) : 'never'}
                  {a.last_run && a.last_run.status ? ` · ${a.last_run.status}` : ''}</span>
                <span>Next: {a.next_run ? new Date(a.next_run).toLocaleTimeString() : 'per schedule'}</span>
              </div>
              {a.last_run && a.last_run.summary && (
                <p className="an-agent-summary">{a.last_run.summary}</p>
              )}

              {open && (
                <div className="an-agent-detail">
                  <h3>Recent errors</h3>
                  {a.recent_errors.length === 0 && <p className="an-note">No errors recorded.</p>}
                  <ul className="an-err-list">
                    {a.recent_errors.map((e, i) => (
                      <li key={i}>
                        <span className="an-err-at">{ago(e.at)}</span>
                        {e.source && <span className="an-err-src">{e.source}</span>}
                        <span className="an-err-msg">{e.message}</span>
                      </li>
                    ))}
                  </ul>
                  <h3>Last run detail</h3>
                  <pre className="an-pre">{JSON.stringify(a.last_run, null, 1)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// C. Sources
// ---------------------------------------------------------------------------
function AreaSources({ sources, apiBase, authHeaders, onError, reload }) {
  const [audit, setAudit] = useState(null);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState('');
  const [reason, setReason] = useState('');

  const loadAudit = useCallback(async () => {
    try {
      const r = await fetch(`${apiBase}/growth/sources/audit`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setAudit(await r.json());
    } catch (e) { onError && onError(e.message); }
  }, [apiBase, authHeaders, onError]);

  useEffect(() => { loadAudit(); }, [loadAudit]);

  const recBySource = {};
  ((audit && audit.sources) || []).forEach((a) => { recBySource[a.source] = a; });

  async function act(source, action) {
    if (action === 'retire' && !reason.trim()) {
      onError && onError('A retirement reason is required.');
      return;
    }
    setBusy(source);
    try {
      const r = await fetch(`${apiBase}/growth/sources/${source}/${action}`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'retire' ? { reason } : { note: 'Restored from Analytics' }),
      });
      if (!r.ok) {
        let m = `HTTP ${r.status}`;
        try { const d = await r.json(); m = d.detail?.message || d.message || m; } catch (e) {}
        throw new Error(m);
      }
      setReason('');
      await loadAudit();
      reload && reload();
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  const active = sources.filter((s) => !s.retired && s.enabled);
  const retired = sources.filter((s) => s.retired || !s.enabled);

  const row = (s) => {
    const a = recBySource[s.source];
    const isOpen = open === s.source;
    return (
      <div className={`an-source ${isOpen ? 'open' : ''}`} key={s.source}>
        <button type="button" className="an-source-head"
          onClick={() => setOpen(isOpen ? null : s.source)}>
          <span className="an-source-name">{s.name}</span>
          <span className="an-source-conn">{s.connector}</span>
          {a && <Pill value={a.recommendation} tone={REC_TONE[a.recommendation]} />}
          <Pill value={s.state} />
          {s.requires_auth && !s.auth_env_var && <Pill value="NO KEY" tone="warn" />}
        </button>
        <div className="an-source-yield">
          <span title="prospects attributed to this source">found <b>{fmt(s.prospects_discovered)}</b></span>
          <span title="qualified">qual <b>{fmt(s.qualified)}</b></span>
          <span title="qualified with a contact channel">contactable <b>{fmt(s.contactable)}</b></span>
          <span title="contacted">contacted <b>{fmt(s.contacted)}</b></span>
          <span title="scans that succeeded / failed">
            scans <b>{fmt(s.success_count)}</b>/<b>{fmt(s.failure_count)}</b>
          </span>
          {s.last_success_at && <span className="an-muted">ok {ago(s.last_success_at)}</span>}
        </div>
        {a && <p className="an-source-rec">{a.reason}</p>}

        {isOpen && (
          <div className="an-source-detail">
            {a && (
              <>
                <h3>Audit</h3>
                <div className="an-kv-grid">
                  <div className="an-kv"><span>Qualification rate</span><b>{pct(a.metrics.qualification_rate)}</b></div>
                  <div className="an-kv"><span>Contactable rate</span><b>{pct(a.metrics.contactable_rate)}</b></div>
                  <div className="an-kv"><span>Duplicate rate</span><b>{pct(a.metrics.duplicate_rate)}</b></div>
                  <div className="an-kv"><span>Consecutive failures</span><b>{fmt(a.metrics.consecutive_failures)}</b></div>
                  <div className="an-kv"><span>Reviewed</span><b>{fmt(a.metrics.reviewed)}</b></div>
                  <div className="an-kv"><span>Rejected</span><b>{fmt(a.metrics.rejected)}</b></div>
                  <div className="an-kv"><span>Signups</span><b>{fmt(a.metrics.signups)}</b></div>
                  <div className="an-kv"><span>Last failure</span><b>{ago(a.metrics.last_failure_at)}</b></div>
                </div>
                {s.retired_reason && (
                  <p className="an-note">Retired {ago(s.retired_at)}: {s.retired_reason}</p>
                )}
              </>
            )}
            <div className="an-source-actions">
              {!s.retired && s.enabled && (
                <>
                  <input className="growth-input" placeholder="Reason for retiring…"
                    value={reason} onChange={(e) => setReason(e.target.value)} />
                  <button className="preview-checkout-btn" type="button"
                    disabled={busy === s.source} onClick={() => act(s.source, 'retire')}>
                    {busy === s.source ? 'Working…' : 'Retire source'}
                  </button>
                </>
              )}
              {(s.retired || !s.enabled) && (
                <button className="preview-checkout-btn" type="button"
                  disabled={busy === s.source} onClick={() => act(s.source, 'restore')}>
                  {busy === s.source ? 'Working…' : 'Restore source'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="an-section">
      <h2 className="an-section-h">Active sources ({active.length})</h2>
      <div className="an-sources">{active.map(row)}</div>
      {retired.length > 0 && (
        <>
          <h2 className="an-section-h" style={{ marginTop: 22 }}>
            Retired / disabled ({retired.length})
          </h2>
          <div className="an-sources">{retired.map(row)}</div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// D. Outreach ops
// ---------------------------------------------------------------------------
function AreaOutreach({ outreach }) {
  const q = outreach.queue;
  const s = outreach.sending;
  const sup = outreach.suppression;
  const exp = outreach.experiment;
  const ib = outreach.inbox || {};
  const ibCounts = ib.counts || {};
  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Queue</h2>
        <div className="an-kv-grid">
          <div className="an-kv"><span>Pending email approvals</span><b>{fmt(q.pending_email)}</b></div>
          <div className="an-kv"><span>Auto-approved</span><b>{fmt(q.auto_approved)}</b></div>
          <div className="an-kv"><span>Decided (all time)</span><b>{fmt(q.decided)}</b></div>
          <div className="an-kv"><span>Stuck &gt; 24h</span><b>{fmt(q.stuck)}</b></div>
          <div className="an-kv"><span>Pending follow-ups</span><b>{fmt(q.followups_pending)}</b></div>
        </div>
        {Object.keys(q.pending_by_kind || {}).length > 0 && (
          <p className="an-note">
            By kind: {Object.entries(q.pending_by_kind).map(([k, v]) => `${k} ${v}`).join(' · ')}
          </p>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Sending ledger</h2>
        <div className="an-kv-grid">
          {Object.entries(s.ledger || {}).map(([k, v]) => (
            <div className="an-kv" key={k}><span>{k}</span><b>{fmt(v)}</b></div>
          ))}
        </div>
        {s.failure_reasons.length > 0 && (
          <>
            <h3 className="an-sub-h">Failure reasons</h3>
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>Kind</th><th>Reason</th><th>Count</th><th>Last</th></tr></thead>
                <tbody>
                  {s.failure_reasons.map((f, i) => (
                    <tr key={i}>
                      <td>{f.kind}</td>
                      <td>{f.reason}</td>
                      <td>{fmt(f.count)}</td>
                      <td>{ago(f.last_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {s.recent_failures.length > 0 && (
          <>
            <h3 className="an-sub-h">Recent failures</h3>
            <ul className="an-err-list">
              {s.recent_failures.map((f, i) => (
                <li key={i}>
                  <span className="an-err-at">{ago(f.at)}</span>
                  {f.recipient && <span className="an-err-src">{f.recipient}</span>}
                  <span className="an-err-msg">{f.error_kind}: {f.reason}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {s.failure_reasons.length === 0 && s.recent_failures.length === 0 && (
          <p className="an-note">No failed or unresolved sends recorded.</p>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Suppression</h2>
        <div className="an-kv-grid">
          <div className="an-kv"><span>Total suppressed</span><b>{fmt(sup.total)}</b></div>
          <div className="an-kv"><span>Opt-outs</span><b>{fmt(sup.optouts)}</b></div>
          {Object.entries(sup.by_reason || {}).map(([k, v]) => (
            <div className="an-kv" key={k}><span>{k}</span><b>{fmt(v)}</b></div>
          ))}
        </div>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Inbound replies</h2>
        <div className="an-kv-grid">
          <div className="an-kv"><span>Inbox readable</span>
            <b>{ib.can_read ? 'YES' : 'NO'}</b></div>
          <div className="an-kv"><span>Replies processed</span><b>{fmt(ibCounts.processed)}</b></div>
          <div className="an-kv"><span>Unmatched</span><b>{fmt(ibCounts.unmatched)}</b></div>
          <div className="an-kv"><span>Ambiguous</span><b>{fmt(ibCounts.ambiguous)}</b></div>
          <div className="an-kv"><span>Errors</span><b>{fmt(ibCounts.errors)}</b></div>
          <div className="an-kv"><span>Last poll</span>
            <b>{ib.last_poll_at ? ago(ib.last_poll_at) : '—'}</b></div>
        </div>
        {ib.enabled && !ib.can_read && (
          <p className="an-note">
            The connected email account cannot read its inbox, so replies are invisible and a
            prospect who replied is emailed again. {ib.action_required || ''}
          </p>
        )}
        {ib.last_error && <p className="an-note">Last error: {ib.last_error}</p>}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Experiment</h2>
        <div className="an-kv-grid">
          <div className="an-kv"><span>State</span><b>{exp.state || '—'}</b></div>
          <div className="an-kv"><span>Effective daily rate</span><b>{fmt(exp.effective_daily_rate)}</b></div>
          <div className="an-kv"><span>Current batch</span><b>{fmt(exp.current_batch)}</b></div>
          <div className="an-kv"><span>Batch size</span><b>{fmt(exp.current_batch_size)}</b></div>
          <div className="an-kv"><span>Next batch size</span><b>{fmt(exp.next_batch_size)}</b></div>
        </div>
        {exp.decision_reason && <p className="an-note">{exp.decision_reason}</p>}
        {exp.last_evaluated_at && (
          <p className="an-note">Last evaluated {ago(exp.last_evaluated_at)}.</p>
        )}
      </div>
    </div>
  );
}
