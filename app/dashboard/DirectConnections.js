'use client';
import { useState, useEffect, useCallback } from 'react';
import DirectConnectionsCountries from './DirectConnectionsCountries';

// Direct Connections — how this merchant receives money from customers in
// their country.
//
// This is NOT a provider/API directory, and it is NOT "integrate with each
// provider". The question it answers is: "How can I get paid here?" The answer
// is: give Konduyt the account your customers pay — a mobile number or a bank
// account — and you are receiving money. No provider integration is required.
//
// Two MODES, and they are different things:
//   * DIRECT    the merchant adds their own account. Low-friction default.
//               Konduyt may not be able to observe the rail, so those payments
//               are confirmed by the merchant, not claimed automatically.
//   * CONNECTED the merchant has a real provider integration, so Konduyt can
//               confirm automatically. An ENHANCEMENT on top of DIRECT, never
//               a prerequisite for it.
//
// The page renders EXACTLY what the API returns and derives nothing itself:
// status, action, `direct_available`, `connected_available`,
// `automatically_confirmed` and the destination field schema all come from
// GET /direct-connections/projects/:id/catalogue. Re-deriving any of those here
// would make the dashboard a second, drifting authority for facts the backend
// already owns.
//
// The honesty rule this page must never break: a method being LISTED is not a
// claim Konduyt can observe a payment to it. So the page shows the merchant's
// own account as the primary path, marks whether Konduyt can auto-confirm, and
// never turns a listing (or a lack of data) into a capability.

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

