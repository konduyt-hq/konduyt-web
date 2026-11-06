'use client';

import { useState, useEffect } from 'react';

// KonduytCreators — Public Creator Audit.
//
// The first working CreatorOS surface: enter a creator's username, name or
// profile URL, pick the right account, and get an evidence-backed assessment of
// their PUBLIC presence. No OAuth and no account connection is required — the
// creator being audited never signs in, and this page never asks for a
// credential.
//
// Two things this page is careful to do:
//
//  1. It reads /creatoros/capabilities first and shows each platform's real
//     status. The three platforms do NOT have equal access (TikTok username
//     lookup needs Research API approval; Instagram needs App Review and only
//     covers professional accounts), so showing three equal-looking buttons
//     would be a lie the backend is not telling.
//
//  2. It renders the report's own limitations and data gaps. The backend marks
//     every field AVAILABLE / MISSING / RESTRICTED / NOT_SUPPORTED, and this
//     page surfaces that instead of hiding it — a blank where a number should
//     be is information, not a rendering bug.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', hint: 'Channel URL, @handle, or creator name' },
  { id: 'instagram', label: 'Instagram', hint: 'Exact @username or profile URL' },
  { id: 'tiktok', label: 'TikTok', hint: 'Exact @username' },
];

function fmtNum(v) {
  if (v === null || v === undefined) return null;
  return new Intl.NumberFormat().format(v);
}

