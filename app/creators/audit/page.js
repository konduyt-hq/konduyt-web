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

// Read a measurement out of a metrics section by key. The report carries its
// numbers with their sample sizes already attached; this only fetches them, and
// returns the explicit "not computed" marker rather than a zero so a missing
// measurement never renders as a real value.
function metricValue(section, key, unit = '') {
  const ms = (section?.measurements || []).find((x) => x.key === key);
  if (!ms || ms.value === null || ms.value === undefined) {
    return <span className="audit-missing">not computed</span>;
  }
  return `${fmtNum(ms.value)}${unit ? ` ${unit}` : ''}`;
}

function fmtCompact(v) {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

function fmtDate(v) {
  if (!v) return null;
  try {
    return new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
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
        <div className="audit-report-id">
          {p.profile_image_url && (
            <img
              className="audit-report-avatar"
              src={p.profile_image_url}
              alt={p.display_name || p.handle || 'Creator'}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <h2 className="audit-report-name">
              {p.display_name || p.handle || 'Creator'}
            </h2>
            <p className="audit-report-meta">
              {p.platform} {p.handle ? `· @${p.handle}` : ''} · {report.content_count} public items
            </p>
          </div>
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
        <div className="audit-stat">
          <span className="audit-stat-label">Median likes / view</span>
          <span className="audit-value">
            {metricValue(metrics.content, 'median_engagement_rate_per_view', '%')}
          </span>
        </div>
      </div>

      <ReportPulse metrics={metrics} content={report.content || []} />

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

      <ContentIntelligence insights={report.insights} />

      <PostTable content={report.content} />

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

// ---------------------------------------------------------------------------
// The report's richer, more visual halves.
//
// The report below the findings is meant to be readable by a creator, not only
// by an analyst: a pulse of the account's own numbers, the content-intelligence
// results as plain-language cards, and the full post list with its real
// thumbnails. All three obey the same rule as the rest of the page — a number is
// only ever shown when it was genuinely measured, and a withheld analysis says
// why rather than rendering as an empty box.
// ---------------------------------------------------------------------------

// An SVG sparkline over the posts in publication order. It shows shape, not
// precise values; the posts themselves are in the table below, so this does not
// need axes or labels to be honest.
function Sparkline({ points, width = 260, height = 56 }) {
  const vals = points.filter((v) => v !== null && v !== undefined);
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = width / Math.max(1, points.length - 1);
  const xy = points.map((v, i) => {
    const y = v === null || v === undefined
      ? null
      : height - ((v - min) / span) * (height - 6) - 3;
    return [i * step, y];
  });
  // Only draw the segments where both ends were measured, so a missing count
  // breaks the line instead of being interpolated across.
  const segs = [];
  let cursor = null;
  for (let i = 0; i < xy.length; i++) {
    if (xy[i][1] === null) { cursor = null; continue; }
    if (cursor === null) {
      segs.push(`M ${xy[i][0].toFixed(1)} ${xy[i][1].toFixed(1)}`);
    } else {
      segs.push(`L ${xy[i][0].toFixed(1)} ${xy[i][1].toFixed(1)}`);
    }
    cursor = i;
  }
  return (
    <svg
      className="audit-spark"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={segs.join(' ')} className="audit-spark-line" />
    </svg>
  );
}

function ReportPulse({ metrics, content }) {
  const posts = (content || [])
    .filter((c) => c.published_at)
    .slice()
    .sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
  const viewSeries = posts.map((c) => c.views);
  const likeSeries = posts.map((c) => c.likes);
  const viewVals = viewSeries.filter((v) => v !== null && v !== undefined);
  const likeVals = likeSeries.filter((v) => v !== null && v !== undefined);

  const trend = metrics.consistency?.measurements?.find((x) => x.key === 'recent_view_trend');
  const postsPerWeek = metrics.consistency?.measurements?.find((x) => x.key === 'posts_per_week');

  const showViews = viewVals.length >= 2;
  const showLikes = likeVals.length >= 2;
  if (!showViews && !showLikes && !postsPerWeek && !trend) return null;

  return (
    <section className="audit-section">
      <h3 className="audit-section-title">
        Account pulse
        <span className="audit-section-note">in publication order</span>
      </h3>
      {(showViews || showLikes) && (
        <div className="audit-pulse">
          {showViews && (
            <div className="audit-pulse-chart">
              <div className="audit-pulse-chart-head">
                <span className="audit-pulse-chart-label">Views per post</span>
                <span className="audit-pulse-chart-note">
                  {fmtCompact(Math.min(...viewVals))}–{fmtCompact(Math.max(...viewVals))}
                </span>
              </div>
              <Sparkline points={viewSeries} />
            </div>
          )}
          {showLikes && (
            <div className="audit-pulse-chart">
              <div className="audit-pulse-chart-head">
                <span className="audit-pulse-chart-label">Likes per post</span>
                <span className="audit-pulse-chart-note">where reported</span>
              </div>
              <Sparkline points={likeSeries} />
            </div>
          )}
        </div>
      )}
      <div className="audit-pulse-facts">
        {postsPerWeek && (
          <span className="audit-pulse-fact">
            <strong>{postsPerWeek.value}</strong> posts / week
          </span>
        )}
        {trend && (
          <span className="audit-pulse-fact">
            recent trend <strong>{trend.value > 0 ? '+' : ''}{trend.value}%</strong>
          </span>
        )}
        <span className="audit-pulse-fact">
          <strong>{posts.length}</strong> posts with dates
        </span>
      </div>
      <p className="audit-pulse-caveat">
        The sparklines show the order and shape of the account’s posts, not precise
        values — each point is one post, and a gap is a post whose count was not
        available.
      </p>
    </section>
  );
}

// One card per content-intelligence analysis. A card renders its result when
// there is one and its stated reason when there is not, so a withheld analysis
// never looks like a blank or a bug.
function ContentIntelligence({ insights }) {
  if (!insights || Object.keys(insights).length === 0) return null;

  const cards = [];

  const o = insights.outliers;
  if (o) {
    cards.push({
      key: 'outliers',
      title: 'Over- and under-performers',
      sufficient: o.sufficient,
      reason: o.reason,
      body: o.sufficient && (o.outliers || []).length > 0 && (
        <>
          <p className="audit-ci-lead">
            Median post: <strong>{fmtNum(o.median_views)}</strong> views.
            {o.spike ? ' The top group is a genuine spike, not a gentle slope.' : ' The top group sits close to the rest.'}
          </p>
          <ul className="audit-ci-posts">
            {o.outliers.slice(0, 4).map((x) => (
              <li key={x.id} className="audit-ci-post">
                <Thumb item={x} />
                <div className="audit-ci-post-text">
                  <a href={x.url} target="_blank" rel="noreferrer" className="audit-ci-post-title">
                    {x.title || x.id}
                  </a>
                  <span className="audit-ci-post-metric">{fmtNum(x.value)} views</span>
                </div>
              </li>
            ))}
          </ul>
          {(o.distinguishing || []).length > 0 && (
            <p className="audit-ci-foot">
              What they share: {o.distinguishing.slice(0, 3).map((d) => d.attribute).join(', ')}.
            </p>
          )}
        </>
      ),
    });
  }

  const e = insights.engagement_vs_reach;
  if (e) {
    cards.push({
      key: 'engagement',
      title: 'Reach against engagement',
      sufficient: e.sufficient,
      reason: e.reason,
      body: e.sufficient && (
        <>
          <p className="audit-ci-lead">{e.interpretation}</p>
          <div className="audit-ci-method">
            <span className="audit-ci-method-label">Method</span>
            <span className="audit-ci-method-body">
              {e.method}. The raw likes-per-view correlation is shown only as a
              cross-check: views appear in both quantities, which pushes that
              number down on its own, so it is not used for the conclusion.
            </span>
          </div>
          <div className="audit-ci-numbers">
            <span className="audit-ci-number">
              exponent <strong>{e.exponent}</strong>
            </span>
            {e.exponent_ci && (
              <span className="audit-ci-number">
                95% interval <strong>{e.exponent_ci[0]}–{e.exponent_ci[1]}</strong>
              </span>
            )}
            <span className="audit-ci-number">
              ratio cross-check <strong>{e.ratio_rho}</strong>
              {e.ratio_p_value !== null && e.ratio_p_value !== undefined
                ? ` (p=${e.ratio_p_value})` : ''}
            </span>
            <span className="audit-ci-number">
              <strong>{e.sample}</strong> posts
            </span>
          </div>
        </>
      ),
    });
  }

  const c = insights.clusters;
  if (c && c.sufficient && (c.clusters || []).length > 0) {
    cards.push({
      key: 'clusters',
      title: 'Content themes',
      sufficient: true,
      body: (
        <>
          <p className="audit-ci-lead">
            Repeated words from the titles, with each theme’s median against the
            account’s overall median of {fmtNum(c.account_median_views)} views.
          </p>
          <div className="audit-ci-themes">
            {c.clusters.slice(0, 6).map((cl) => (
              <div key={cl.label} className="audit-ci-theme">
                <div className="audit-ci-theme-head">
                  <span className="audit-ci-theme-label">{cl.label}</span>
                  <span className="audit-ci-theme-count">{cl.count} posts</span>
                </div>
                <div className="audit-ci-theme-bar">
                  <span
                    className="audit-ci-theme-fill"
                    style={{
                      width: `${Math.max(4, Math.min(100, (cl.median_views / (c.account_median_views || cl.median_views)) * 50))}%`,
                    }}
                  />
                  <span
                    className="audit-ci-theme-mid"
                    title="the account's overall median"
                  />
                </div>
                <div className="audit-ci-theme-meta">
                  <span>median {fmtNum(cl.median_views)}</span>
                  {cl.reliable
                    ? <span>range {fmtCompact(cl.min_views)}–{fmtCompact(cl.max_views)}</span>
                    : <span className="audit-ci-theme-thin">too few posts to rank</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    });
  }

  const v = insights.velocity;
  if (v) {
    cards.push({
      key: 'velocity',
      title: 'How fast recent posts are accumulating views',
      sufficient: v.sufficient,
      reason: v.reason,
      body: v.sufficient && (v.fastest || []).length > 0 && (
        <>
          <p className="audit-ci-lead">
            Median <strong>{fmtNum(v.median_views_per_day)}</strong> views per day
            since publication.
          </p>
          <ul className="audit-ci-posts">
            {v.fastest.slice(0, 3).map((x) => (
              <li key={x.id} className="audit-ci-post">
                <Thumb item={x} />
                <div className="audit-ci-post-text">
                  <a href={x.url} target="_blank" rel="noreferrer" className="audit-ci-post-title">
                    {x.title || x.id}
                  </a>
                  <span className="audit-ci-post-metric">
                    {fmtNum(x.views_per_day)} views / day · {x.days_live} days live
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {v.caveat && <p className="audit-ci-foot">{v.caveat}</p>}
        </>
      ),
    });
  }

  const t = insights.title_features;
  if (t && t.sufficient && (t.features || []).length > 0) {
    cards.push({
      key: 'titles',
      title: 'Title features',
      sufficient: true,
      body: (
        <ul className="audit-ci-features">
          {t.features.slice(0, 5).map((f) => (
            <li key={f.feature} className="audit-ci-feature">
              <span className="audit-ci-feature-label">{f.label}</span>
              <span className="audit-ci-feature-meta">
                {f.direction === 'higher' ? 'higher' : f.direction === 'lower' ? 'lower' : 'similar'}
                {f.relative_difference !== null && f.relative_difference !== undefined
                  ? `: ${Math.round(Math.abs(f.relative_difference) * 100)}%` : ''}
                {f.posts_with ? ` · ${f.posts_with} of ${f.posts_with + (f.posts_without || 0)} posts` : ''}
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  const g = insights.gap_effect;
  if (g && g.sufficient) {
    cards.push({
      key: 'gaps',
      title: 'Posting gaps',
      sufficient: true,
      body: (
        <p className="audit-ci-lead">
          Posts after a long break differ from the rest by{' '}
          <strong>
            {g.relative_difference > 0 ? '+' : ''}{Math.round(g.relative_difference * 100)}%
          </strong>.
          {g.median_gap_days ? ` A break is over ${g.median_gap_days} days here.` : ''}
        </p>
      ),
    });
  }

  const h = insights.history;
  if (h && h.sufficient && (h.deltas || []).length > 0) {
    cards.push({
      key: 'history',
      title: 'Change since the previous audit',
      sufficient: true,
      body: (
        <ul className="audit-ci-features">
          {h.deltas.slice(0, 5).map((d, i) => (
            <li key={i} className="audit-ci-feature">
              <span className="audit-ci-feature-label">{d.label || d.key}</span>
              <span className="audit-ci-feature-meta">
                {d.previous} → {d.current}
                {d.change_pct !== null && d.change_pct !== undefined
                  ? ` (${d.change_pct > 0 ? '+' : ''}${Math.round(d.change_pct * 100)}%)` : ''}
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (cards.length === 0) return null;

  return (
    <section className="audit-section">
      <h3 className="audit-section-title">
        Content intelligence
        <span className="audit-section-note">exploratory — associations, not causes</span>
      </h3>
      <div className="audit-ci-grid">
        {cards.map((card) => (
          <div key={card.key} className="audit-ci-card">
            <h4 className="audit-ci-title">{card.title}</h4>
            {card.sufficient
              ? card.body
              : (
                <p className="audit-ci-withheld">
                  {card.reason || 'Not enough data for this analysis.'}
                </p>
              )}
          </div>
        ))}
      </div>
      <p className="audit-ci-note">
        These are associations in one sample of one account’s recent posts. They
        describe what has happened on this account, not what would happen if a
        style or schedule were changed deliberately.
      </p>
    </section>
  );
}

// A post's thumbnail where one can be derived, and a neutral placeholder where
// it cannot — never a broken image, which would read as a fault in the audit.
function Thumb({ item, size = 'sm' }) {
  const thumb = item && item.thumbnail_url;
  if (!thumb) {
    return <span className={`audit-thumb audit-thumb-${size} audit-thumb-empty`} aria-hidden="true" />;
  }
  return (
    <img
      className={`audit-thumb audit-thumb-${size}`}
      src={thumb}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

// The whole collected set, so the reader can sort and scan the same posts every
// finding was drawn from.
function PostTable({ content }) {
  if (!content || content.length === 0) return null;
  const rows = content.slice().sort((a, b) => (b.views || -1) - (a.views || -1));
  return (
    <section className="audit-section">
      <h3 className="audit-section-title">
        All collected posts
        <span className="audit-section-note">{content.length} items · by views</span>
      </h3>
      <ul className="audit-posts">
        {rows.map((c) => {
          const likesPerView = c.views && c.likes !== null && c.likes !== undefined
            ? (c.likes / c.views) * 100 : null;
          return (
            <li key={c.id} className="audit-post">
              <a href={c.url} target="_blank" rel="noreferrer" className="audit-post-thumb-link">
                <Thumb item={c} size="md" />
              </a>
              <div className="audit-post-main">
                <a href={c.url} target="_blank" rel="noreferrer" className="audit-post-title">
                  {c.title || c.id}
                </a>
                <span className="audit-post-date">{fmtDate(c.published_at) || 'date unavailable'}</span>
              </div>
              <div className="audit-post-numbers">
                <span className="audit-post-num">
                  <span className="audit-post-num-label">views</span>
                  {c.views === null || c.views === undefined
                    ? <span className="audit-missing">—</span>
                    : fmtNum(c.views)}
                </span>
                <span className="audit-post-num">
                  <span className="audit-post-num-label">likes</span>
                  {c.likes === null || c.likes === undefined
                    ? <span className="audit-missing">—</span>
                    : fmtNum(c.likes)}
                </span>
                <span className="audit-post-num">
                  <span className="audit-post-num-label">likes / view</span>
                  {likesPerView === null
                    ? <span className="audit-missing">—</span>
                    : `${likesPerView.toFixed(2)}%`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