// Every required field in the method's own schema is filled. Uses the schema
// the API returned; if there is none, only the single fallback account field
// must be present. No field-shaped rule is hard-coded per brand here.
function destFieldsReady(inst, values) {
  const schema = inst.destination_schema;
  const fields = (schema && schema.fields)
    || [{ name: 'account_number', required: true }];
  return fields.every((f) => !f.required
    || String((values || {})[f.name] || '').trim());
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
  // The destination form is schema-driven: `destFields` holds the values keyed
  // by the method's own field names (e.g. sort_code/account_number), so a bank
  // in one market asks for different fields than a mobile rail -- without any
  // per-brand form hard-coded here.
  const [destFields, setDestFields] = useState({});
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
    setDestFields({});
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
      // Send the schema field map. The API accepts either a single `account`
      // (mapped to the primary field) or the full `fields` map for a
      // multi-field destination -- the SAME endpoint, because the fields are
      // the method's own, not a per-institution special case.
      const r = await fetch(
        `${API_BASE}/direct-connections/projects/${projectId}/connections`,
        { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ institution_id: inst.institution_id,
                                 fields: destFields }) });
      const d = await r.json();
      if (!r.ok) {
        onNotice?.(d.message || d.error || 'Could not add that payment account.');
        return;
      }
      setOpenForm(null);
      await load();
      onNotice?.(`Added ${inst.name} ${d.display_account}. ` +
        `Customers can now pay it; Konduyt will confirm those payments ${
          inst.automatically_confirmed ? 'automatically' : 'with you'}.`);
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
        ? `${inst.name} is verified. Customers can pay it, and Konduyt will confirm ${inst.automatically_confirmed ? 'automatically' : 'those payments with you'}.`
        : `${inst.name} is verified, but it is not offered at checkout yet.`);
    } finally {
      setBusyId(null);
    }
  };

  const setOffering = async (inst, connection, offerable) => {
    setBusyId(inst.institution_id);
    try {
      const r = await fetch(
        `${API_BASE}/direct-connections/projects/${projectId}/connections/${connection.id}/offering`,
        { method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ offerable }) });
      const d = await r.json();
      if (!r.ok) {
        onNotice?.(d.message || 'Could not change whether this account is offered.');
        return;
      }
      await load();
      onNotice?.(offerable
        ? `${inst.name} ${connection.display_account} can be offered to customers again.`
        : `${inst.name} ${connection.display_account} is no longer offered at checkout. It stays connected and verified.`);
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
            How you get paid in {country || 'your country'}: add the account
            your customers pay — a mobile number or a bank account. No provider
            integration needed. Konduyt never holds or moves your money.
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
          {/* The coverage line answers "how can I receive money here?", not
              "how many APIs exist". A method being LISTED (or a country having
              a bank list) is never dressed up as a capability: the tick is only
              green when the API says at least one method can actually receive.
              "Can receive" is `direct_available`, which is true for a rail the
              merchant can be paid into even when Konduyt cannot observe it. */}
          <div className={`coverage-banner ${
            catalogue.summary.direct_available > 0 ? 'coverage-ok' : 'coverage-warn'}`}>
            <span className="coverage-banner-icon">
              {catalogue.summary.direct_available > 0 ? '✓' : 'ℹ'}
            </span>
            <span>
              {catalogue.summary.total === 0 ? (
                <>Konduyt has no catalogued ways to receive money in
                  {' '}{catalogue.country} yet. That is a gap in our data, not a
                  statement that none exist.</>
              ) : catalogue.summary.direct_available > 0 ? (
                <>
                  You can receive money in {catalogue.country} today.{' '}
                  {catalogue.summary.direct_available} of {catalogue.summary.total}{' '}
                  ways work by adding your own account — no provider setup.{' '}
                  {catalogue.summary.executable > 0
                    ? `${catalogue.summary.executable} can also be confirmed automatically once connected.`
                    : ''}
                </>
              ) : (
                <>
                  Konduyt describes {catalogue.summary.total} ways to receive
                  money in {catalogue.country}, but none can accept a payment
                  yet. Being listed is not a claim that Konduyt can receive into
                  it.
                </>
              )}
              {catalogue.summary.connected > 0
                ? ` ${catalogue.summary.connected} already set up.` : ''}
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
                            {conn.state === 'CONNECTED'
                              ? 'Added · not verified yet'
                              : (conn.state === 'EXECUTABLE' || conn.state === 'DIRECT_READY')
                                ? (conn.offerable
                                  ? `Verified · live at checkout · ${
                                    conn.state === 'EXECUTABLE'
                                      ? 'confirmed automatically'
                                      : 'confirmed with you'}`
                                  : 'Verified · not offered to customers')
                                : 'Verified · not offered yet'}
                          </span>
                        </div>
                      ) : i.direct_available ? (
                        <>
                          <div className="dc-account">
                            Customers pay your {i.account_label || 'account'}
                            {' '}({i.account_format}). No provider setup needed.
                          </div>
                          <div className="dc-meta">
                            {i.connected_available
                              ? 'You can add the account now. Connecting a provider '
                                + 'integration is optional — it only lets Konduyt '
                                + 'confirm these payments automatically.'
                              : 'Konduyt cannot observe this rail, so you confirm '
                                + 'these payments yourself. It can still receive.'}
                          </div>
                        </>
                      ) : (
                        <div className="dc-account dc-unsupported-reason">
                          {i.limitation_note
                            || 'Konduyt has no way to receive money here yet.'}
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

                      {/* The confirmation mode is a backend fact, never inferred
                          here. Shown for any payable method -- including DIRECT
                          ones where it is MANUAL -- so a merchant is never told
                          "automatic" for a rail Konduyt cannot observe. */}
                      {conn && (conn.state === 'EXECUTABLE' || conn.state === 'DIRECT_READY')
                        && (
                        <div className="dc-meta">
                          Payments are confirmed {conn.state === 'EXECUTABLE'
                            ? 'automatically from the rail'
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
                          {/* Offering is a switch, separate from connecting: a
                              verified account can be taken out of checkout
                              without disconnecting it. Shown for any PAYABLE
                              connection the backend marks offerable-capable
                              (EXECUTABLE or DIRECT_READY) -- the API decides,
                              not this page. */}
                          {(conn.state === 'EXECUTABLE' || conn.state === 'DIRECT_READY') && (
                            <button type="button" className="dc-btn"
                              disabled={busy}
                              onClick={() => setOffering(i, conn, !conn.offerable)}>
                              {conn.offerable ? 'Stop offering' : 'Offer at checkout'}
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
                          Add payment account
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
                            {/* The fields come from the method's OWN destination
                                schema (i.destination_schema), so a Kenyan mobile
                                rail asks for a number and a UK bank asks for a
                                sort code + account number — with no per-brand
                                form hard-coded on this page. If the API sends no
                                schema, fall back to a single account field. */}
                            {((i.destination_schema && i.destination_schema.fields)
                              || [{ name: 'account_number',
                                    label: i.account_label || 'Account',
                                    required: true, type: 'text',
                                    help: i.account_format,
                                    example: i.account_example }]).map((f) => (
                              <div key={f.name} className="dc-field">
                                <label className="dc-label"
                                  htmlFor={`dest-${i.institution_id}-${f.name}`}>
                                  {f.label}{f.required ? '' : ' (optional)'}
                                </label>
                                <input id={`dest-${i.institution_id}-${f.name}`}
                                  className="dc-input" type="text"
                                  placeholder={f.example || ''}
                                  value={destFields[f.name] || ''}
                                  onChange={(e) => setDestFields((s) => ({
                                    ...s, [f.name]: e.target.value }))} />
                                {f.help && <p className="dc-hint">{f.help}</p>}
                              </div>
                            ))}
                            {i.destination_schema && i.destination_schema.note && (
                              <p className="dc-hint">{i.destination_schema.note}</p>
                            )}
                            <div className="dc-form-actions">
                              <button type="button" className="dc-btn dc-btn-primary"
                                disabled={busy || !destFieldsReady(i, destFields)}
                                onClick={() => connect(i)}>
                                {busy ? 'Adding…' : 'Add payment account'}
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
                                {req.credentials_handling && (
                                  <p className="dc-hint dc-credentials-handling">
                                    {req.credentials_handling}
                                  </p>
                                )}
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

      {/* The global landscape: every country, its mobile-money services and its
          banks. This is the same Direct Connections surface, not a separate
          destination — it uses the same page, heading and honesty rules. */}
      <div className="dc-detail-divider" />
      <DirectConnectionsCountries active={active} />
    </div>
  );
}
