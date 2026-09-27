'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';

// Direct Connections — the global landscape: what exists, where.
//
// This is one of the two things Direct Connections answers, and it is not a
// separate destination: it is the information that powers the connect surface.
// It answers the developer's first question — does Konduyt know about my bank
// or mobile-money account at all? — without ever answering a second question it
// cannot answer honestly: whether Konduyt can execute a payment to it.
//
// The honesty invariant is load-bearing here because a listing surface is
// exactly where "we know this bank" gets mistaken for "we can pay this bank".
// So:
//   * every panel repeats that appearing here is not a capability;
//   * a country we have no data for says "not in our data yet", never
//     "no banks" — absence of discovery is not evidence of absence;
//   * a country with institutions but no connector says plainly that none can
//     accept a payment;
//   * per-service status comes from the API's own execution_capability, and is
//     never inferred from the size of the list;
//   * there is no Connect button anywhere here. Connecting happens on the
//     connect surface, against a real project, and only for executable services.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

function authHeaders() {
  let token = null;
  try { token = localStorage.getItem('kdu_token'); } catch (e) {}
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// The six regions shown as chips. They are a reading aid, not a filter: every
// country in the canonical 197 still belongs to exactly one of them.
export const REGIONS = [
  'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania',
];

// The API groups the western hemisphere under the single `Americas` region with
// a `subregion`. The product shows North and South America separately, so map
// the subregion onto the chip. The Caribbean and Central America are subregions
// of the North American continent, so they belong under North America; that
// keeps North + South at 35, exactly the canonical figure.
export function regionOf(country) {
  if (country.region !== 'Americas') return country.region;
  if (country.subregion === 'South America') return 'South America';
  return 'North America';
}

// The flag is DERIVED from the canonical ISO code, never looked up in a hand
// maintained table: adding or fixing a country needs no UI edit, and the flag
// can never disagree with the code it is shown beside. Regional-indicator
// letters are the standard encoding; Kosovo (XK) is user-assigned and has no
// stand-alone flag encoding, so it renders as its 🇽🇰 indicator letters.
export function flagEmoji(code) {
  if (!/^[A-Za-z]{2}$/.test(code || '')) return '';
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function DataPill({ state }) {
  const known = state === 'discovered';
  return (
    <span className={`dc-pill ${known ? 'dc-pill-connect' : 'dc-pill-unsupported'}`}>
      {known ? 'Data available' : 'Not yet in our data'}
    </span>
  );
}

// A per-service state, from the API's own execution_capability. Absence from
// the connector list means no connector, which is NOT_SUPPORTED — never a
// fabricated Connect affordance.
function CapabilityPill({ capability }) {
  if (!capability) return null;
  const executable = capability === 'EXECUTABLE';
  return (
    <span className={`dc-pill ${executable ? 'dc-pill-connect' : 'dc-pill-unsupported'}`}>
      {executable ? 'Can accept a payment' : 'Not connectable yet'}
    </span>
  );
}

// One honest sentence about a country's state, from the API's own facts.
//
// Two different counts live in the payload and they are NOT interchangeable:
//   * `detail.banks` / `detail.mobile_money` are the rows this panel lists;
//   * `execution.executable` is how many the connector registry says Konduyt
//     can actually run today.
// Report the rows that are shown, and the executable count separately.
export function countryLine(country) {
  const ex = country.execution || {};
  const mm = (country.mobile_money || []).length;
  const banks = (country.banks || []).length;
  if (country.discovery_state !== 'discovered') {
    return 'We do not have institution data for this country yet. That is a gap '
      + 'in our data, not a claim that none exist.';
  }
  const described = [
    mm ? `${mm} mobile-money service${mm === 1 ? '' : 's'}` : null,
    banks ? `${banks} bank${banks === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' and ');
  if ((ex.executable || 0) > 0) {
    return `Konduyt lists ${described}, and ${ex.executable} can accept a `
      + 'payment today.';
  }
  return `Konduyt lists ${described}, but none can accept a payment yet — no `
    + 'live connector. Appearing here is not a claim Konduyt can execute a '
    + 'payment to it.';
}

export default function DirectConnectionsCountries({ active }) {
  const projectCountry = active?.merchant_country;

  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Africa');
  const [countries, setCountries] = useState(null);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [registry, setRegistry] = useState(null);
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
  // It is global: the region chip does not narrow it.
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
    setRegistry(null);
    setLoading(true);
    try {
      const [dr, ir] = await Promise.all([
        fetch(`${API_BASE}/direct-connections/countries/${code}`,
          { headers: authHeaders() }),
        fetch(`${API_BASE}/direct-connections/institutions?country=${code}`,
          { headers: authHeaders() }),
      ]);
      if (dr.ok) setDetail(await dr.json());
      if (ir.ok) {
        const d = await ir.json();
        const by = new Map();
        for (const i of d.institutions || []) {
          by.set(normalizeName(i.name), i.execution_capability);
        }
        setRegistry(by);
      }
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
      const r = regionOf(c);
      (by[r] = by[r] || []).push(c);
    }
    for (const r of Object.keys(by)) by[r].sort((a, b) => a.name.localeCompare(b.name));
    return by;
  }, [countries]);

  const capabilityFor = (name) => {
    if (!registry) return null;
    return registry.get(normalizeName(name)) || 'NOT_SUPPORTED';
  };

  const regionCountries = grouped[region] || [];
  const searching = Boolean(query.trim());

  const countryButton = (c) => (
    <button key={c.code} type="button" className="dc-dir-country"
      onClick={() => openCountry(c.code)}>
      <span className="dc-name">
        <span className="dc-flag" aria-hidden="true">{flagEmoji(c.code)}</span>
        {c.name}
      </span>
      <span className="dc-operator">
        {c.code}
        {c.discovery_state !== 'discovered' ? ' · not in our data yet' : ''}
      </span>
    </button>
  );

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

      {!searching && (
        <div className="dc-regions" role="tablist" aria-label="Region">
          {REGIONS.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={region === r}
              className={`dc-region${region === r ? ' dc-region-active' : ''}`}
              onClick={() => { setRegion(r); setSelected(null); setDetail(null); }}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="coverage-banner coverage-warn">
          <span className="coverage-banner-icon">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {searching && results && (
        <div className="dc-dir-results">
          <p className="dc-footnote">
            Searching every country and service, regardless of region.
          </p>

          {results.countries.length > 0 && (
            <div className="routing-section">
              <div className="routing-section-h">Countries</div>
              <div className="dc-dir-grid">
                {results.countries.map((c) => countryButton(c))}
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
                      <span className="dc-name">
                        <span className="dc-flag" aria-hidden="true">
                          {flagEmoji(m.country)}
                        </span>
                        {m.name}
                      </span>
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
                      <span className="dc-name">
                        <span className="dc-flag" aria-hidden="true">
                          {flagEmoji(b.country)}
                        </span>
                        {b.name}
                      </span>
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
              any institution data yet — absence of a match is a gap in our
              data, not proof the service does not exist.
            </p>
          )}
        </div>
      )}

      {!searching && selected && (
        <div className="dc-dir-detail">
          <div className="dc-dir-detail-head">
            <button type="button" className="dc-btn"
              onClick={() => { setSelected(null); setDetail(null); setRegistry(null); }}>
              ← {region}
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
                  <strong className="dc-detail-title">
                    <span className="dc-flag" aria-hidden="true">
                      {flagEmoji(detail.code)}
                    </span>
                    {detail.name}
                  </strong>{' '}
                  · <DataPill state={detail.discovery_state} />{' '}
                  {countryLine(detail)}
                </span>
              </div>

              {detail.mobile_money.length > 0 && (
                <div className="routing-section">
                  <div className="routing-section-h">Mobile money</div>
                  <p className="routing-section-sub">
                    Mobile-money accounts a customer could pay directly, if a
                    connector existed for them.
                  </p>
                  {detail.mobile_money.map((m, idx) => (
                    <div className="dc-row" key={`dmm-${idx}`}>
                      <div className="dc-row-main">
                        <div className="dc-row-title">
                          <span className="dc-name">{m.name}</span>
                          <CapabilityPill capability={capabilityFor(m.name)} />
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
                    {detail.banks.length} banks in our data
                    {detail.stats?.banks_raw > detail.stats?.banks_served
                      ? ` (from ${detail.stats.banks_raw} source rows; `
                        + 'non-bank and narrative entries were removed)'
                      : ''}
                    . Bank accounts a customer could transfer to, if a connector
                    existed for them.
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
              <p className="dc-footnote">
                Want to connect one of these? Go back to Direct Connections and
                connect an account you own — only services with a live connector
                can accept a payment today.
              </p>
            </>
          )}
        </div>
      )}

      {!searching && !selected && countries && (
        <>
          <div className="coverage-banner coverage-neutral">
            <span className="coverage-banner-icon">ℹ</span>
            <span>
              Konduyt knows {countries.total} countries
              {typeof countries.discovered === 'number'
                ? ` and has institution data for ${countries.discovered} of them`
                : ''}. Seeing a service here does not mean Konduyt can connect to
              it — only services with a live connector can accept a payment.
              {projectCountry ? ` Your project is set to ${projectCountry}.` : ''}
            </span>
          </div>

          <div className="dc-dir-browse">
            <div className="routing-section">
              <div className="routing-section-h">
                {region} · {regionCountries.length}
              </div>
              {loading && !countries ? (
                <p className="dc-muted">Loading countries…</p>
              ) : (
                <div className="dc-dir-grid">
                  {regionCountries.map((c) => countryButton(c))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
