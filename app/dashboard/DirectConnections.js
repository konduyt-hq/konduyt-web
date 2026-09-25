'use client';
import { useState, useEffect, useCallback } from 'react';

// Direct Connections — the merchant's own payment account, connected.
//
// This is NOT provider orchestration. A merchant connects an account THEY
// ALREADY OWN (mobile money or bank) so their customers can pay it directly.
// Konduyt never holds or moves the money.
//
// The page renders EXACTLY what the API returns and derives nothing itself:
// the status shown per institution ("Connect" / "Connected" / "Not currently
// supported") and the action that follows come from
// GET /direct-connections/projects/:id/catalogue. Re-deriving that rule here
// would make the dashboard a second, drifting authority for a fact the backend
// already owns — the same class of bug the backend's ladder exists to prevent.
//
// Nothing on this page claims a capability the backend has not stated:
//   * only EXECUTABLE institutions offer a Connect button;
//   * verification fields come from the connector's real credential schema;
//   * an institution Konduyt cannot observe says so, and why.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

function authHeaders() {
  let token = null;
  try { token = localStorage.getItem('kdu_token'); } catch (e) {}
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// A status pill. The three states are the API's, not invented here.
function StatusPill({ status }) {
  const cls =
    status === 'Connected' ? 'dc-pill dc-pill-connected'
      : status === 'Connect' ? 'dc-pill dc-pill-connect'
        : 'dc-pill dc-pill-unsupported';
  return <span className={cls}>{status}</span>;
}

export default function DirectConnections({ active, onNotice }) {
  const projectId = active?.id;
  const country = active?.merchant_country;

  const [catalogue, setCatalogue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // The connect/verify forms, keyed by institution id, so only one is open.
  const [openForm, setOpenForm] = useState(null);
  const [account, setAccount] = useState('');
  const [verifyRef, setVerifyRef] = useState('');
  const [creds, setCreds] = useState({});

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const q = country ? `?country=${encodeURIComponent(country)}` : '';
      const r = await fetch(
        `${API_BASE}/direct-connections/projects/${projectId}/catalogue${q}`,
        { headers: authHeaders() });
      if (!r.ok) {
        setError(r.status === 401
          ? 'Sign in again to manage direct connections.'
          : `Could not load direct connections (${r.status}).`);
        setCatalogue(null);
        return;
      }
      setCatalogue(await r.json());
    } catch (e) {
      setError('Could not reach Konduyt. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [projectId, country]);

  useEffect(() => { load(); }, [load]);

  // Verification requirements are fetched per institution from the API, so the
  // form shows the connector's REAL fields (or an honest "unavailable").
  const [requirements, setRequirements] = useState({});
  const openConnect = async (inst, connection) => {
    setOpenForm(inst.institution_id);
    setAccount('');
    setVerifyRef('');
    setCreds({});
    // Only the verify step needs the requirements; a plain connect does not.
    if (!connection) return;
    try {
      const r = await fetch(
        `${API_BASE}/direct-connections/institutions/${inst.institution_id}/verification`);
      const d = await r.json();
      setRequirements((prev) => ({ ...prev, [inst.institution_id]: d }));
    } catch (e) {
      setRequirements((prev) => ({ ...prev, [inst.institution_id]: null }));
    }
  };

  const connect = async (inst) => {
    setBusyId(inst.institution_id);
    try {
      const r = await fetch(
        `${API_BASE}/direct-connections/projects/${projectId}/connections`,
        { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ institution_id: inst.institution_id, account }) });
      const d = await r.json();
      if (!r.ok) {
        onNotice?.(d.message || d.error || 'Could not connect that account.');
        return;
      }
      setOpenForm(null);
      await load();
      onNotice?.(`Connected ${inst.name} ${d.display_account}.`);
    } finally {
      setBusyId(null);
    }
  };

  const verify = async (inst, connection) => {
    const req = requirements[inst.institution_id];
    const method = inst.verification_method;
    const body = { method };
    if (req?.credentials_required) body.credentials = creds;
    else body.reference = verifyRef;
    setBusyId(inst.institution_id);
    try {
      const r = await fetch(
        `${API_BASE}/direct-connections/projects/${projectId}/connections/${connection.id}/verify`,
        { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) {
        onNotice?.(d.message || 'Verification did not go through.');
        return;
      }
      setOpenForm(null);
      await load();
      onNotice?.(d.offerable
        ? `${inst.name} is verified and can now be offered to customers.`
        : `${inst.name} is verified. Konduyt still cannot execute payments to it, so it is not offered at checkout.`);
    } finally {
      setBusyId(null);
    }
  };

  const disconnect = async (inst, connection) => {
    if (!window.confirm(
      `Disconnect ${inst.name} ${connection.display_account}? ` +
      'Customers will no longer be able to pay it, and pending payment ' +
      'requests will be expired.')) return;
    setBusyId(inst.institution_id);
    try {
      const r = await fetch(
        `${API_BASE}/direct-connections/projects/${projectId}/connections/${connection.id}`,
        { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) { onNotice?.('Could not disconnect that account.'); return; }
      await load();
      onNotice?.(`Disconnected ${inst.name}.`);
    } finally {
      setBusyId(null);
    }
  };

  if (!projectId) {
    return (
      <div className="mpesa-page">
        <div className="con-home-head">
          <h1 className="con-h1">Direct Connections</h1>
          <p className="con-sub">Select or create a project to connect an account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mpesa-page">
      <div className="con-home-head con-home-head-row">
        <div>
          <h1 className="con-h1">Direct Connections</h1>
          <p className="con-sub">
            Connect a payment account you already own — mobile money or bank — so
            customers can pay it directly. Konduyt never holds or moves your money.
          </p>
        </div>
      </div>

      {!country && (
        <div className="coverage-banner coverage-warn">
          <span className="coverage-banner-icon">⚠</span>
          <span>
            This project has no country set, so Konduyt cannot show which
            institutions you can connect. Set it in Settings first.
          </span>
        </div>
      )}

      {error && (
        <div className="coverage-banner coverage-warn">
          <span className="coverage-banner-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {loading && !catalogue && (
        <p className="dc-muted">Loading institutions…</p>
      )}

      {catalogue && (
        <>
          <div className="coverage-banner coverage-ok">
            <span className="coverage-banner-icon">✓</span>
            <span>
              {catalogue.summary.executable} of {catalogue.summary.total} institutions
              in {catalogue.country} can be connected today
              {catalogue.summary.connected > 0
                ? ` — ${catalogue.summary.connected} connected.` : '.'}
            </span>
          </div>

          {(catalogue.sections || []).map((section) => (
            <div className="routing-section" key={section.category}>
              <div className="routing-section-h">{section.title}</div>
              <p className="routing-section-sub">
                {section.category === 'MOBILE_MONEY'
                  ? 'Mobile money accounts customers can pay directly.'
                  : 'Bank accounts customers can transfer to directly.'}
              </p>

              {section.institutions.map((i) => {
                const conn = i.connection;
                const isOpen = openForm === i.institution_id;
                const req = requirements[i.institution_id];
                const busy = busyId === i.institution_id;
                // The Verify button must not submit a form the connector's own
                // schema says is incomplete: every required field filled, or --
                // for a reference-only method -- a reference typed in.
                const verifyReady = req && req.available !== false
                  ? (req.credentials_required
                    ? (req.fields || []).every((f) => !f.required || (creds[f.name] || '').trim())
                    : verifyRef.trim().length > 0)
                  : false;
                return (
                  <div className="dc-row" key={i.institution_id}>
                    <div className="dc-row-main">
                      <div className="dc-row-title">
                        <span className="dc-name">{i.name}</span>
                        <StatusPill status={i.status} />
                      </div>
                      {i.operator && <div className="dc-operator">{i.operator}</div>}

                      {conn ? (
                        <div className="dc-account">
                          <span className="dc-account-num">{conn.display_account}</span>
                          {conn.account_name && (
                            <span className="dc-account-name"> · {conn.account_name}</span>
                          )}
                          <span className="dc-account-state">
                            {conn.state === 'EXECUTABLE'
                              ? 'Verified · live at checkout'
                              : conn.state === 'VERIFIED'
                                ? 'Verified · not executable yet'
                                : 'Connected · not verified yet'}
                          </span>
                        </div>
                      ) : i.execution_capability === 'EXECUTABLE' ? (
                        <div className="dc-account">
                          Connect your {i.account_label || 'account'} (
                          {i.account_format})
                        </div>
                      ) : (
                        <div className="dc-account dc-unsupported-reason">
                          {i.limitation_note || 'Not supported yet.'}
                          {i.obtain_instructions && (
                            <>
                              {' '}
                              {i.obtain_url ? (
                                <a href={i.obtain_url} target="_blank"
                                   rel="noopener noreferrer">{i.obtain_instructions}</a>
                              ) : i.obtain_instructions}
                            </>
                          )}
                        </div>
                      )}

                      {/* Only claim a confirmation mode the backend says applies. */}
                      {i.execution_capability === 'EXECUTABLE' && (
                        <div className="dc-meta">
                          Payments are confirmed {i.confirmation_mode === 'AUTOMATIC'
                            ? 'automatically from the rail'
                            : i.confirmation_mode === 'RECONCILIATION'
                              ? 'by reconciliation against the rail'
                              : 'manually by you'}.
                          {i.refund_note ? ` ${i.refund_note}` : ''}
                        </div>
                      )}
                    </div>

                    <div className="dc-row-actions">
                      {conn ? (
                        <>
                          {conn.state === 'CONNECTED' && (
                            <button type="button" className="dc-btn dc-btn-primary"
                              disabled={busy}
                              onClick={() => openConnect(i, conn)}>
                              Verify
                            </button>
                          )}
                          <button type="button" className="dc-btn"
                            disabled={busy}
                            onClick={() => disconnect(i, conn)}>
                            Disconnect
                          </button>
                        </>
                      ) : i.action === 'CONNECT' ? (
                        <button type="button" className="dc-btn dc-btn-primary"
                          disabled={busy}
                          onClick={() => openConnect(i)}>
                          Connect
                        </button>
                      ) : (
                        <button type="button" className="dc-btn" disabled>
                          Not currently supported
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <div className="dc-form">
                        {!conn && (
                          <>
                            <label className="dc-label" htmlFor={`acct-${i.institution_id}`}>
                              {i.account_label || 'Account'}
                            </label>
                            <input id={`acct-${i.institution_id}`} className="dc-input"
                              value={account} placeholder={i.account_example || ''}
                              onChange={(e) => setAccount(e.target.value)} />
                            <p className="dc-hint">
                              {i.account_format}
                              {i.account_example ? ` · e.g. ${i.account_example}` : ''}
                            </p>
                            <div className="dc-form-actions">
                              <button type="button" className="dc-btn dc-btn-primary"
                                disabled={busy || !account}
                                onClick={() => connect(i)}>
                                {busy ? 'Connecting…' : 'Connect account'}
                              </button>
                              <button type="button" className="dc-btn"
                                onClick={() => setOpenForm(null)}>Cancel</button>
                            </div>
                          </>
                        )}

                        {conn && (
                          <>
                            <div className="dc-form-title">
                              Verify ownership of {conn.display_account}
                            </div>
                            {req === undefined ? (
                              <p className="dc-hint">Loading verification requirements…</p>
                            ) : req === null || req.available === false ? (
                              <p className="dc-hint">
                                {req?.note || 'Verification requirements could not be loaded.'}
                              </p>
                            ) : req.credentials_required ? (
                              <>
                                <p className="dc-hint">{req.note}</p>
                                {(req.fields || []).map((f) => (
                                  <div key={f.name} className="dc-field">
                                    <label className="dc-label" htmlFor={`f-${i.institution_id}-${f.name}`}>
                                      {f.label}{f.required ? '' : ' (optional)'}
                                    </label>
                                    {Array.isArray(f.options) && f.options.length > 0 ? (
                                      <select id={`f-${i.institution_id}-${f.name}`}
                                        className="dc-input"
                                        value={creds[f.name] || ''}
                                        onChange={(e) => setCreds((c) => ({ ...c, [f.name]: e.target.value }))}>
                                        <option value="">Choose…</option>
                                        {f.options.map((o) => (
                                          <option key={o} value={o}>{o}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input id={`f-${i.institution_id}-${f.name}`}
                                        className="dc-input" type={f.type === 'password' ? 'password' : 'text'}
                                        placeholder={f.placeholder || ''}
                                        value={creds[f.name] || ''}
                                        onChange={(e) => setCreds((c) => ({ ...c, [f.name]: e.target.value }))} />
                                    )}
                                    {f.help && <p className="dc-hint">{f.help}</p>}
                                  </div>
                                ))}
                              </>
                            ) : (
                              <>
                                <p className="dc-hint">
                                  {req?.note || 'Record the evidence used to verify this account.'}
                                </p>
                                <input className="dc-input" value={verifyRef}
                                  placeholder="Evidence reference"
                                  onChange={(e) => setVerifyRef(e.target.value)} />
                              </>
                            )}
                            <div className="dc-form-actions">
                              <button type="button" className="dc-btn dc-btn-primary"
                                disabled={busy || req?.available === false || !verifyReady}
                                onClick={() => verify(i, conn)}>
                                {busy ? 'Verifying…' : 'Verify'}
                              </button>
                              <button type="button" className="dc-btn"
                                onClick={() => setOpenForm(null)}>Cancel</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <p className="dc-footnote">{catalogue.note}</p>
        </>
      )}
    </div>
  );
}
