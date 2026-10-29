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

import { useState, useEffect, useCallback, useRef } from 'react';

const VIEWS = [
  ['live', 'Command center'],
  ['cohort', 'Cohort'],
  ['strategy', 'Strategy health'],
  ['experiment', 'Experiment'],
  ['overview', 'Overview'],
  ['sources', 'Sources'],
  ['prospects', 'Prospects'],
  ['contacts', 'Contacts'],
  ['conversations', 'Conversations'],
  ['agents', 'Agents'],
  ['approvals', 'Approvals'],
  ['diagnostics', 'Diagnostics'],
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
  const [view, setView] = useState(() => {
    // Deep link support: the Gmail OAuth callback returns the browser to
    // /dashboard?tab=analytics&growth=settings, so open on the requested view.
    if (typeof window === 'undefined') return 'live';
    const v = new URLSearchParams(window.location.search).get('growth');
    return VIEWS.some(([id]) => id === v) ? v : 'live';
  });
  const [overview, setOverview] = useState(null);
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

  const loadOverview = useCallback(async () => {
    try { setOverview(await api('/overview')); }
    catch (e) { onError && onError(e.message); }
  }, [api, onError]);

  const loadEngine = useCallback(async () => {
    try {
      const s = await api('/live');
      setEngine(s.engine);
    } catch (e) { /* the live view reports its own errors */ }
  }, [api]);

  useEffect(() => { loadOverview(); loadEngine(); }, [loadOverview, loadEngine]);

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

  const running = engine ? engine.running : null;

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
          <EngineBadge engine={engine} busy={busy === 'engine'}
            onToggle={toggleEngine} />
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

      {view === 'live' && <CommandCenter api={api} apiBase={apiBase} authHeaders={authHeaders}
        onError={onError} onEngine={setEngine} running={running} />}
      {view === 'cohort' && <CohortView api={api} onError={onError} />}
      {view === 'strategy' && <StrategyHealth api={api} onError={onError} />}
      {view === 'experiment' && <Experiment api={api} onError={onError} />}
      {view === 'overview' && <Overview api={api} overview={overview} onRefresh={loadOverview} />}
      {view === 'sources' && <Sources api={api} onError={onError} />}
      {view === 'prospects' && <Prospects api={api} onError={onError} />}
      {view === 'contacts' && <Contacts api={api} onError={onError} />}
      {view === 'conversations' && <Conversations api={api} onError={onError} />}
      {view === 'agents' && <Agents api={api} onError={onError} />}
      {view === 'approvals' && <Approvals api={api} onError={onError} onChanged={loadOverview} />}
      {view === 'diagnostics' && <Diagnostics api={api} onError={onError} />}
      {view === 'settings' && <Settings api={api} onError={onError} onEngine={setEngine} />}
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
// Command center -- continuous operation
//
// One live view of the running engine. Data arrives over Server-Sent Events
// (the primary transport) with an automatic polling fallback, so the stream
// keeps growing in place without a page refresh. Every number and event is a
// real row from the backend; when nothing has happened, it says so.
// ---------------------------------------------------------------------------
const EVENT_LABEL = {
  signal_found: 'Signal found',
  prospect_created: 'Prospect created',
  qualified: 'Qualified',
  nurtured: 'Nurture',
  rejected: 'Rejected',
  evidence_collected: 'Evidence',
  contact_found: 'Contact found',
  conversation_detected: 'Conversation',
  email_queued: 'Email queued',
  email_sent: 'Email sent',
  followup_due: 'Follow-up due',
  reply_received: 'Reply',
  signup: 'Signup',
  provider_connected: 'Provider connected',
  activated: 'Activated',
  source_unavailable: 'Source unavailable',
  error: 'Error',
  agent_started: 'Agent started',
  agent_finished: 'Agent finished',
  cohort_selected: 'Cohort selected',
};

// Human wording for each agent's live state.
const STATUS_LABEL = {
  RUNNING: 'Running',
  IDLE: 'Idle',
  WAITING: 'Watching',
  PAUSED: 'Paused',
  ERROR: 'Error',
  RATE_LIMITED: 'Rate limited',
  SOURCE_UNAVAILABLE: 'Source down',
};

function ago(v) {
  if (!v) return '—';
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CounterRow({ label, value, baseline, ceiling }) {
  return (
    <div className="growth-live-counter">
      <div className="growth-live-counter-v">{value ?? 0}</div>
      <div className="growth-live-counter-l">{label}</div>
      {baseline != null && (
        <div className="growth-live-counter-b">
          baseline {baseline}
          {ceiling ? ` · ceiling ${ceiling}` : ''}
        </div>
      )}
    </div>
  );
}

function AgentLiveRow({ a, work }) {
  const status = a.status || 'IDLE';
  const cls = status.toLowerCase();
  return (
    <div className="growth-live-agent">
      <div className="growth-live-agent-top">
        <span className="growth-live-agent-name">{a.agent.replace(/_/g, ' ')}</span>
        <span className={`growth-agent-status ${cls}`}>
          {STATUS_LABEL[status] || status}{a.stale ? ' · stale' : ''}
        </span>
      </div>
      <div className="growth-live-agent-task">
        {work?.task || '—'}
        {work?.prospect ? ` — ${work.prospect}` : ''}
      </div>
      <div className="growth-live-agent-meta">
        {work?.source ? `source: ${work.source} · ` : ''}
        {work?.items_processed != null ? `${work.items_processed} processed · ` : ''}
        {a.last_heartbeat_at ? `heartbeat ${ago(a.last_heartbeat_at)}` : 'no heartbeat yet'}
      </div>
    </div>
  );
}

function CommandCenter({ api, apiBase, authHeaders, onError, onEngine, running }) {
  const [snap, setSnap] = useState(null);
  const [events, setEvents] = useState([]);
  const [transport, setTransport] = useState('connecting');
  const [error, setError] = useState('');
  const cursor = useRef(null);
  const esRef = useRef(null);

  const applySnapshot = useCallback((s) => {
    setSnap(s);
    setError('');
    if (onEngine && s.engine) onEngine(s.engine);
    setEvents((s.activity || []).slice());
    const first = (s.activity || [])[0];
    if (first) cursor.current = { after_created_at: first.created_at, after_id: first.id };
  }, [onEngine]);

  const applyUpdate = useCallback((u) => {
    setSnap((prev) => ({ ...prev, ...u, activity: prev?.activity }));
    if (onEngine && u.engine) onEngine(u.engine);
    if (u.events && u.events.length) {
      // Oldest-first from the server. SSE and the polling fallback can both
      // deliver the same event, so dedupe by id before prepending.
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const fresh = u.events.filter((e) => !seen.has(e.id)).reverse();
        return [...fresh, ...prev].slice(0, 200);
      });
      if (u.cursor) cursor.current = u.cursor;
    }
  }, [onEngine]);

  // Primary transport: SSE. On failure, fall back to polling.
  useEffect(() => {
    let closed = false;
    const token = (authHeaders && (authHeaders().Authorization || '').replace('Bearer ', '')) || '';
    const url = `${apiBase}/growth/live/stream${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
    let es = null;
    try {
      es = new EventSource(url, { withCredentials: true });
      esRef.current = es;
      es.addEventListener('snapshot', (e) => { setTransport('live'); applySnapshot(JSON.parse(e.data)); });
      es.addEventListener('update', (e) => { applyUpdate(JSON.parse(e.data)); });
      es.addEventListener('error', () => {
        // EventSource auto-reconnects; mark degraded so the user knows.
        if (!closed) setTransport('reconnecting');
      });
      es.addEventListener('open', () => setTransport('live'));
    } catch (e) {
      setTransport('polling');
    }
    return () => { closed = true; try { es && es.close(); } catch (e) {} };
  }, [apiBase, authHeaders, applySnapshot, applyUpdate]);

  // Fallback / safety net: poll for new events. Runs quietly alongside SSE so
  // the view still updates if a proxy drops the stream.
  useEffect(() => {
    let alive = true;
    let timer = null;
    async function tick() {
      try {
        const q = cursor.current
          ? `?after_created_at=${encodeURIComponent(cursor.current.after_created_at)}&after_id=${encodeURIComponent(cursor.current.after_id)}`
          : '';
        const u = await api(`/live/poll${q}`);
        if (!alive) return;
        applyUpdate(u);
        if (transport !== 'live') setTransport('polling');
      } catch (e) { if (alive) setError(e.message); }
      if (alive) timer = setTimeout(tick, 5000);
    }
    tick();
    return () => { alive = false; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  // Refresh relative timestamps without refetching.
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  // While there is no snapshot yet, never show a silent "Connecting…": if the
  // stream and the polling fallback have both failed, the operator must see WHY
  // rather than a spinner that looks like it is still trying. The error state
  // used to be rendered only after a snapshot existed, so a rejected stream or
  // an unauthorized poll left this text on screen forever.
  if (!snap) {
    return (
      <div>
        <div className="growth-live-status">
          <span className={`growth-live-transport ${transport}`}>
            {transport === 'live' ? '● Live' : transport === 'polling' ? '◐ Polling' : '○ Connecting'}
          </span>
        </div>
        {error
          ? <p className="con-sub" style={{ color: '#b91c1c' }}>
              Could not reach the Growth Engine: {error}
            </p>
          : <p className="con-sub">Connecting to the Growth Engine…</p>}
      </div>
    );
  }

  const c = snap.counters || {};
  const today = c.today || {};
  const allTime = c.all_time || {};
  const queues = c.queues || {};
  const base = snap.baselines || {};
  const tp = snap.throughput || {};
  const worker = snap.worker || {};
  const pipeline = snap.contact_pipeline || {};
  const work = {};
  (snap.current_work || []).forEach((w) => { work[w.agent] = w; });

  const signalBase = base.hunter_signals_per_day || {};

  return (
    <div>
      <div className="growth-live-status">
        <span className={`growth-live-transport ${transport}`}>
          {transport === 'live' ? '● Live' : transport === 'polling' ? '◐ Polling' : '○ Reconnecting'}
        </span>
        <span className="con-sub">
          {running
            ? 'The engine runs continuously on each agent’s schedule. There is no manual run; work appears here as it happens.'
            : 'The engine is paused. No agent work runs until you resume it.'}
        </span>
        <span className="con-sub" style={{ marginLeft: 'auto' }}>
          {worker?.thread_alive
            ? `Backend worker alive${worker.leader ? ' · leader' : ' · standby'} · last pass ${ago(worker.last_pass_at)}`
            : (running ? 'Backend worker NOT running' : 'Backend worker stopped (engine paused)')}
          {' · '}Last activity: {ago(snap.engine?.last_activity_at)}
        </span>
      </div>

      {error && <p className="con-sub" style={{ color: '#b91c1c' }}>{error}</p>}

      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <h2 className="an-section-h" style={{ marginBottom: 0 }}>Engine activity</h2>
          <span className="con-sub">
            Baselines are minimum targets, not quotas — the engine keeps going past them.
          </span>
        </div>
        <div className="growth-live-counters">
          <CounterRow label="Signals found today" value={today.signals}
            baseline={signalBase.baseline} ceiling={signalBase.ceiling} />
          <CounterRow label="Prospects created today" value={today.prospects} />
          <CounterRow label="Qualified today" value={today.qualified} />
          <CounterRow label="Nurtured today" value={today.nurture} />
          <CounterRow label="Rejected today" value={today.rejected} />
          <CounterRow label="Evidence collected today" value={today.evidence} />
          <CounterRow label="Developers today" value={today.developers} />
          <CounterRow label="Businesses today" value={today.businesses} />
          <CounterRow label="Ready for outreach" value={today.ready_for_outreach} />
          <CounterRow label="Emails sent today" value={today.emails_sent} />
          <CounterRow label="Follow-ups today" value={today.followups} />
          <CounterRow label="Replies today" value={today.replies} />
          <CounterRow label="Signups" value={allTime.signups} />
          <CounterRow label="Provider connected" value={allTime.provider_connected} />
          <CounterRow label="Activated" value={allTime.activated} />
        </div>
        <p className="con-sub" style={{ marginTop: 8 }}>
          Queue: {queues.new_prospects || 0} awaiting review · {queues.nurture || 0} nurture ·{' '}
          {queues.followups_due || 0} follow-ups due · {queues.approvals_pending || 0} awaiting your approval.
        </p>
      </div>

      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <h2 className="an-section-h" style={{ marginBottom: 0 }}>Contact pipeline</h2>
          <span className="con-sub">Every number is a real database count. Click a stage to open the records behind it.</span>
        </div>
        <div className="growth-live-counters">
          <CounterRow label="Signals" value={pipeline.signals} />
          <CounterRow label="Prospects" value={pipeline.prospects} />
          <CounterRow label="Qualified" value={pipeline.qualified} />
          <CounterRow label="Nurtured" value={pipeline.nurtured} />
          <CounterRow label="Rejected" value={pipeline.rejected} />
          <CounterRow label="Identity verified" value={pipeline.identity_verified} />
          <CounterRow label="Contactable" value={pipeline.contactable} />
          <CounterRow label="No contact found" value={pipeline.no_contact_found} />
          <CounterRow label="Email" value={pipeline.email} />
          <CounterRow label="GitHub" value={pipeline.github} />
          <CounterRow label="X" value={pipeline.x} />
          <CounterRow label="Reddit" value={pipeline.reddit} />
          <CounterRow label="Hacker News" value={pipeline.hackernews} />
          <CounterRow label="Company contact" value={pipeline.company_contact} />
          <CounterRow label="Enriched" value={pipeline.enriched} />
          <CounterRow label="Contact verified" value={pipeline.contact_verified} />
          <CounterRow label="Contact unverified" value={pipeline.contact_unverified} />
          <CounterRow label="Ready for outreach" value={pipeline.ready_for_outreach} />
          <CounterRow label="Contacted" value={pipeline.contacted} />
          <CounterRow label="Replies" value={pipeline.replies} />
          <CounterRow label="Interested" value={pipeline.interested} />
          <CounterRow label="Signups" value={pipeline.signups} />
          <CounterRow label="Provider connected" value={pipeline.provider_connected} />
          <CounterRow label="Activated" value={pipeline.activated} />
        </div>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Throughput (last {tp.window_minutes || 60} min)</h2>
        <div className="growth-live-throughput">
          <span>{tp.raw?.signals || 0} signals</span>
          <span>{tp.raw?.prospects || 0} prospects</span>
          <span>{tp.raw?.evidence || 0} evidence</span>
          <span>{((tp.qualification_rate || 0) * 100).toFixed(0)}% qualification rate</span>
          <span>queue {tp.queue_size || 0}</span>
          <span>{tp.jobs_completed || 0} jobs completed</span>
          <span>{tp.jobs_failed || 0} failed</span>
          {(tp.sources_unavailable || []).length > 0
            ? <span className="warn">unavailable: {(tp.sources_unavailable || []).join(', ')}</span>
            : <span>all sources available</span>}
        </div>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Agents — live</h2>
        <div className="growth-live-agents">
          {(snap.live_agents || []).map((a) => (
            <AgentLiveRow key={a.agent} a={a} work={work[a.agent]} />
          ))}
        </div>
      </div>

      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <h2 className="an-section-h" style={{ marginBottom: 0 }}>Live activity</h2>
          <span className="con-sub">{events.length} events in view</span>
        </div>
        {events.length === 0
          ? <p className="con-sub">No activity yet. When the engine finds, qualifies, or contacts someone, it appears here as it happens.</p>
          : (
            <div className="growth-live-feed">
              {events.slice(0, 60).map((e) => (
                <div key={e.id} className="growth-live-event">
                  <span className={`growth-live-event-tag t-${e.event_type}`}>
                    {EVENT_LABEL[e.event_type] || e.event_type}
                  </span>
                  <span className="growth-live-event-agent">{e.agent}</span>
                  <span className="growth-live-event-msg">{e.message}</span>
                  <span className="growth-live-event-time">{ago(e.created_at)}</span>
                </div>
              ))}
            </div>
          )}
      </div>
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

function Overview({ api, overview, onRefresh }) {
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
          <span className="con-sub">Agents run on their own schedules; there is no manual run.</span>
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
        {(overview.activity || []).length === 0 && <p className="con-sub">No activity yet. The engine will show discovery here as it runs.</p>}
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

// ---------------------------------------------------------------------------
// Contacts -- the actual people behind the pipeline
//
// Where Prospects is the full working spreadsheet, Contacts is the
// outreach-ready view the product asked for: the real person (or company), the
// evidence that qualifies them, their identity confidence, how we can
// legitimately reach them, and where their outreach stands. Every column is a
// stored fact; an unknown field renders as an em dash, never a guess.
// ---------------------------------------------------------------------------
function Contacts({ api, onError }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [pipeline, setPipeline] = useState(null);
  const [filters, setFilters] = useState({ search: '', channel: '', type: '', identity_verified: '' });
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ limit: '100' });
    Object.entries(filters).forEach(([k, v]) => { if (v) q.set(k, v); });
    try {
      const [res, pipe] = await Promise.all([
        api(`/contacts?${q.toString()}`),
        api('/contacts/pipeline'),
      ]);
      setRows(res.rows || []); setTotal(res.total || 0); setPipeline(pipe || {});
    } catch (e) { onError && onError(e.message); }
    setLoading(false);
  }, [api, filters, onError]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(id) {
    try { setDetail(await api(`/prospects/${id}`)); }
    catch (e) { onError && onError(e.message); }
  }

  function quickChannel(ch) {
    setFilters({ ...filters, channel: ch, identity_verified: '' });
  }

  const chips = pipeline ? [
    ['Qualified', pipeline.qualified, null],
    ['Identity verified', pipeline.identity_verified, 'identity'],
    ['Contactable', pipeline.contactable, 'contactable'],
    ['No contact found', pipeline.no_contact_found, 'none'],
    ['Email', pipeline.email, 'email'],
    ['GitHub', pipeline.github, 'github'],
    ['X', pipeline.x, 'x'],
    ['Reddit', pipeline.reddit, 'reddit'],
    ['Hacker News', pipeline.hackernews, 'hackernews'],
    ['Company contact', pipeline.company_contact, 'none'],
  ] : [];

  return (
    <div>
      {pipeline && (
        <div className="growth-live-counters" style={{ marginBottom: 12 }}>
          {chips.map(([label, value, key]) => (
            <button key={label} type="button" className="growth-live-counter"
              style={{ cursor: key ? 'pointer' : 'default', textAlign: 'left' }}
              onClick={() => {
                if (!key) return;
                if (key === 'identity') setFilters({ ...filters, identity_verified: 'true', channel: '' });
                else quickChannel(key);
              }}>
              <div className="growth-live-counter-v">{value ?? 0}</div>
              <div className="growth-live-counter-l">{label}</div>
            </button>
          ))}
        </div>
      )}

      <div className="growth-toolbar">
        <input className="growth-input" placeholder="Search person, company, handle…"
          value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className="growth-input" value={filters.channel}
          onChange={(e) => setFilters({ ...filters, channel: e.target.value })}>
          <option value="">Any channel</option>
          <option value="email">Email</option>
          <option value="github">GitHub</option>
          <option value="x">X</option>
          <option value="reddit">Reddit</option>
          <option value="hackernews">Hacker News</option>
          <option value="none">No contact found</option>
        </select>
        <select className="growth-input" value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          <option value="DEVELOPER">Developer</option>
          <option value="BUSINESS">Business</option>
        </select>
        <label className="con-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={filters.identity_verified === 'true'}
            onChange={(e) => setFilters({ ...filters, identity_verified: e.target.checked ? 'true' : '' })} />
          identity verified only
        </label>
      </div>

      <p className="con-sub">{total} contact{total === 1 ? '' : 's'}{loading ? ' · loading…' : ''}</p>

      <div className="growth-table-wrap">
        <table className="growth-table">
          <thead>
            <tr>
              <th>Person</th><th>Role</th><th>Company</th><th>Country</th>
              <th>Payment problem / evidence</th><th>Source</th>
              <th>Identity</th><th>Contact</th><th>Confidence</th><th>Outreach</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="growth-row" onClick={() => openDetail(p.id)}>
                <td>{fmt(p.display_name)}</td>
                <td>{fmt(p.contact_role || p.role)}</td>
                <td>{fmt(p.company)}</td>
                <td>{fmt(p.country_code)}</td>
                <td style={{ maxWidth: 320 }}>
                  {fmt((p.payment_providers || []).join(', '))}
                  {p.pain_signals && p.pain_signals.length
                    ? ` · ${p.pain_signals.map((x) => x.category || x).join(', ')}` : ''}
                  {p.evidence_summary ? <div className="con-sub">{p.evidence_summary}</div> : null}
                </td>
                <td>{fmt(p.first_touch_source)}{p.source_url ? <div className="con-sub">{p.source_url}</div> : null}</td>
                <td><span className={levelClass(p.ownership === 'OWNER' ? 'HIGH' : (p.ownership || 'UNKNOWN'))}>{p.ownership === 'OWNER' ? 'VERIFIED' : fmt(p.ownership)}</span></td>
                <td>{p.contact_channel ? `${p.contact_channel}: ${p.contact_handle || ''}` : '—'}</td>
                <td>{fmt(p.contact_confidence)}</td>
                <td>{fmt(p.status)}{p.next_action ? ` · ${p.next_action}` : ''}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan="10" className="con-sub" style={{ padding: 16 }}>
                No contacts yet. When the Qualifier promotes a prospect, it appears here with its
                evidence and its legitimate channel.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && <ProspectDrawer detail={detail} onClose={() => setDetail(null)} onStatus={() => {}} />}
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
// Conversations -- what was actually said, across every prospect
// ---------------------------------------------------------------------------
function Conversations({ api, onError }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api('/conversations?limit=200');
      setRows(d.conversations || []);
    } catch (e) { onError && onError(e.message); }
    setLoading(false);
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  const shown = filter
    ? rows.filter((r) => [r.kind, r.channel, r.display_name, r.company]
        .some((v) => String(v || '').toLowerCase().includes(filter.toLowerCase())))
    : rows;

  return (
    <div>
      <div className="an-section">
        <h2 className="an-section-h">Conversations</h2>
        <p className="con-sub">
          Every two-way exchange, newest first: what was sent, what came back, and who it
          was with. These are the real interaction rows — nothing here is estimated.
        </p>
        <div className="growth-toolbar" style={{ marginBottom: 8 }}>
          <input className="growth-input" placeholder="Filter by kind, channel, name…"
            value={filter} onChange={(e) => setFilter(e.target.value)} />
          <button className="preview-checkout-btn" type="button" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {shown.length === 0 ? (
          <p className="con-sub">No conversations recorded yet.</p>
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
                    <td><span className="growth-activity-kind">{r.kind}</span></td>
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
// Cohort -- the controlled experiment's reviewed, bounded set
// ---------------------------------------------------------------------------
function pct(v) {
  if (v === null || v === undefined) return '—';
  return `${(Number(v) * 100).toFixed(1)}%`;
}

function CohortView({ api, onError }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try { setData(await api('/cohort')); }
    catch (e) { onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function post(path, body, label) {
    setBusy(label); setNotice('');
    try {
      const res = await api(path, { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}) });
      if (label === 'preview') setPreview(res);
      else {
        setNotice(`${label === 'select' ? 'Selected' : 'Topped up'} ${res.selected ?? res.added ?? 0} `
          + `into ${res.cohort_id || 'the active cohort'}. Nothing was sent.`);
        setPreview(null);
      }
      await load();
    } catch (e) { onError && onError(e.message); }
    setBusy('');
  }

  if (!data) return <p className="con-sub">Loading cohort…</p>;
  const active = data.active;
  const members = data.members || [];
  const pool = data.pool || {};
  const cohorts = data.cohorts || [];

  return (
    <div>
      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <div>
            <h2 className="an-section-h" style={{ marginBottom: 0 }}>Controlled cohort</h2>
            <p className="con-sub">
              The strongest qualified prospects, selected by score. Selecting a cohort never
              sends anything: it marks them ready for the email path. The rest stay qualified
              while discovery continues.
            </p>
          </div>
          <div className="growth-head-actions">
            <button className="preview-checkout-btn" type="button" disabled={!!busy}
              onClick={() => post('/cohort/select', { dry_run: true }, 'preview')}>
              {busy === 'preview' ? 'Checking…' : 'Preview selection'}
            </button>
            <button className="preview-checkout-btn" type="button" disabled={!!busy}
              onClick={() => post('/cohort/select', {}, 'select')}>
              {busy === 'select' ? 'Selecting…' : 'Select cohort'}
            </button>
            <button className="preview-checkout-btn" type="button" disabled={!!busy}
              onClick={() => post('/cohort/ensure', {}, 'ensure')}>
              {busy === 'ensure' ? 'Topping up…' : 'Top up active'}
            </button>
          </div>
        </div>
        <div className="growth-live-throughput">
          <span>qualified pool {pool.pool_size ?? 0}</span>
          <span>with contact {pool.qualified_with_contact ?? 0}</span>
          <span>scored {pool.qualified_scored ?? 0}</span>
          <span>min score {pool.min_score ?? 0}</span>
          <span>{pool.require_contactable ? 'contactable only' : 'contact optional'}</span>
        </div>
        {notice && <p className="con-sub" style={{ marginTop: 8 }}>{notice}</p>}
        {preview && (
          <p className="con-sub" style={{ marginTop: 8 }}>
            Dry run: would select {preview.selected ?? 0} of {preview.pool_size ?? 0} (min score{' '}
            {preview.min_score ?? 0}). Nothing was written.
          </p>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">
          {active ? `Active cohort — ${active.name}` : 'No active cohort'}
        </h2>
        {active ? (
          <>
            <div className="growth-live-throughput">
              <span>{active.selected_count ?? members.length} selected</span>
              <span>size {active.cohort_size}</span>
              <span>min score {active.min_score ?? '—'}</span>
              <span>status {active.status}</span>
              <span>created {fmtDate(active.created_at)}</span>
            </div>
            <div className="growth-table-wrap" style={{ marginTop: 10 }}>
              <table className="growth-table">
                <thead><tr>
                  <th>#</th><th>Prospect</th><th>Score</th><th>Band</th><th>Source</th>
                  <th>Status</th><th>Why</th><th></th>
                </tr></thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="growth-row" onClick={() => setOpen(open === m.id ? null : m.id)}>
                      <td>{m.rank}</td>
                      <td>{m.display_name || m.company || '—'}</td>
                      <td>{m.qualification_score != null ? Number(m.qualification_score).toFixed(1) : '—'}</td>
                      <td><span className={levelClass(bandFor(m.qualification_score))}>
                        {bandFor(m.qualification_score) || '—'}</span></td>
                      <td>{m.first_touch_source || '—'}</td>
                      <td>{m.member_status || m.status}</td>
                      <td className="growth-activity-body">{m.qualification_reason || '—'}</td>
                      <td>{open === m.id ? '▾' : '▸'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {members.filter((m) => m.id === open).map((m) => (
              <CohortMemberDetail key={m.id} m={m} />
            ))}
          </>
        ) : (
          <p className="con-sub">
            No cohort yet. Select one from the ranked pool above — selection writes a cohort
            and marks its members ready for outreach, but never emails anyone.
          </p>
        )}
      </div>

      {cohorts.length > 0 && (
        <div className="an-section">
          <h2 className="an-section-h">Cohorts ({cohorts.length})</h2>
          <div className="growth-table-wrap">
            <table className="growth-table">
              <thead><tr><th>Name</th><th>Status</th><th>Size</th><th>Selected</th><th>Min score</th><th>Created</th></tr></thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td><td>{c.status}</td><td>{c.cohort_size}</td>
                    <td>{c.selected_count}</td><td>{c.min_score ?? '—'}</td>
                    <td>{fmtDate(c.created_at)}</td>
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

function bandFor(score) {
  if (score == null) return '';
  const s = Number(score);
  if (s >= 70) return 'HIGH';
  if (s >= 45) return 'MEDIUM';
  if (s >= 20) return 'LOW';
  return 'UNQUALIFIED';
}

function CohortMemberDetail({ m }) {
  const factors = m.qualification_factors || {};
  const list = Array.isArray(factors.factors) ? factors.factors : [];
  return (
    <div className="growth-evidence" style={{ marginTop: 10 }}>
      <div className="con-home-head-row">
        <b>{m.display_name || m.company || m.id}</b>
        <span className={levelClass(bandFor(m.qualification_score))}>
          {m.qualification_score != null ? Number(m.qualification_score).toFixed(1) : '—'}
        </span>
      </div>
      <p className="con-sub">{factors.reasons || m.qualification_reason || 'No reason recorded.'}</p>
      <div className="growth-drawer-grid">
        <div><div className="con-sub">Source</div><div>{m.first_touch_source || '—'}</div></div>
        <div><div className="con-sub">Contact channel</div><div>{m.contact_channel || '—'}</div></div>
        <div><div className="con-sub">Evidence strength</div><div>{m.evidence_strength || '—'}</div></div>
        <div><div className="con-sub">Ownership</div><div>{m.ownership || '—'}</div></div>
        <div><div className="con-sub">Providers</div><div>{(m.payment_providers || []).join(', ') || '—'}</div></div>
        <div><div className="con-sub">Version</div><div>{m.qualification_version || '—'}</div></div>
      </div>
      {list.length > 0 && (
        <div className="growth-dims">
          {list.map((f) => (
            <div key={f.factor || f.name} className="growth-dim">
              <span className="growth-dim-name">{(f.factor || f.name || '').replace(/_/g, ' ')}</span>
              <span>{Number(f.contribution || 0).toFixed(1)}</span>
              <span className="growth-dim-reason">{f.reason}</span>
            </div>
          ))}
        </div>
      )}
      {(m.recommended_subject || m.recommended_body) && (
        <div className="growth-draft" style={{ marginTop: 10 }}>
          <div className="con-sub">Recommended message (reviewed before any send)</div>
          <b>{m.recommended_subject}</b>
          <pre className="growth-draft-body">{m.recommended_body}</pre>
          {m.recommended_version && <div className="con-sub">version {m.recommended_version}</div>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategy health -- learn where good prospects come from
// ---------------------------------------------------------------------------
const HEALTH_CLASS = {
  HEALTHY: 'growth-pill-high',
  WATCH: 'growth-pill-med',
  UNDERPERFORMING: 'growth-pill-low',
  PAUSED: 'growth-pill-unknown',
};

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
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [src, kw, aud] = await Promise.all([
        api('/sources'), api('/keywords'), api('/sources/audit'),
      ]);
      setSources(src.sources || []);
      setKeywords(kw.keywords || []);
      setAudit(aud);
    } catch (e) { onError && onError(e.message); }
  }, [api, onError]);
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
          What the Hunter searches for. Disable a keyword to stop using it without deleting it.
        </p>
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

function StrategyHealth({ api, onError }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try { const r = await api('/strategy/health'); setRows(r.sources || []); }
    catch (e) { onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  async function evaluate() {
    setBusy(true); setNotice('');
    try {
      const r = await api('/strategy/evaluate', { method: 'POST' });
      setRows(r.sources || []);
      setNotice(`Re-evaluated ${(r.sources || []).length} sources from real outcomes.`);
    } catch (e) { onError && onError(e.message); }
    setBusy(false);
  }

  if (!rows) return <p className="con-sub">Loading strategy health…</p>;

  return (
    <div>
      <div className="an-section">
        <div className="con-home-head-row" style={{ alignItems: 'center' }}>
          <div>
            <h2 className="an-section-h" style={{ marginBottom: 0 }}>Strategy health by source</h2>
            <p className="con-sub">
              A source is judged only on real outcomes: how many of its prospects qualify,
              reply, sign up, or turn out to be duplicates or false positives. A weak source
              is throttled (lower allocation weight) and eventually paused; it is never
              silently deleted, so it can recover.
            </p>
          </div>
          <button className="preview-checkout-btn" type="button" disabled={busy} onClick={evaluate}>
            {busy ? 'Evaluating…' : 'Re-evaluate now'}
          </button>
        </div>
        {notice && <p className="con-sub">{notice}</p>}
        {rows.length === 0
          ? <p className="con-sub">No source has produced a signal yet.</p>
          : (
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr>
                  <th>Source</th><th>Health</th><th>Weight</th><th>Reviewed</th>
                  <th>Qualified</th><th>Qual. rate</th><th>Pos. reply</th>
                  <th>Signup</th><th>Activation</th><th>Dup rate</th><th>False pos.</th><th>Reason</th>
                </tr></thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.source}>
                      <td>{s.source}{s.paused ? ' · paused' : ''}</td>
                      <td><span className={`growth-pill ${HEALTH_CLASS[s.health_state] || 'growth-pill-unknown'}`}>
                        {s.health_state || '—'}</span></td>
                      <td>{s.allocation_weight != null ? Number(s.allocation_weight).toFixed(2) : '—'}</td>
                      <td>{s.reviewed ?? 0}</td>
                      <td>{s.qualified_prospects ?? 0}</td>
                      <td>{pct(s.qualification_rate)}</td>
                      <td>{pct(s.positive_reply_rate)}</td>
                      <td>{pct(s.signup_rate)}</td>
                      <td>{pct(s.activation_rate)}</td>
                      <td>{pct(s.duplicate_rate)}</td>
                      <td>{pct(s.false_positive_rate)}</td>
                      <td className="growth-activity-body">{s.health_reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Experiment -- the funnel and where it breaks
// ---------------------------------------------------------------------------
function Experiment({ api, onError }) {
  const [data, setData] = useState(null);
  const [xp, setXp] = useState(null);

  useEffect(() => {
    api('/strategy/report').then(setData).catch((e) => onError && onError(e.message));
    api('/experiment').then(setXp).catch(() => {});
  }, [api, onError]);

  if (!data) return <p className="con-sub">Loading experiment…</p>;
  const funnel = data.funnel || [];
  const max = Math.max(1, ...funnel.map((s) => s.count || 0));

  return (
    <div>
      {xp && (
        <div className="an-section">
          <h2 className="an-section-h">Adaptive decision — keep going, increase, adjust, or stop?</h2>
          <p className="con-sub">
            The first 100 prospects are a baseline, not a ceiling. The engine starts small, measures
            the response, and decides the next batch from the result.
          </p>
          <div className="growth-stats">
            <Stat label="Verdict" value={xp.state}
              hint={`Last outcome: ${(xp.recent_decisions?.[0]?.outcome) || '—'}`} />
            <Stat label="Current batch" value={`#${xp.current_batch} · ${xp.current_batch_size}`}
              hint={`Next planned: ${xp.next_batch_size}`} />
            <Stat label="Sending rate" value={`${xp.current_daily_rate}/day`}
              hint={`Ceiling scales with performance`} />
            <Stat label="Remaining qualified" value={xp.remaining_qualified}
              hint="Pipeline headroom, not a quota" />
            <Stat label="Positive reply rate" value={pct(xp.totals?.positive_reply_rate)}
              hint={`${xp.totals?.positive_replies || 0} of ${xp.totals?.contacted || 0} contacted`} />
            <Stat label="Signup rate" value={pct(xp.totals?.signup_rate)}
              hint={`${xp.totals?.signups || 0} signups · ${xp.totals?.activated || 0} activated`} />
          </div>
          <p className="con-sub" style={{ marginTop: 8 }}>
            <strong>Why:</strong> {xp.decision_reason || 'No decision recorded yet.'}
          </p>
          <p className="con-sub">
            Best source {xp.best_source ? `${xp.best_source.source} (${pct(xp.best_source.positive_reply_rate)} positive)` : '—'} ·
            weakest source {xp.worst_source ? `${xp.worst_source.source} (${pct(xp.worst_source.positive_reply_rate)} positive)` : '—'} ·
            best message {xp.best_message ? xp.best_message.message_version : '—'}
          </p>
          {(xp.batches || []).length > 0 && (
            <div className="growth-table-wrap" style={{ marginTop: 8 }}>
              <table className="growth-table">
                <thead><tr><th>Batch</th><th>Planned</th><th>Accepted</th><th>Replies</th><th>Positive</th><th>Signups</th><th>Outcome</th><th>Why</th></tr></thead>
                <tbody>
                  {(xp.batches || []).map((b) => (
                    <tr key={b.batch_number}>
                      <td>#{b.batch_number}</td><td>{b.planned_size}</td><td>{b.accepted}</td>
                      <td>{b.replies ?? '—'}</td><td>{b.positive_replies ?? '—'}</td>
                      <td>{b.signups ?? '—'}</td><td>{b.outcome || 'open'}</td>
                      <td>{b.decision_reason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="growth-stats">
        <Stat label="Qualified" value={data.qualified} />
        <Stat label="Selected (cohort)" value={data.selected} />
        <Stat label="Emails sent" value={data.emails_sent} />
        <Stat label="Accepted by provider" value={data.emails_accepted} />
        <Stat label="Duplicate sends prevented" value={data.duplicate_suppressed} />
        <Stat label="Prospects contacted" value={data.prospects_contacted} />
        <Stat label="Delivery failures" value={data.delivery_failures} />
        <Stat label="Unresolved sends" value={data.unresolved_sends} />
        <Stat label="Replies" value={data.replies} hint={`${data.positive_replies || 0} positive · ${data.negative_replies || 0} negative`} />
        <Stat label="Signups" value={data.signups} />
        <Stat label="Activated" value={data.activated} />
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Funnel — where it breaks</h2>
        <p className="con-sub">Qualified → Contacted → Replied → Signed up → Activated, with the drop between each stage.</p>
        <div className="growth-funnel">
          {funnel.map((s) => (
            <div key={s.stage} className="growth-funnel-row">
              <span className="growth-funnel-l">{s.stage}</span>
              <span className="growth-funnel-bar" style={{ width: `${Math.round(((s.count || 0) / max) * 100)}%` }} />
              <span className="growth-funnel-n">{s.count || 0}</span>
            </div>
          ))}
        </div>
        <div className="growth-live-throughput" style={{ marginTop: 8 }}>
          {funnel.filter((s) => s.drop_from_previous != null).map((s) => (
            <span key={s.stage}>{s.stage}: −{s.drop_from_previous} ({pct(s.drop_rate)})</span>
          ))}
        </div>
        <p className="con-sub" style={{ marginTop: 8 }}>
          Reply rate {pct(data.reply_rate)} · positive reply rate {pct(data.positive_reply_rate)} ·
          signup rate {pct(data.signup_rate)} · activation rate {pct(data.activation_rate)} ·{' '}
          median time to reply {data.median_time_to_reply_hours != null
            ? `${data.median_time_to_reply_hours}h` : 'no replies yet'}.
        </p>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">By source</h2>
        {(data.by_source || []).length === 0
          ? <p className="con-sub">No qualified prospects yet.</p>
          : (
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>Source</th><th>Qualified</th><th>Contacted</th><th>Replied</th><th>Signups</th><th>Activated</th><th>Mean score</th><th>Reply rate</th><th>Signup rate</th></tr></thead>
                <tbody>
                  {(data.by_source || []).map((r) => (
                    <tr key={r.source}>
                      <td>{r.source}</td><td>{r.qualified}</td><td>{r.contacted}</td>
                      <td>{r.replied}</td><td>{r.signups}</td><td>{r.activated}</td>
                      <td>{Number(r.mean_score || 0).toFixed(1)}</td>
                      <td>{pct(r.reply_rate)}</td><td>{pct(r.signup_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">By score band — does the score predict replies?</h2>
        {(data.by_score_band || []).length === 0
          ? <p className="con-sub">No scored prospects yet.</p>
          : (
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>Band</th><th>Prospects</th><th>Contacted</th><th>Replied</th><th>Signups</th><th>Activated</th><th>Reply rate</th><th>Signup rate</th></tr></thead>
                <tbody>
                  {(data.by_score_band || []).map((r) => (
                    <tr key={r.band}>
                      <td>{r.band}</td><td>{r.prospects}</td><td>{r.contacted}</td>
                      <td>{r.replied}</td><td>{r.signups}</td><td>{r.activated}</td>
                      <td>{pct(r.reply_rate)}</td><td>{pct(r.signup_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">By message version</h2>
        {(data.by_message_version || []).length === 0
          ? <p className="con-sub">No emails sent yet.</p>
          : (
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>Message version</th><th>Sends</th><th>Prospects</th></tr></thead>
                <tbody>
                  {(data.by_message_version || []).map((r) => (
                    <tr key={r.message_version}>
                      <td>{r.message_version}</td><td>{r.sends}</td><td>{r.prospects}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inbound replies -- is the inbox actually readable, and are replies being
// ingested? A send-only Gmail grant cannot see a reply, so this is where an
// operator sees that the read scope is missing BEFORE a prospect is emailed
// again after replying. Mirrors GET /growth/inbox/status.
// ---------------------------------------------------------------------------
function InboundReplies({ inbox, api, onError }) {
  const [busy, setBusy] = useState(false);
  const [local, setLocal] = useState(inbox || {});
  useEffect(() => { setLocal(inbox || {}); }, [inbox]);
  if (!inbox) return null;
  const conn = local.connection || {};
  const counts = local.counts || {};
  const pollNow = async () => {
    setBusy(true);
    try {
      await api('/inbox/poll', { method: 'POST' });
      setLocal(await api('/inbox/status'));
    } catch (e) { onError && onError(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="an-section">
      <h2 className="an-section-h">Inbound replies — can the engine read the inbox?</h2>
      <div className="growth-stats">
        <Stat label="Inbox readable" value={conn.can_read ? 'YES' : 'NO'}
          hint={conn.connected ? 'connected' : 'not connected'} />
        <Stat label="Replies processed" value={fmt(counts.processed)} />
        <Stat label="Unmatched" value={fmt(counts.unmatched)} />
        <Stat label="Ambiguous" value={fmt(counts.ambiguous)} />
        <Stat label="Errors" value={fmt(counts.errors)} />
        <Stat label="Last poll" value={fmtDate(local.last_poll_at)} hint={fmt(local.last_status)} />
      </div>
      {!conn.can_read && (
        <p className="con-sub">
          {conn.connected
            ? <>The connected account cannot read its inbox — a send-only grant cannot see a reply.
                Reconnect Gmail and grant <code>{fmt((conn.missing_scopes || [])[0])}</code>.</>
            : 'No Gmail account is connected, so no reply can be read.'}
        </p>
      )}
      {local.last_error && <p className="con-sub">Last error: {fmt(local.last_error)}</p>}
      {(local.recent || []).length > 0 && (
        <>
          <h3 className="an-sub-h">Recently seen messages</h3>
          <div className="growth-table-wrap">
            <table className="growth-table">
              <thead><tr><th>When</th><th>From</th><th>Status</th><th>Matched by</th>
                <th>Sentiment</th><th>Reason</th></tr></thead>
              <tbody>
                {local.recent.map((r, i) => (
                  <tr key={i}>
                    <td>{fmtDate(r.processed_at)}</td><td>{fmt(r.sender)}</td>
                    <td>{fmt(r.status)}</td><td>{fmt(r.match_method)}</td>
                    <td>{fmt(r.sentiment)}</td><td>{fmt(r.reason || r.error)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="growth-toolbar" style={{ marginTop: 12 }}>
        <button className="preview-checkout-btn" onClick={pollNow} disabled={busy}>
          {busy ? 'Polling…' : 'Poll inbox now'}
        </button>
        <span className="con-sub">
          The worker polls on its own interval; this runs one poll by hand. Processing is
          idempotent — a message is never ingested twice.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Diagnostics -- "are eligible emails leaving, and if not, why", read-only,
// without a Render shell. Mirrors GET /growth/diagnostics.
// ---------------------------------------------------------------------------
function Diagnostics({ api, onError }) {
  const [data, setData] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(() => {
    api('/diagnostics').then((d) => { setData(d); setLoadedAt(new Date().toLocaleTimeString()); })
      .catch((e) => onError && onError(e.message));
  }, [api, onError]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="con-sub">Loading diagnostics…</p>;
  const send = data.sending || {};
  const acc = send.acceptance || {};
  const exp = data.experiment || {};
  const q = data.queue || {};
  const ledger = data.ledger || {};
  const pool = data.pool || {};
  const failKinds = Object.entries(acc.failure_kinds || {});
  const reasons = Object.entries(q.ineligible_email || []);

  return (
    <div>
      <div className="growth-toolbar">
        <button className="preview-checkout-btn" onClick={load}>Refresh</button>
        <span className="con-sub">
          Read-only. Answers &ldquo;are eligible emails leaving, and if not, why&rdquo; without a
          Render shell. Recipients are masked; no secret is returned.
          {loadedAt ? ` Updated ${loadedAt}.` : ''}
        </span>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Can an email leave right now?</h2>
        <div className="growth-stats">
          <Stat label="Can send" value={send.can_send ? 'YES' : 'NO'}
            hint={`transport: ${fmt(send.transport)} · ${fmt(send.connection_status)}`} />
          <Stat label="Sending enabled" value={send.sending_enabled ? 'on' : 'off'} />
          <Stat label="Provider key present" value={(send.brevo || {}).api_key_present ? 'yes' : 'no'}
            hint={fmt((send.brevo || {}).endpoint_host)} />
          <Stat label="From" value={fmt(send.from_email)} hint={`reply-to: ${fmt(send.reply_to)}`} />
        </div>
        {!send.can_send && (
          <p className="con-sub">
            The Closer cannot send. The three usual causes, in order: sending is off, the transport
            is not the HTTP provider, or the provider key is missing from the environment.
          </p>
        )}
      </div>

      <InboundReplies inbox={data.inbox} api={api} onError={onError} />

      <div className="an-section">
        <h2 className="an-section-h">The sending ceiling — is the experiment holding volume at zero?</h2>
        <div className="growth-stats">
          <Stat label="Experiment" value={fmt(exp.state)} hint={exp.enabled ? 'enabled' : 'disabled'} />
          <Stat label="Daily rate" value={fmt(exp.effective_daily_rate)}
            hint={exp.paused ? 'PAUSED — ceiling is 0, nothing will send' : 'per day'} />
          <Stat label="Current batch" value={`#${fmt(exp.current_batch)} · ${fmt(exp.current_batch_size)}`}
            hint={`next: ${fmt(exp.next_batch_size)}`} />
          <Stat label="Remaining qualified" value={fmt(exp.remaining_qualified)} />
        </div>
        {exp.decision_reason && (
          <p className="con-sub">Why: {exp.decision_reason}</p>
        )}
        {exp.paused && (
          <p className="con-sub">
            A paused experiment publishes a rate of 0, so the Closer stops even with a healthy
            queue. Resume it in Settings, or the next deploy&rsquo;s diagnostic will report the same 0.
          </p>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Acceptance — what the provider actually took</h2>
        <div className="growth-stats">
          <Stat label="Accepted (all)" value={fmt(acc.accepted_total)} />
          <Stat label="Accepted 24h" value={fmt(acc.accepted_24h)} />
          <Stat label="Failed (all)" value={fmt(acc.failed_total)} />
          <Stat label="Last accepted" value={fmtDate(acc.last_accepted_at)} />
        </div>
        {failKinds.length > 0 && (
          <>
            <h3 className="an-section-h">Failure kinds</h3>
            <div className="growth-stats">
              {failKinds.map(([k, n]) => <Stat key={k} label={k} value={n} />)}
            </div>
          </>
        )}
        {(acc.recent_failures || []).length > 0 && (
          <>
            <h3 className="an-section-h">Recent failures</h3>
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>When</th><th>Kind</th><th>Recipient</th><th>Reason</th></tr></thead>
                <tbody>
                  {acc.recent_failures.map((f, i) => (
                    <tr key={i}>
                      <td>{fmtDate(f.at)}</td><td>{fmt(f.error_kind)}</td>
                      <td>{fmt(f.recipient)}</td><td>{fmt(f.reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {(acc.failure_reasons || []).length > 0 && (
          <>
            <h3 className="an-section-h">Why sends failed, grouped</h3>
            <p className="con-sub">
              The kind alone cannot tell a real bounce from our own
              misconfiguration; the reason can. A &ldquo;not_connected&rdquo; here
              is a settings fault, not a deliverability one.
            </p>
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>Kind</th><th>Reason</th><th>Count</th><th>Last seen</th></tr></thead>
                <tbody>
                  {acc.failure_reasons.map((f, i) => (
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

      <div className="an-section">
        <h2 className="an-section-h">Queue — approvals waiting, and whether they can send</h2>
        <div className="growth-stats">
          <Stat label="Pending email" value={fmt(q.pending_email)} />
          <Stat label="Eligible now" value={(q.eligible_email || []).length} />
          <Stat label="Approvals backlog" value={fmt(q.backlog)} />
          <Stat label="Follow-ups due" value={fmt(q.followups_due)} />
        </div>
        {reasons.length > 0 && (
          <>
            <h3 className="an-section-h">Why the newest drafts are not auto-sending</h3>
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>Approval</th><th>Prospect</th><th>Reason</th></tr></thead>
                <tbody>
                  {reasons.map(([, r]) => (
                    <tr key={r.id}><td>{fmt(r.id)}</td><td>{fmt(r.prospect_id)}</td><td>{fmt(r.reason)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Durable send ledger</h2>
        <p className="con-sub">
          The record that prevents a duplicate send. SENT means the provider accepted it.
        </p>
        <div className="growth-stats">
          {Object.entries(ledger.counts || {}).map(([k, n]) => <Stat key={k} label={k} value={n} />)}
        </div>
        {(ledger.blocked_or_unresolved || []).length > 0 && (
          <>
            <h3 className="an-section-h">Blocked or unresolved attempts</h3>
            <div className="growth-table-wrap">
              <table className="growth-table">
                <thead><tr><th>Status</th><th>Kind</th><th>Recipient</th><th>Purpose</th><th>Reason</th></tr></thead>
                <tbody>
                  {ledger.blocked_or_unresolved.map((b, i) => (
                    <tr key={i}>
                      <td>{fmt(b.status)}</td><td>{fmt(b.error_kind)}</td>
                      <td>{fmt(b.recipient)}</td><td>{fmt(b.purpose)}</td><td>{fmt(b.reason)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Pipeline &amp; worker</h2>
        <div className="growth-stats">
          <Stat label="Qualified pool" value={fmt(pool.pool_size)}
            hint={`${fmt(pool.qualified_with_contact)} contactable`} />
          <Stat label="Ready to email now" value={fmt((data.queue || {}).ready_to_contact)}
            hint={`${fmt((data.queue || {}).ready_with_email)} carry an address`} />
          <Stat label="Active cohort" value={data.active_cohort ? `#${data.active_cohort.size}` : '—'}
            hint={fmt((data.active_cohort || {}).status)} />
          <Stat label="Worker alive" value={(data.worker || {}).thread_alive ? 'yes' : 'no'}
            hint={`last pass: ${fmtDate((data.worker || {}).last_pass_at)}`} />
          <Stat label="Engine" value={(data.engine || {}).paused ? 'paused' : ((data.engine || {}).enabled ? 'running' : 'off')} />
        </div>
      </div>
    </div>
  );
}

function Settings({ api, onError, onEngine }) {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channelsMeta, setChannelsMeta] = useState({ oauth_configured: false });
  const [oauthNotice, setOauthNotice] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [audit, setAudit] = useState(null);
  const [archivePlan, setArchivePlan] = useState(null);
  const [archiveResult, setArchiveResult] = useState(null);
  const [resetPreview, setResetPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, es, ch] = await Promise.all([
        api('/settings'), api('/email/status'), api('/channels'),
      ]);
      setSettings(s);
      setEmailStatus(es); setChannels(ch.channels || []);
      setChannelsMeta({ oauth_configured: !!ch.oauth_configured });
    } catch (e) { onError && onError(e.message); }
  }, [api, onError]);
  useEffect(() => {
    // Surface the result of the Gmail OAuth redirect back from the API.
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('gmail');
      if (p === 'connected') setOauthNotice('Gmail connected. Sending stays off until you enable it below.');
      else if (p === 'error') {
        const reason = new URLSearchParams(window.location.search).get('reason') || 'unknown';
        setOauthNotice(`Gmail connection failed: ${reason}`);
      }
    }
    load();
  }, [load]);

  async function save(key, value) {
    try {
      // `sending_enabled` is never sent through the generic settings PUT: it has
      // its own action (setSending). The email object is spread into the body
      // here, so strip the field rather than relying on the server to ignore it.
      const body = (key === 'email' && value && typeof value === 'object')
        ? (() => { const { sending_enabled, ...rest } = value; return rest; })()
        : value;
      await api(`/settings/${key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      // Reload so the controlled inputs show what the server stored. Without
      // this the checkbox (and every other field) kept its previously-loaded
      // value and snapped straight back, which read as "the setting will not
      // change" even though the write had succeeded.
      await load();
      setSaved(key); setTimeout(() => setSaved(''), 1500);
    }
    catch (e) { onError && onError(e.message); }
  }
  // Turning sending on/off is a dedicated action, not a PUT of the whole email
  // object: the object PUT replaced the stored config, so a stale copy reverted
  // the setting and the controlled checkbox looked like it would not change.
  // The endpoint merges the one field; then we reload so the box reflects what
  // the server actually stored.
  const [sendingBusy, setSendingBusy] = useState(false);
  async function setSending(enabled) {
    setSendingBusy(true);
    try {
      await api('/email/sending', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      await load();
    } catch (e) { onError && onError(e.message); }
    finally { setSendingBusy(false); }
  }
  async function connectEmail() {
    // Real Gmail OAuth: ask the API for the consent URL, then navigate to it.
    // The refresh token is stored encrypted server-side; nothing lands here.
    try {
      const r = await api('/email/oauth/start');
      if (r && r.authorize_url) {
        if (typeof window !== 'undefined') window.location.href = r.authorize_url;
      } else {
        onError && onError('No authorize URL returned');
      }
    } catch (e) { onError && onError(e.message); }
  }
  async function disconnectEmail() {
    // Both endpoints describe the same connection, and either can fail on its
    // own. Refresh no matter what: when the old code threw out of the first
    // failed call, load() never ran and the screen kept showing the old
    // "connected" value, so Disconnect looked like a no-op.
    let err = null;
    try { await api('/email/disconnect', { method: 'POST' }); }
    catch (e) { err = e; }
    try { await api('/channels/email/disconnect', { method: 'POST' }); }
    catch (e) { err = err || e; }
    load();
    if (err) onError && onError(err.message);
  }
  async function connectChannel(channel, identity) {
    try {
      await api(`/channels/${channel}/connect`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity }) });
      load();
    } catch (e) { onError && onError(e.message); }
  }
  async function disconnectChannel(channel) {
    try { await api(`/channels/${channel}/disconnect`, { method: 'POST' }); }
    catch (e) { onError && onError(e.message); }
    finally { load(); }
  }
  async function setTransport(transport) {
    try { await api('/email/transport', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transport }) }); load(); }
    catch (e) { onError && onError(e.message); }
  }
  async function sendTest() {
    setTestResult(null);
    try { setTestResult(await api('/email/test', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: testTo }) })); }
    catch (e) { onError && onError(e.message); }
  }
  async function loadAudit() {
    try { setAudit(await api('/archive/audit')); }
    catch (e) { onError && onError(e.message); }
  }
  async function loadArchivePlan() {
    try { setArchivePlan(await api('/archive/plan')); }
    catch (e) { onError && onError(e.message); }
  }
  async function runArchive(dryRun) {
    setArchiveResult(null);
    try {
      const r = await api('/archive', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dry_run: !!dryRun }) });
      setArchiveResult(r);
      if (!dryRun) { loadArchivePlan(); loadAudit(); }
    } catch (e) { onError && onError(e.message); }
  }
  async function loadResetPreview() {
    try { setResetPreview(await api('/reset/preview')); }
    catch (e) { onError && onError(e.message); }
  }
  async function runReset() {
    if (typeof window !== 'undefined' && !window.confirm(
      'Clear the contact pipeline so the funnel can be watched from a fresh start? '
      + 'Suppression lists, opt-outs, bounces and sending history are preserved; '
      + 'the email transport, templates and engine switch are kept.')) return;
    setResetPreview(null);
    try { await api('/reset', { method: 'POST' }); load(); }
    catch (e) { onError && onError(e.message); }
  }

  if (!settings) return <p className="con-sub">Loading…</p>;
  const limits = settings.limits || {};
  const baselines = settings.baselines || {};
  const schedules = settings.schedules || {};
  const enrichment = settings.enrichment || {};
  const email = (emailStatus && emailStatus.email) || settings.email || {};
  const approval = settings.approval || {};
  const engine = settings.engine || { enabled: true, paused: false };

  return (
    <div>
      {saved && <p className="con-sub">Saved {saved}.</p>}

      <div className="an-section">
        <h2 className="an-section-h">Continuous operation</h2>
        <p className="con-sub">
          Growth Engine is ON in normal production: agents run continuously on their own
          schedules. Pausing stops all agent work; resume to continue.
        </p>
        <div className="growth-setting-row">
          <label>growth engine enabled</label>
          <input type="checkbox" checked={!!engine.enabled}
            onChange={(e) => { save('engine', { ...engine, enabled: e.target.checked }); onEngine && onEngine({ ...engine, enabled: e.target.checked, running: e.target.checked && !engine.paused }); }} />
        </div>
        <div className="growth-setting-row">
          <label>paused</label>
          <input type="checkbox" checked={!!engine.paused}
            onChange={(e) => { save('engine', { ...engine, paused: e.target.checked }); onEngine && onEngine({ ...engine, paused: e.target.checked, running: engine.enabled && !e.target.checked }); }} />
        </div>
        {engine.paused && engine.pause_reason && (
          <p className="con-sub">Paused by {engine.paused_by || 'operator'}: {engine.pause_reason}</p>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Daily baselines (minimum targets, not quotas)</h2>
        <p className="con-sub">
          The engine keeps going past a baseline and never lowers qualification quality to
          reach one. The hard safety ceiling is shown separately and is deliberately far above.
        </p>
        {Object.entries(baselines).filter(([, v]) => typeof v === 'number').map(([k, v]) => (
          <div key={k} className="growth-setting-row">
            <label>{k.replace(/_/g, ' ')}</label>
            <input className="growth-input" type="number" defaultValue={v}
              onBlur={(e) => save('baselines', { ...baselines, [k]: parseInt(e.target.value, 10) || 0 })} />
          </div>
        ))}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Hard safety ceilings</h2>
        <p className="con-sub">
          These exist only to stop a runaway loop from becoming a search bill or a platform
          problem. 0 means no ceiling. They are not quality gates.
        </p>
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
        <h2 className="an-section-h">Contact enrichment</h2>
        <p className="con-sub">
          The Enricher finds a published way to reach qualified prospects that have no
          contact channel — reading the organization's own website and public developer
          profiles, recording where each detail came from and how it was verified. It never
          guesses an address and never sends: enabling it cannot email anyone.
        </p>
        <div className="growth-setting-row">
          <label>enrichment enabled</label>
          <input type="checkbox" checked={enrichment.enabled !== false}
            onChange={(e) => save('enrichment', { ...enrichment, enabled: e.target.checked })} />
        </div>
        {Object.entries(enrichment)
          .filter(([k, v]) => typeof v === 'number')
          .map(([k, v]) => (
            <div key={k} className="growth-setting-row">
              <label>{k.replace(/_/g, ' ')}</label>
              <input className="growth-input" type="number" defaultValue={v}
                onBlur={(e) => save('enrichment', { ...enrichment, [k]: parseInt(e.target.value, 10) || 0 })} />
            </div>
          ))}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Email sending</h2>
        <p className="con-sub">
          Connecting the account and enabling sending are two separate steps. Connect uses
          Google OAuth and stores the refresh token encrypted; the credential never leaves
          the server. Until both are done (and a transport is configured), every message is
          queued as a draft for approval.
        </p>
        {oauthNotice && <p className="con-sub">{oauthNotice}</p>}
        <div className="growth-setting-row">
          <label>transport</label>
          <select className="growth-input" value={email.transport || 'none'}
            onChange={(e) => setTransport(e.target.value)}>
            {Object.entries((emailStatus && emailStatus.transports) || { none: { available: true } })
              .map(([name, meta]) => (
                <option key={name} value={name} disabled={!meta.available}>
                  {name}{meta.available ? '' : ' (unavailable)'}
                </option>
              ))}
          </select>
          <span className="con-sub">
            {(emailStatus && emailStatus.transports && emailStatus.transports[email.transport || 'none']
              && emailStatus.transports[email.transport || 'none'].note) || ''}
          </span>
        </div>
        <div className="growth-setting-row">
          <label>outbound address</label>
          <input className="growth-input" defaultValue={email.from_email || ''}
            onBlur={(e) => save('email', { ...email, from_email: e.target.value })} />
        </div>
        <div className="growth-setting-row">
          <label>from name</label>
          <input className="growth-input" defaultValue={email.from_name || ''}
            onBlur={(e) => save('email', { ...email, from_name: e.target.value })} />
        </div>
        <div className="growth-setting-row">
          <label>reply-to</label>
          <input className="growth-input" defaultValue={email.reply_to || ''}
            onBlur={(e) => save('email', { ...email, reply_to: e.target.value })} />
          <span className="con-sub">
            Replies are routed here. The engine reads this inbox to detect replies, so it must be
            the connected Gmail account.
          </span>
        </div>
        <div className="growth-setting-row">
          <label>connection status</label>
          <span className="con-sub">
            {email.connection_status || 'not_connected'}
            {email.connected_account ? ` (${email.connected_account})` : ''}
          </span>
          {email.connection_status === 'connected'
            ? <>
                <button className="preview-checkout-btn" type="button" onClick={connectEmail}
                  title="Re-run Google consent to grant a new scope (e.g. inbox read) without disconnecting">
                  Reconnect Gmail</button>
                <button className="preview-checkout-btn" type="button" onClick={disconnectEmail}>Disconnect</button>
              </>
            : <button className="preview-checkout-btn" type="button" onClick={connectEmail}
                title={channelsMeta.oauth_configured ? 'Start the real Google OAuth flow' : 'Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on the API first'}>
                Connect Gmail</button>}
        </div>
        <div className="growth-setting-row">
          <label>inbox read access</label>
          <span className="con-sub">
            {emailStatus && emailStatus.inbox_read
              ? (emailStatus.inbox_read.can_read
                ? 'Granted — replies are detected.'
                : `Not granted — replies cannot be read. ${emailStatus.inbox_read.action_required || ''}`)
              : 'unknown'}
          </span>
        </div>
        <div className="growth-setting-row">
          <label>sending enabled</label>
          <input type="checkbox" checked={!!email.sending_enabled} disabled={sendingBusy}
            onChange={(e) => setSending(e.target.checked)} />
          <span className="con-sub">
            {emailStatus && emailStatus.can_send ? 'Ready to send.' : 'Will queue drafts until connected + enabled.'}
          </span>
        </div>
        <div className="growth-setting-row">
          <label>human review window (minutes)</label>
          <input className="growth-input" type="number" min="0" defaultValue={approval.review_window_minutes ?? 30}
            onBlur={(e) => save('approval', { ...approval, review_window_minutes: parseInt(e.target.value, 10) || 0 })} />
          <span className="con-sub">
            A draft that passes every gate is still held this long before the engine may send it,
            so you have a real chance to review or pull it back. Your own approve/reject is never
            delayed by this. 0 sends as soon as a draft is eligible.
          </span>
        </div>
        <div className="growth-setting-row">
          <label>send a test message to</label>
          <input className="growth-input" placeholder="you@example.com" value={testTo}
            onChange={(e) => setTestTo(e.target.value)} />
          <button className="preview-checkout-btn" type="button" onClick={sendTest}>Send test</button>
        </div>
        {testResult && (
          <p className="con-sub">
            {testResult.sent ? 'Sent.' : `Not sent: ${testResult.reason || 'unknown'}`}
          </p>
        )}
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Outreach channels</h2>
        <p className="con-sub">
          Email is sent automatically once connected and enabled. The platform channels are
          where the Closer queues a human-reviewed reply — automated posting is not permitted
          by the platforms' own rules. A channel is only used once it is connected here.
        </p>
        <div className="growth-table-wrap">
          <table className="growth-table">
            <thead><tr><th>Channel</th><th>Status</th><th>Identity</th><th>Sent today</th><th></th></tr></thead>
            <tbody>
              {['x', 'reddit', 'github', 'hackernews'].map((name) => {
                const c = channels.find((x) => x.channel === name) || {};
                const connected = c.status === 'connected';
                return (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{c.status || 'not_connected'}</td>
                    <td>{c.identity || '—'}</td>
                    <td>{(c.usage_today && c.usage_today.sends) || 0}</td>
                    <td>
                      {connected
                        ? <button className="preview-checkout-btn" type="button" onClick={() => disconnectChannel(name)}>Disconnect</button>
                        : <button className="preview-checkout-btn" type="button"
                            onClick={() => { const id = (typeof window !== 'undefined') ? window.prompt(`Handle for ${name}`) : null; if (id) connectChannel(name, id); }}>
                            Connect</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Sources and keywords</h2>
        <p className="con-sub">
          Source configuration and keyword control now live on the <strong>Sources</strong> tab,
          alongside the per-source audit, so discovery is configured in one place rather than
          buried in Settings.
        </p>
      </div>

      <div className="an-section">
        <h2 className="an-section-h">Data hygiene — clean reset and archive</h2>
        <p className="con-sub">
          Archiving moves stale, unqualified, duplicate or irrelevant prospects OUT of the
          active pool. It never deletes a prospect: suppression lists, opt-outs, bounces and
          sending history are preserved, and any prospect carrying them is never a candidate.
          The reset clears the pipeline so the funnel can be watched from a fresh start while
          keeping the transport, templates and engine switch.
        </p>
        <div className="growth-setting-row">
          <button className="preview-checkout-btn" type="button" onClick={loadAudit}>Audit the prospect DB</button>
          <button className="preview-checkout-btn" type="button" onClick={loadArchivePlan}>Show archive plan</button>
        </div>
        {audit && (
          <p className="con-sub">
            {audit.counts.prospects} prospects ({audit.counts.archived} archived),{' '}
            {audit.counts.signals} signals, {audit.counts.suppressions} suppressions,{' '}
            {audit.counts.sending_history} sending records. Would archive{' '}
            {audit.plan.to_archive}, preserve {audit.plan.preserved}.
          </p>
        )}
        {archivePlan && (
          <p className="con-sub">
            Plan: archive {archivePlan.to_archive} of {archivePlan.active_pool} active
            prospects ({Object.entries(archivePlan.by_reason || {}).map(([r, n]) => `${r}: ${n}`).join(', ') || 'none'});
            preserve {archivePlan.preserved}.
          </p>
        )}
        <div className="growth-setting-row">
          <button className="preview-checkout-btn" type="button" onClick={() => runArchive(true)}>Dry run archive</button>
          <button className="preview-checkout-btn" type="button" onClick={() => runArchive(false)}>Archive out of the pool</button>
        </div>
        {archiveResult && (
          <p className="con-sub">
            {archiveResult.dry_run ? 'Dry run: would archive ' : 'Archived '}
            {archiveResult.archived} prospect(s). Suppression lists, opt-outs, bounces and
            sending history preserved.
          </p>
        )}
        <div className="growth-setting-row">
          <button className="preview-checkout-btn" type="button" onClick={loadResetPreview}>Preview reset</button>
          <button className="preview-checkout-btn" type="button" onClick={runReset}>Reset the pipeline</button>
        </div>
        {resetPreview && (
          <p className="con-sub">
            Reset would clear {resetPreview.prospects} prospects and {resetPreview.signals} signals;
            preserve {resetPreview.suppressions} suppressions and {resetPreview.preserved_interactions} sending records.
          </p>
        )}
      </div>
    </div>
  );
}
