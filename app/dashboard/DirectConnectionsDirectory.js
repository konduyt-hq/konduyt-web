'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Direct Connections — the global directory browser.
//
// This is the "what exists where" half of Direct Connections, separate from
// "connect an account I own" (DirectConnections.js). It answers the developer's
// first question — does Konduyt know about my bank or mobile-money account at
// all? — without ever answering a second question it cannot answer honestly:
// whether Konduyt can execute a payment to it.
//
// The honesty invariant is load-bearing here because a directory is exactly the
// surface where listing gets mistaken for capability. So:
//   * every panel repeats that a description is not a capability;
//   * a country we have not catalogued says "not catalogued yet", never
//     "no banks" — absence of discovery is not evidence of absence;
//   * a country with institutions but no connector says plainly that none can
//     accept a payment;
//   * execution counts come from the API, derived from the connector registry,
//     and are never inferred from catalogue size.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

function authHeaders() {
  let token = null;
  try { token = localStorage.getItem('kdu_token'); } catch (e) {}
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function DiscoveryPill({ state }) {
  const catalogued = state === 'discovered';
  return (
    <span className={`dc-pill ${catalogued ? 'dc-pill-connect' : 'dc-pill-unsupported'}`}>
      {catalogued ? 'Catalogued' : 'Not catalogued yet'}
    </span>
  );
}

// One honest sentence about a country's state, from the API's own facts.
//
// Two different counts live in the payload and they are NOT
// interchangeable:
//   * `detail.banks` / `detail.mobile_money` are the sourced directory rows
//     the panel below actually lists;
//   * `execution.listed` is the count of institutions in the connector
//     registry, which is empty for most countries. A connector that is wired
//     up implies a registry entry, so `listed` may exceed the directory rows,
//     but for the sourced world it is usually far smaller.
// Saying "describes {execution.listed} institutions here" therefore prints
// "0 institutions" directly above a panel listing 40 banks. Report what the
// directory actually contains, and, when a connector registry exists, report
// its own number separately.
function countryLine(country) {
  const ex = country.execution || {};
  const mm = (country.mobile_money || []).length;
  const banks = (country.banks || []).length;
  if (country.discovery_state !== 'discovered') {
    return 'Konduyt has not catalogued any institutions here yet. That is a gap '
      + 'in our data, not a claim that none exist.';
  }
  const described = [
    mm ? `${mm} mobile-money service${mm === 1 ? '' : 's'}` : null,
    banks ? `${banks} bank${banks === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' and ');
  const listed = ex.listed || 0;
  const registryLine = listed > 0
    ? ` ${listed} institution${listed === 1 ? '' : 's'} here ${listed === 1 ? 'is' : 'are'}`
      + ' in the connector registry; an entry there is not capability either.'
    : '';
  if ((ex.executable || 0) > 0) {
    return `Konduyt describes ${described}, and ${ex.executable} can accept a `
      + `payment today.${registryLine}`;
  }
  return `Konduyt describes ${described}, but none can accept a payment yet — `
    + 'no implemented connector. Being listed is not a claim Konduyt can '
    + `execute a payment to it.${registryLine}`;
}

export default function DirectConnectionsDirectory({ active }) {
  const country = active?.merchant_country;

  const [query, setQuery] = useState('');
  const [countries, setCountries] = useState(null);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCountries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/direct-connections/countries`,
        { headers: authHeaders() });
      if (!r.ok) { setError(`Could not load the country list (${r.status}).`); return; }
      setCountries(await r.json());
    } catch (e) {
      setError('Could not reach Konduyt. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCountries(); }, [loadCountries]);

  // Search is a server call so it spans bank names we do not ship to the
  // browser (thousands of rows); the browser is not a second source of truth.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `${API_BASE}/direct-connections/search?q=${encodeURIComponent(q)}`,
          { headers: authHeaders() });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setResults(d);
      } catch (e) { /* a failed search leaves the previous results in place */ }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const openCountry = useCallback(async (code) => {
    setSelected(code);
    setDetail(null);
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/direct-connections/countries/${code}`,
        { headers: authHeaders() });
      if (!r.ok) { setDetail(null); return; }
      setDetail(await r.json());
    } catch (e) {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const grouped = useMemo(() => {
    if (!countries?.countries) return {};
    const by = {};
    for (const c of countries.countries) {
      const region = c.region || 'Other';
      (by[region] = by[region] || []).push(c);
    }
    return by;
  }, [countries]);

  return (
    <div className="dc-dir">
      <div className="dc-dir-search">
        <input
          className="dc-input dc-dir-search-input"
          type="search"
          value={query}
          aria-label="Search countries, mobile money and banks"
          placeholder="Search a country, mobile-money service, or bank…"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="dc-btn" onClick={() => setQuery('')}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="coverage-banner coverage-warn">
          <span className="coverage-banner-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {query.trim() && results && (
        <div className="dc-dir-results">
          <p className="dc-footnote">{results.note}</p>

          {results.countries.length > 0 && (
            <div className="routing-section">
              <div className="routing-section-h">Countries</div>
              <div className="dc-dir-grid">
                {results.countries.map((c) => (
                  <button key={c.code} type="button" className="dc-dir-country"
                    onClick={() => openCountry(c.code)}>
                    <span className="dc-name">{c.name}</span>
                    <span className="dc-operator">{c.region} · {c.currency}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.mobile_money.length > 0 && (
            <div className="routing-section">
              <div className="routing-section-h">Mobile money</div>
              {results.mobile_money.map((m, idx) => (
                <div className="dc-row" key={`mm-${m.country}-${m.name}-${idx}`}>
                  <div className="dc-row-main">
                    <div className="dc-row-title">
                      <span className="dc-name">{m.name}</span>
                      <span className="dc-operator">{m.country}</span>
                    </div>
                    {m.operator && <div className="dc-operator">{m.operator}</div>}
                    {m.source_url && (
                      <a className="dc-hint" href={m.source_url} target="_blank"
                         rel="noopener noreferrer">Source</a>
                    )}
                  </div>
                  <div className="dc-row-actions">
                    <button type="button" className="dc-btn"
                      onClick={() => openCountry(m.country)}>
                      View {m.country}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.banks.length > 0 && (
            <div className="routing-section">
              <div className="routing-section-h">Banks</div>
              {results.banks.map((b, idx) => (
                <div className="dc-row" key={`bk-${b.country}-${b.name}-${idx}`}>
                  <div className="dc-row-main">
                    <div className="dc-row-title">
                      <span className="dc-name">{b.name}</span>
                      <span className="dc-operator">{b.country}</span>
                    </div>
                    {b.source_url && (
                      <a className="dc-hint" href={b.source_url} target="_blank"
                         rel="noopener noreferrer">Source</a>
                    )}
                  </div>
                  <div className="dc-row-actions">
                    <button type="button" className="dc-btn"
                      onClick={() => openCountry(b.country)}>
                      View {b.country}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.countries.length === 0 && results.mobile_money.length === 0
            && results.banks.length === 0 && (
            <p className="dc-muted">
              Nothing matches “{query}”. A country may still exist here without
              any catalogued institution — absence of a match is a gap in our
              data, not proof the bank does not exist.
            </p>
          )}
        </div>
      )}

      {!query.trim() && (
        <>
          {countries && (
            <div className="coverage-banner coverage-neutral">
              <span className="coverage-banner-icon">ℹ</span>
              <span>
                Konduyt knows {countries.total} countries
                {typeof countries.discovered === 'number'
                  ? `, and has catalogued institutions in ${countries.discovered}`
                  : ''}. Listing is a description, not a capability.
                {country ? ` Your project is set to ${country}.` : ''}
              </span>
            </div>
          )}

          {selected && (
            <div className="dc-dir-detail">
              <div className="dc-dir-detail-head">
                <button type="button" className="dc-btn"
                  onClick={() => { setSelected(null); setDetail(null); }}>
                  ← All countries
                </button>
              </div>
              {loading && !detail && <p className="dc-muted">Loading {selected}…</p>}
              {detail && (
                <>
                  <div className={`coverage-banner ${
                    (detail.execution?.executable || 0) > 0
                      ? 'coverage-ok' : 'coverage-warn'}`}>
                    <span className="coverage-banner-icon">
                      {(detail.execution?.executable || 0) > 0 ? '✓' : 'ℹ'}
                    </span>
                    <span>
                      <strong>{detail.name}</strong> ·{' '}
                      <DiscoveryPill state={detail.discovery_state} />
                      {' '}{countryLine(detail)}
                    </span>
                  </div>

                  {detail.mobile_money.length > 0 && (
                    <div className="routing-section">
                      <div className="routing-section-h">Mobile money</div>
                      <p className="routing-section-sub">
                        Mobile money accounts a customer could pay directly, if a
                        connector existed for them.
                      </p>
                      {detail.mobile_money.map((m, idx) => (
                        <div className="dc-row" key={`dmm-${idx}`}>
                          <div className="dc-row-main">
                            <div className="dc-row-title">
                              <span className="dc-name">{m.name}</span>
                            </div>
                            {m.operator && <div className="dc-operator">{m.operator}</div>}
                            {m.source_url && (
                              <a className="dc-hint" href={m.source_url}
                                 target="_blank" rel="noopener noreferrer">
                                Source
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {detail.banks.length > 0 && (
                    <div className="routing-section">
                      <div className="routing-section-h">Banks</div>
                      <p className="routing-section-sub">
                        {detail.banks.length} banks catalogued
                        {detail.stats?.banks_raw > detail.stats?.banks_served
                          ? ` (from ${detail.stats.banks_raw} source rows; `
                            + 'non-bank and narrative entries were removed)'
                          : ''}
                        . Bank accounts a customer could transfer to, if a
                        connector existed for them.
                      </p>
                      <div className="dc-dir-grid">
                        {detail.banks.map((b, idx) => (
                          <div className="dc-dir-bank" key={`db-${idx}`} title={b}>
                            {b}
                          </div>
                        ))}
                      </div>
                      {detail.bank_source_url && (
                        <a className="dc-hint" href={detail.bank_source_url}
                           target="_blank" rel="noopener noreferrer">
                          Source for this bank list
                        </a>
                      )}
                    </div>
                  )}

                  <p className="dc-footnote">{detail.note}</p>
                </>
              )}
            </div>
          )}

          {!selected && !loading && countries && (
            <div className="dc-dir-browse">
              {Object.keys(grouped).sort().map((region) => (
                <div className="routing-section" key={region}>
                  <div className="routing-section-h">{region}</div>
                  <div className="dc-dir-grid">
                    {grouped[region]
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((c) => (
                        <button key={c.code} type="button" className="dc-dir-country"
                          onClick={() => openCountry(c.code)}>
                          <span className="dc-name">{c.name}</span>
                          <span className="dc-operator">
                            {c.code}
                            {c.discovery_state !== 'discovered'
                              ? ' · not catalogued yet' : ''}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