export default function CreatorAudit() {
  const [caps, setCaps] = useState(null);
  const [platform, setPlatform] = useState('youtube');
  const [input, setInput] = useState('');
  const [stage, setStage] = useState('form'); // form | resolving | candidates | running | report | error
  const [candidates, setCandidates] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [blocked, setBlocked] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/creatoros/capabilities`);
        const d = await r.json();
        if (!cancelled) setCaps(d.platforms || []);
      } catch {
        if (!cancelled) setCaps([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const capFor = (id) => (caps || []).find((c) => c.platform === id);
  const activeCap = capFor(platform);

  async function resolveAccount() {
    setError(null);
    setBlocked(null);
    setStage('resolving');
    try {
      const r = await fetch(`${API_BASE}/creatoros/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, input }),
      });
      const d = await r.json();
      if (d.status !== 'OK') {
        setBlocked(d);
        setStage('form');
        return;
      }
      const list = d.candidates || [];
      if (list.length > 1) {
        setCandidates(list);
        setStage('candidates');
      } else if (list.length === 1) {
        await runAudit(list[0]);
      } else {
        setBlocked({ status: 'NOT_FOUND', limitations: ['No matching account was found.'] });
        setStage('form');
      }
    } catch {
      setError('Could not reach the audit service. Please try again.');
      setStage('form');
    }
  }

  async function runAudit(account) {
    setStage('running');
    setError(null);
    try {
      const body = { platform, input };
      if (account) {
        body.account = {
          platform_user_id: account.platform_user_id,
          handle: account.handle,
          profile_url: account.profile_url,
          display_name: account.display_name,
        };
      }
      const r = await fetch(`${API_BASE}/creatoros/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.ok) {
        setBlocked(d);
        setStage('form');
        return;
      }
      setReport(d);
      setStage('report');
    } catch {
      setError('The audit could not be completed. Please try again.');
      setStage('form');
    }
  }

  function reset() {
    setStage('form');
    setReport(null);
    setCandidates([]);
    setBlocked(null);
    setError(null);
    setInput('');
  }

  return (
    <div className="audit-root">
      <div className="audit-topbar">
        <a href="/creators/" className="audit-back">← Konduyt for Creators</a>
        <span className="audit-flag">Public data only · no login required</span>
      </div>

      <div className="audit-wrap">
        <header className="audit-head">
          <span className="landing-eyebrow">Public Creator Audit</span>
          <h1 className="audit-title">Audit a creator’s public presence</h1>
          <p className="audit-sub">
            Enter a creator’s username, name or profile URL. We look only at what
            is publicly available — the creator does not need to connect an
            account or sign in.
          </p>
        </header>

        {stage === 'form' && (
          <div className="audit-card">
            <div className="audit-platforms">
              {PLATFORMS.map((p) => {
                const c = capFor(p.id);
                const isBlocked = c && (c.approval_required || c.blocked_reason);
                // `available` means auditable right now with no credential;
                // `configured` only means an optional richer credential is
                // present. YouTube is available but not configured when no API
                // key is set, so keying the label off `configured` alone
                // wrongly reported a fully working platform as "Not
                // configured". Approval-gated platforms are never available.
                const canRun = c && c.available && !isBlocked;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`audit-platform${platform === p.id ? ' audit-platform-active' : ''}`}
                    onClick={() => { setPlatform(p.id); setBlocked(null); }}
                  >
                    <span className="audit-platform-name">{p.label}</span>
                    {c && !canRun && (
                      <span className="audit-platform-note">
                        {isBlocked ? 'Approval required' : 'Not available'}
                      </span>
                    )}
                    {canRun && (
                      <span className="audit-platform-ok">
                        {c.configured ? 'Ready' : 'Ready — no key needed'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <label className="audit-label" htmlFor="audit-input">
              Creator on {PLATFORMS.find((p) => p.id === platform)?.label}
            </label>
            <input
              id="audit-input"
              className="audit-input"
              type="text"
              value={input}
              placeholder={PLATFORMS.find((p) => p.id === platform)?.hint}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) resolveAccount(); }}
            />

            {activeCap?.blocked_reason && (
              <p className="audit-warn">{activeCap.blocked_reason}</p>
            )}

            <div className="audit-actions">
              <button
                type="button"
                className="audit-btn"
                onClick={resolveAccount}
                disabled={!input.trim()}
              >
                Run public audit
              </button>
              {report && (
                <button type="button" className="audit-btn-ghost" onClick={reset}>
                  New audit
                </button>
              )}
            </div>

            {error && <p className="audit-error">{error}</p>}

            {blocked && (
              <div className="audit-blocked">
                <strong className="audit-blocked-title">
                  {blocked.status === 'NOT_FOUND' ? 'No account found' : 'Not available'}
                </strong>
                {(blocked.limitations || []).map((l, i) => (
                  <p key={i} className="audit-blocked-line">{l}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {stage === 'resolving' && (
          <div className="audit-card audit-center">
            <p className="audit-status">Looking up the account…</p>
          </div>
        )}

        {stage === 'candidates' && (
          <div className="audit-card">
            <p className="audit-status">
              More than one account matched. Choose the right one:
            </p>
            <ul className="audit-candidates">
              {candidates.map((c, i) => (
                <li key={i} className="audit-candidate">
                  <button
                    type="button"
                    className="audit-candidate-btn"
                    onClick={() => runAudit(c)}
                  >
                    <span className="audit-candidate-name">
                      {c.display_name || c.handle || c.platform_user_id}
                    </span>
                    {c.handle && <span className="audit-candidate-handle">@{c.handle}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage === 'running' && (
          <div className="audit-card audit-center">
            <p className="audit-status">Collecting public data and analysing…</p>
          </div>
        )}

        {stage === 'report' && report && <Report report={report} onReset={reset} />}
      </div>
    </div>
  );
}

function AvailabilityValue({ field }) {
  if (!field) return <span className="audit-missing">—</span>;
  if (field.value !== null && field.value !== undefined) {
    return <span className="audit-value">{fmtNum(field.value)}</span>;
  }
  return <span className="audit-missing" title={field.availability}>{field.availability}</span>;
}

function Report({ report, onReset }) {
  const p = report.profile || {};
  const metrics = report.metrics || {};
  const contentMs = metrics.content?.measurements || [];
  const consistencyMs = metrics.consistency?.measurements || [];
  const engagementMs = metrics.account?.measurements || [];

  return (
    <div className="audit-report">
      <div className="audit-report-head">
        <div>
          <h2 className="audit-report-name">
            {p.display_name || p.handle || 'Creator'}
          </h2>
          <p className="audit-report-meta">
            {p.platform} {p.handle ? `· @${p.handle}` : ''} · {report.content_count} public items
          </p>
        </div>
        <button type="button" className="audit-btn-ghost" onClick={onReset}>
          New audit
        </button>
      </div>

      <div className="audit-stats">
        <div className="audit-stat">
          <span className="audit-stat-label">Followers</span>
          <AvailabilityValue field={p.follower_count} />
        </div>
        <div className="audit-stat">
          <span className="audit-stat-label">Public items</span>
          <AvailabilityValue field={p.post_count} />
        </div>
        <div className="audit-stat">
          <span className="audit-stat-label">Total views</span>
          <AvailabilityValue field={p.total_views} />
        </div>
      </div>

      {report.assessment && (
        <section className="audit-section">
          <h3 className="audit-section-title">Assessment</h3>
          <p className="audit-prose">{report.assessment}</p>
        </section>
      )}

      <section className="audit-section">
        <h3 className="audit-section-title">
          Findings
          <span className="audit-section-note">
            {report.evidence_summary?.verified_findings || 0} verified
          </span>
        </h3>
        {(report.findings || []).length === 0 && (
          <p className="audit-prose">No findings could be supported by the available data.</p>
        )}
        <ul className="audit-findings">
          {(report.findings || []).map((f) => (
            <li key={f.id} className="audit-finding">
              <div className="audit-finding-head">
                <span className="audit-finding-title">{f.title}</span>
                <span className={`audit-badge audit-badge-${(f.validation_state || '').toLowerCase()}`}>
                  {f.validation_state === 'VALIDATED' ? f.confidence : f.validation_state}
                </span>
              </div>
              <p className="audit-finding-body">{f.explanation}</p>
              {f.why_it_matters && (
                <p className="audit-finding-why">{f.why_it_matters}</p>
              )}
              {f.recommended_action && (
                <p className="audit-finding-action">Try: {f.recommended_action}</p>
              )}
              {f.measurement && (
                <p className="audit-finding-measure">{f.measurement}</p>
              )}
              {f.validation_notes && (
                <p className="audit-finding-caveat">Caveat: {f.validation_notes}</p>
              )}
              {(f.evidence || []).length > 0 && (
                <ul className="audit-evidence">
                  {f.evidence.map((e, i) => (
                    <li key={i} className="audit-evidence-item">
                      {e.kind === 'content' && (
                        <>
                          <a href={e.url} target="_blank" rel="noreferrer" className="audit-evidence-link">
                            {e.title || e.id}
                          </a>
                          {e.metric && e.value !== null && (
                            <span className="audit-evidence-metric">
                              {fmtNum(e.value)} {e.metric}
                            </span>
                          )}
                        </>
                      )}
                      {e.kind === 'measurement' && (
                        <span className="audit-evidence-metric">
                          {e.label || e.key}: {e.value}
                          {e.sample ? ` (n=${e.sample})` : ''}
                        </span>
                      )}
                      {e.kind === 'profile' && (
                        <span className="audit-evidence-metric">profile field: {e.field}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {(contentMs.length > 0 || consistencyMs.length > 0 || engagementMs.length > 0) && (
        <section className="audit-section">
          <h3 className="audit-section-title">Measurements</h3>
          <table className="audit-table">
            <tbody>
              {[...contentMs, ...consistencyMs, ...engagementMs].map((ms) => (
                <tr key={ms.key} className="audit-table-row">
                  <td className="audit-table-label">{ms.label}</td>
                  <td className="audit-table-value">
                    {ms.value === null || ms.value === undefined
                      ? <span className="audit-missing">not computed</span>
                      : `${ms.value}${ms.unit ? ` ${ms.unit}` : ''}`}
                  </td>
                  <td className="audit-table-sample">{ms.sample ? `n=${ms.sample}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(report.recommendations || []).length > 0 && (
        <section className="audit-section">
          <h3 className="audit-section-title">Recommendations</h3>
          <ol className="audit-recs">
            {report.recommendations.map((r, i) => (
              <li key={i} className="audit-rec">
                <span className="audit-rec-title">{r.title}</span>
                {r.measurement && <span className="audit-rec-measure">{r.measurement}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="audit-section audit-section-limits">
        <h3 className="audit-section-title">What this audit could and could not see</h3>
        {(report.limitations || []).length > 0 && (
          <ul className="audit-limits">
            {report.limitations.map((l, i) => (
              <li key={i} className="audit-limit">{l}</li>
            ))}
          </ul>
        )}
        {(report.data_gaps || []).length > 0 && (
          <>
            <p className="audit-limits-sub">Fields that were not available:</p>
            <ul className="audit-limits">
              {report.data_gaps.map((g, i) => (
                <li key={i} className="audit-limit">
                  {g.field} — {g.reason}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="audit-score-note">{report.scoring?.reason}</p>
      </section>
    </div>
  );
}
