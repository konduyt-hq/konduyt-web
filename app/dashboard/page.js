'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import CheckoutModal from './CheckoutModal';
import Link from 'next/link';
import { LANGUAGES } from './snippets';
import { LANG_SNIPPETS } from './langsnippets';
import {
  RECURRING_SERVER_CODE, RECURRING_CLIENT_CODE,
  ONETIME_SERVER_CODE, ONETIME_CLIENT_CODE,
  FAILOVER_SERVER_CODE, FAILOVER_CLIENT_CODE,
  CROSSBORDER_SERVER_CODE, CROSSBORDER_CLIENT_CODE,
  PAYG_SERVER_CODE, PAYG_CLIENT_CODE,
  SCENARIO_SERVER_LANGUAGES,
} from './scenariocode';
import { LANG_ICONS, LANG_BRAND } from './langicons';
import { ENV_SETUP, ENV_STEPS } from './envsetup';
import { MERCHANT_COUNTRIES } from './countries';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

const TOKEN_KEY = 'kdu_token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}
function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
}
function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
}
function migrateLegacyToken() {
  try {
    const legacy = sessionStorage.getItem(TOKEN_KEY);
    if (legacy && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, legacy);
    if (legacy) sessionStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// A connector's required credential fields must all be filled before Connect.
function schemaComplete(connector, values) {
  const fields = connector?.credential_schema?.fields || [];
  return fields
    .filter((f) => f.required)
    .every((f) => (values[f.name] || '').toString().trim().length > 0);
}

// Monogram from a connector name (logos come later).
function monogram(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

// Shown only if the initial load genuinely takes a few seconds -- doesn't
// appear instantly (would be noise on a fast, warm load), and is honest about
// WHY it's slow rather than a silent spinner that just looks broken past ~3s.
function DashLoadingNote() {
  const [showNote, setShowNote] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowNote(true), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!showNote) return null;
  return (
    <p className="dash-loading-note">
      Waking up your workspace — this can take a few seconds after a quiet period.
    </p>
  );
}

export default function Dashboard() {
  const [status, setStatus] = useState('loading'); // loading | ready | unauth
  const [user, setUser] = useState(null);
  const [accountNotice, setAccountNotice] = useState(null);
  const [identities, setIdentities] = useState(null);
  const [identitiesLoading, setIdentitiesLoading] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  useEffect(() => {
    if (!avatarMenuOpen) return undefined;
    function onClickOutside(e) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [avatarMenuOpen]);
  const [settingsView, setSettingsView] = useState('main'); // main | delete
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [projects, setProjects] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [keys, setKeys] = useState(null);
  const [latestPayment, setLatestPayment] = useState(null);
  const [tab, setTab] = useState('checkout'); // money | connections | quickstart | checkout | messages | settings

  useEffect(() => {
    const TAB_TITLES = {
      money: 'Konduyt Payments',
      connections: 'Konduyt Payment Providers',
      quickstart: 'Konduyt Code Samples',
      checkout: 'Konduyt Preview Checkouts',
      messages: 'Konduyt Messages',
      settings: 'Konduyt Settings',
    };
    document.title = TAB_TITLES[tab] || 'Konduyt Dashboard';
  }, [tab]);
  const [msgs, setMsgs] = useState([]);
  const [msgUnread, setMsgUnread] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [msgFilter, setMsgFilter] = useState('all'); // all | unread | important
  const [msgCategory, setMsgCategory] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [langTab, setLangTab] = useState('js'); // selected language in the Languages section
  const [envOpen, setEnvOpen] = useState(false); // ".env setup" explainer expand
  const [providers, setProviders] = useState([]);
  const [capGroups, setCapGroups] = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [connections, setConnections] = useState([]);
  const [enabledMethods, setEnabledMethods] = useState([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [connectingId, setConnectingId] = useState(null);
  const [credValues, setCredValues] = useState({});
  const [connectError, setConnectError] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [methodGroups, setMethodGroups] = useState([]);
  const [methodsCatalog, setMethodsCatalog] = useState([]); // /methods — treatment + available_via
  const [methodSearch, setMethodSearch] = useState(''); // search by method (PayPal, Apple Pay, SEPA...)
  const [savingCountry, setSavingCountry] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false); // customer checkout preview
  const [previewShopperCountry, setPreviewShopperCountry] = useState('KE');
  const [previewEligibility, setPreviewEligibility] = useState(null);
  const [previewEligibilityLoading, setPreviewEligibilityLoading] = useState(false);
  const [previewRanked, setPreviewRanked] = useState(null);
  const [previewAmount, setPreviewAmount] = useState('1500.00'); // major units, editable
  const [previewCurrency, setPreviewCurrency] = useState('KES');
  // Routing intelligence panel
  const [routeMethod, setRouteMethod] = useState('mpesa');
  const [routeAmount, setRouteAmount] = useState('1500.00');
  const [routeCustomerCountry, setRouteCustomerCountry] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  // Konduyt Sentinel
  const [sentinelSources, setSentinelSources] = useState([]);
  const [sentinelChanges, setSentinelChanges] = useState([]);
  const [sentinelBusy, setSentinelBusy] = useState(false);
  const [sentinelTab, setSentinelTab] = useState('changes'); // 'changes' | 'sources'
  // Money tab
  const [moneyData, setMoneyData] = useState(null);
  // Real current month by default ('YYYY-MM'), navigable to past months.
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [moneyOrchestration, setMoneyOrchestration] = useState(null);
  const [payOrchestrationBusy, setPayOrchestrationBusy] = useState(false);
  const [payOrchestrationMsg, setPayOrchestrationMsg] = useState('');
  // Demo/preview mode — browser-only sample data so the visualizations can be
  // seen before real payments exist. NEVER written to the DB, never sent through
  // the real endpoints. Auto-ignored once real data exists.
  const [demoMode, setDemoMode] = useState(false);
  // Taxes tab
  const [taxReceived, setTaxReceived] = useState(null); // countries received-from, for the currently-open provider
  const [taxExpanded, setTaxExpanded] = useState(null); // which country row is open
  const [taxDetailOpen, setTaxDetailOpen] = useState(false); // false = money list; true = viewing the per-country tax detail
  const [accounts, setAccounts] = useState([]); // connected accounts (provider-first tab)
  const [testResult, setTestResult] = useState({}); // provider_id -> {ok, message, testing}
  // Continent-grouped provider directory (replaces the old category-drill-down browse)
  const [topProviders, setTopProviders] = useState([]);
  // Real, per-country eligible methods for CONNECTED providers, keyed by
  // provider_id -> { countryName: [methodName, ...] }. Built from
  // GET /v1/payment-methods/available (the real eligibility engine), never
  // from a flat provider-level capabilities list -- that data has no
  // country-to-method mapping at all, so showing "Kenya: X, Y" vs "UK: Z"
  // from it would mean fabricating which method applies to which country.
  const [connectedProviderMethods, setConnectedProviderMethods] = useState({});
  const [providersLoading, setProvidersLoading] = useState(true);
  const [connectingProviderId, setConnectingProviderId] = useState(null);
  const [expandedProvider, setExpandedProvider] = useState(null);
  const [snippetLang, setSnippetLang] = useState('curl');
  const [projectStatus, setProjectStatus] = useState(null);
  const [activity, setActivity] = useState([]);
  const [summary, setSummary] = useState(null);
  const [hasKeys, setHasKeys] = useState(false);
  const [lang, setLang] = useState('curl');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState('');
  const [codeViewerScenario, setCodeViewerScenario] = useState(null); // null | 'recurring' | 'onetime'
  const [codeViewerFile, setCodeViewerFile] = useState('server'); // 'server' | 'client'
  const [codeViewerLang, setCodeViewerLang] = useState('js');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef(null);

  useEffect(() => {
    if (!projectMenuOpen) return undefined;
    function onClickOutside(e) {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target)) {
        setProjectMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [projectMenuOpen]);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [projectDeleting, setProjectDeleting] = useState(false);
  const [projectDeleteConfirm, setProjectDeleteConfirm] = useState('');
  const [projectDeleteBusy, setProjectDeleteBusy] = useState(false);
  const [projectDeleteError, setProjectDeleteError] = useState('');
  const [rotating, setRotating] = useState(false);

  const active = projects.find((p) => p.id === activeId) || null;

  useEffect(() => {
    if (!user) return;
    setIdentitiesLoading(true);
    fetch(`${API_BASE}/me/identities`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : { identities: [] }))
      .then((data) => setIdentities(data.identities || []))
      .catch(() => setIdentities([]))
      .finally(() => setIdentitiesLoading(false));
  }, [user]);

  function linkProvider(provider) {
    window.location.href = `${API_BASE}/auth/${provider}?link=1`;
  }

  // ---- Initial auth + token capture ----
  useEffect(() => {
    migrateLegacyToken();
    let token = null;
    const hash = window.location.hash;
    if (hash.startsWith('#linked=')) {
      // Came back from a Settings -> "Link a provider" flow, not a sign-in.
      const params = new URLSearchParams(hash.slice(1));
      const ok = params.get('linked') === '1';
      const provider = params.get('provider') || 'that provider';
      setAccountNotice(
        ok
          ? { kind: 'ok', text: `Linked ${provider === 'google' ? 'Google' : 'GitHub'} to your account.` }
          : { kind: 'error', text: `Could not link ${provider}. It may already belong to a different account.` }
      );
      window.history.replaceState(null, '', window.location.pathname);
      token = getToken();
    } else if (hash.startsWith('#token=')) {
      const params = new URLSearchParams(hash.slice(1));
      token = params.get('token');
      if (token) setToken(token);
      if (params.get('provider_linked') === '1') {
        setAccountNotice({ kind: 'ok', text: 'This sign-in matched your existing account by email, so nothing new was created.' });
      } else if (params.get('private_email') === '1') {
        setAccountNotice({
          kind: 'info',
          text: 'GitHub gave us a private email for this sign-in. If you already have a Konduyt account under a different email, sign in with that method instead, then link GitHub from Settings.',
        });
      }
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      token = getToken();
    }
    if (!token) {
      setStatus('unauth');
      return;
    }
    fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('unauth');
        return r.json();
      })
      .then((u) => {
        setUser(u);
        return fetch(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((r) => r.json())
      .then((data) => {
        const list = data.projects || [];
        if (list.length) {
          setProjects(list);
          setActiveId(list[0].id);
          setStatus('ready');
        } else {
          // No project yet — create the first one so the user never lands on
          // an empty "No project" state.
          fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My First Project' }),
          })
            .then((r) => r.json())
            .then((proj) => {
              setProjects([proj]);
              setActiveId(proj.id);
              setStatus('ready');
            })
            .catch(() => setStatus('ready'));
        }
      })
      .catch(() => {
        clearToken();
        setStatus('unauth');
      });
  }, []);

  // ---- Load keys + connections + latest payment when active project changes ----
  const loadProjectData = useCallback((pid) => {
    if (!pid) return;
    fetch(`${API_BASE}/projects/${pid}/keys`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        const k = d.keys || null;
        setKeys(k);
        setHasKeys(!!(k && k.test));
      })
      .catch(() => {
        setKeys(null);
        setHasKeys(false);
      });
    fetch(`${API_BASE}/projects/${pid}/connections`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setConnections(d.connections || []); setConnectionsLoaded(true); })
      .catch(() => { setConnections([]); setConnectionsLoaded(true); });
    fetch(`${API_BASE}/projects/${pid}/capabilities`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setCapGroups(d.groups || []))
      .catch(() => setCapGroups([]));
    fetch(`${API_BASE}/projects/${pid}/payment-methods`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setPayMethods(d.methods || []); setMethodGroups(d.groups || []); })
      .catch(() => { setPayMethods([]); setMethodGroups([]); });
    fetch(`${API_BASE}/projects/${pid}/activity`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setActivity(d.activity || []))
      .catch(() => setActivity([]));
    fetch(`${API_BASE}/projects/${pid}/summary`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => setSummary(null));
    fetch(`${API_BASE}/projects/${pid}/status`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setProjectStatus(d))
      .catch(() => setProjectStatus(null));
    fetch(`${API_BASE}/projects/${pid}/connected-accounts`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setAccounts(d.accounts || []))
      .catch(() => setAccounts([]));
    fetch(`${API_BASE}/projects/${pid}/latest-payment`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setLatestPayment(d.payment || null))
      .catch(() => setLatestPayment(null));
    fetch(`${API_BASE}/projects/${pid}/enabled-methods`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setEnabledMethods(d.enabled || []))
      .catch(() => setEnabledMethods([]));
  }, []);

  // Load the provider catalog once.
  useEffect(() => {
    if (status !== 'ready') return;
    fetch(`${API_BASE}/connectors`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setProviders(d.connectors || []))
      .catch(() => setProviders([]));
  }, [status]);

  // Real providers ranked by genuine global coverage, deduplicated -- no
  // continent repetition. No project auth needed, this is catalog data.
  // Passes the project's real merchant_country (if set) so providers with a
  // real documented local presence surface first -- reordered, never hidden.
  // limit=24 covers the full real catalog (confirmed count), not an arbitrary
  // top-N -- this same fetch also powers the Money tab's docs_url lookup for
  // "View account" links, and a smaller limit was silently dropping real
  // providers whose catalog entry uses a single "Global" country placeholder
  // (e.g. PayPal) instead of an enumerated list, ranking them artificially
  // low under the country-count metric even though they're real and
  // commonly used.
  useEffect(() => {
    if (status !== 'ready') return;
    setProvidersLoading(true);
    const countryParam = active?.merchant_country ? `&merchant_country=${active.merchant_country}` : '';
    fetch(`${API_BASE}/connectors/top?limit=24${countryParam}`)
      .then((r) => r.json())
      .then((d) => {
        setTopProviders(d.providers || []);
        setProvidersLoading(false);
      })
      .catch(() => { setTopProviders([]); setProvidersLoading(false); });
  }, [status, active?.merchant_country]);

  // For each CONNECTED provider, fetch REAL per-country eligible methods (the
  // "Payment methods available to you, grouped by country" view). One fetch
  // per (provider, country) pair the connector catalog lists for that
  // provider -- capped so a broad provider (10 countries) doesn't fire an
  // unbounded number of requests. Countries with zero real eligible methods
  // are simply omitted, never shown with a fabricated checkmark.
  useEffect(() => {
    const pubKey = keys?.live?.publishable_key;
    if (!pubKey || !accounts.length || !topProviders.length) return;
    const MAX_COUNTRIES_PER_PROVIDER = 8;

    accounts.forEach((acct) => {
      const providerId = acct.provider_id;
      const catalogEntry = topProviders.find((p) => p.id === providerId);
      const countries = (catalogEntry?.countries || []).slice(0, MAX_COUNTRIES_PER_PROVIDER);
      if (!countries.length) return;

      Promise.all(countries.map((c) =>
        fetch(`${API_BASE}/v1/payment-methods/available?country=${c.code}`,
             { headers: { Authorization: `Bearer ${pubKey}` } })
          .then((r) => (r.ok ? r.json() : { methods: [] }))
          .then((d) => ({ countryName: c.name, methods: d.methods || [] }))
          .catch(() => ({ countryName: c.name, methods: [] }))
      )).then((results) => {
        const byCountry = {};
        results.forEach(({ countryName, methods }) => {
          const forThisProvider = methods
            .filter((m) => (m.eligible_providers || []).includes(providerId))
            .map((m) => m.method.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()));
          if (forThisProvider.length) byCountry[countryName] = forThisProvider;
        });
        setConnectedProviderMethods((prev) => ({ ...prev, [providerId]: byCountry }));
      });
    });
  }, [accounts, topProviders, keys]);

  // Real eligibility fetch effect for the checkout preview, GET /v1/payment-methods/available -- no
  // fabricated fallback data. Only runs when the preview is open and the
  // project has a real publishable key (the same client-safe auth the SDK
  // itself uses). Refetches whenever the simulated shopper's country changes,
  // so the preview genuinely demonstrates locality-driven eligibility.
  useEffect(() => {
    const pubKey = keys?.live?.publishable_key;
    if (!checkoutOpen || !pubKey || !previewShopperCountry) {
      setPreviewEligibility(null);
      return;
    }
    setPreviewEligibilityLoading(true);
    const amt = Math.max(0, Math.round((parseFloat(previewAmount) || 0) * 100));
    fetch(`${API_BASE}/v1/payment-methods/available?country=${previewShopperCountry}` +
         `&currency=${previewCurrency}&amount=${amt}`,
         { headers: { Authorization: `Bearer ${pubKey}` } })
      .then((r) => r.json())
      .then((d) => { setPreviewEligibility(d); setPreviewEligibilityLoading(false); })
      .catch(() => { setPreviewEligibility(null); setPreviewEligibilityLoading(false); });
  }, [checkoutOpen, keys, previewShopperCountry, previewCurrency, previewAmount]);

  // Real fee ranking (GET /v1/payment-methods/ranked) alongside plain
  // eligibility -- the actual "payment intelligence layer": what would this
  // genuinely cost, cheapest first, sourced from the real cost engine. A
  // method missing here (no real fee data) simply shows no fee badge below
  // -- never a fabricated number filling the gap.
  useEffect(() => {
    const pubKey = keys?.live?.publishable_key;
    if (!checkoutOpen || !pubKey || !previewShopperCountry) {
      setPreviewRanked(null);
      return;
    }
    const amt = Math.max(0, Math.round((parseFloat(previewAmount) || 0) * 100));
    if (amt <= 0) { setPreviewRanked(null); return; }
    fetch(`${API_BASE}/v1/payment-methods/ranked?country=${previewShopperCountry}` +
         `&currency=${previewCurrency}&amount=${amt}`,
         { headers: { Authorization: `Bearer ${pubKey}` } })
      .then((r) => (r.ok ? r.json() : { methods: [] }))
      .then((d) => setPreviewRanked(d.methods || []))
      .catch(() => setPreviewRanked([]));
  }, [checkoutOpen, keys, previewShopperCountry, previewCurrency, previewAmount]);

  // Payment-method graph, resolved for the active project's merchant country.
  useEffect(() => {
    if (status !== 'ready') return;
    const q = activeId ? `?project_id=${activeId}` : '';
    fetch(`${API_BASE}/methods${q}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setMethodsCatalog(d.methods || []))
      .catch(() => setMethodsCatalog([]));
  }, [status, activeId]);

  useEffect(() => {
    if (activeId) loadProjectData(activeId);
  }, [activeId, loadProjectData]);

  // Load routing intelligence when the Routing tab is active or inputs change.
  useEffect(() => {
    if (tab !== 'routing' || !activeId) return;
    const t = setTimeout(() => { loadRouting(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeId, routeMethod, routeAmount, routeCustomerCountry, previewCurrency]);

  // Load Sentinel data when its tab opens.
  useEffect(() => {
    if (tab === 'sentinel') loadSentinel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Money tab: load real ledger split for the selected month when opened,
  // and re-load whenever the month navigator changes.
  useEffect(() => {
    if (tab === 'money' && activeId) loadMoney(selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeId, selectedMonth]);

  // Tax detail (per-provider, entered from a Money row): fetch when opened.
  useEffect(() => {
    if (taxDetailOpen) { loadTaxReceived(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxDetailOpen]);

  // Messages: load the unread badge on mount, and the feed when the tab/filter changes.
  useEffect(() => { loadUnread(); checkAdmin(); /* eslint-disable-next-line */ }, []);

  async function checkAdmin() {
    try {
      const r = await fetch(`${API_BASE}/admin/whoami`, { headers: authHeaders() });
      if (r.ok) { const d = await r.json(); setIsAdmin(!!d.is_admin); }
    } catch (e) {}
  }
  useEffect(() => {
    if (tab === 'messages') loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, msgFilter, msgCategory]);

  async function loadUnread() {
    try {
      const r = await fetch(`${API_BASE}/v1/messages/unread_count`, { headers: authHeaders() });
      if (r.ok) { const d = await r.json(); setMsgUnread(d.unread || 0); }
    } catch (e) {}
  }

  async function loadMessages() {
    setMsgLoading(true);
    try {
      const params = new URLSearchParams({ filter: msgFilter });
      if (msgCategory) params.set('category', msgCategory);
      const r = await fetch(`${API_BASE}/v1/messages?${params}`, { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        setMsgs(d.messages || []);
        setMsgUnread(d.unread || 0);
      }
    } catch (e) {} finally { setMsgLoading(false); }
  }

  async function markMessageRead(id) {
    try {
      const r = await fetch(`${API_BASE}/v1/messages/${id}/read`, { method: 'POST', headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        setMsgUnread(d.unread || 0);
        setMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
      }
    } catch (e) {}
  }

  async function dismissMessage(id) {
    try {
      const r = await fetch(`${API_BASE}/v1/messages/${id}/dismiss`, { method: 'POST', headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        setMsgUnread(d.unread || 0);
        setMsgs((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (e) {}
  }

  // Landing tab: a NEW user (no provider connected yet) starts on Integrations —
  // the first meaningful action. A returning user (has at least one connection)
  // lands on Money. Runs once per session, after the initial data has loaded, so
  // it never fights the user's own tab clicks.
  const [landingChosen, setLandingChosen] = useState(false);
  useEffect(() => {
    if (landingChosen) return;
    if (status !== 'ready' || keys === null || !activeId) return;
    // Wait until connections for the active project have actually loaded.
    if (connectionsLoaded) {
      setTab(connections.length > 0 ? 'money' : 'integrations');
      setLandingChosen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, keys, activeId, connectionsLoaded, connections, landingChosen]);

  // Safety net: the effect above also waits on keys !== null. If that fetch
  // fails outright (network error, not just "no keys yet"), keys stays null
  // forever and landingChosen would never resolve -- which, combined with the
  // loading gate below, would spin forever instead of just keeping the
  // pre-fix default tab like before. This guarantees it can't hang: after 4s
  // with no resolution, proceed anyway with whatever tab is already set.
  useEffect(() => {
    if (landingChosen || status !== 'ready' || !activeId) return;
    const t = setTimeout(() => setLandingChosen(true), 4000);
    return () => clearTimeout(t);
  }, [landingChosen, status, activeId]);

  function logout() {
    clearToken();
    window.location.href = '/';
  }

  async function deleteAccount() {
    setDeleteError('');
    const confirmEmail = (user?.email || '').trim().toLowerCase();
    if (deleteConfirm.trim().toLowerCase() !== confirmEmail || !confirmEmail) {
      setDeleteError(`Type your account email exactly: ${confirmEmail}`);
      return;
    }
    setDeleteBusy(true);
    try {
      const res = await fetch(`${API_BASE}/account`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        clearToken();
        window.location.href = '/?deleted=1';
      } else {
        const d = await res.json().catch(() => ({}));
        setDeleteError(d.detail || 'Could not delete the account. Please try again.');
      }
    } catch (e) {
      setDeleteError('Could not reach the server. Please try again.');
    } finally {
      setDeleteBusy(false);
    }
  }

  // Connect a provider from the continent-grouped provider grid. Does NOT
  // force-enable any specific method -- the developer enables methods
  // separately (or they become eligible automatically), then can add a
  // fallback provider for a method that already has a primary connected.
  async function connectProviderCard(providerId, schemaFields) {
    setConnectError('');
    setConnectBusy(true);
    try {
      const credentials = {};
      (schemaFields || []).forEach((f) => {
        let val = credValues[f.name];
        if ((val === undefined || val === '') && f.type === 'select' && !f.required) {
          val = (f.options || [])[0] || '';
        }
        if (val !== undefined && val !== '') {
          credentials[f.name] = typeof val === 'string' ? val.trim() : val;
        }
      });
      Object.entries(credValues).forEach(([k, v]) => {
        if (!(k in credentials) && v !== undefined && v !== '') {
          credentials[k] = typeof v === 'string' ? v.trim() : v;
        }
      });
      const r = await fetch(`${API_BASE}/projects/${activeId}/connections`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, credentials }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const msg = typeof err.detail === 'string' ? err.detail
          : (err.detail?.message || 'Could not connect. Check your credentials.');
        setConnectError(msg);
        setConnectBusy(false);
        return;
      }
      setConnectingProviderId(null);
      setCredValues({});
      loadProjectData(activeId);
    } catch (e) {
      setConnectError('Network error. Please try again.');
    }
    setConnectBusy(false);
  }

  const [fallbackBusy, setFallbackBusy] = useState({}); // method_id -> boolean
  const [fallbackError, setFallbackError] = useState({}); // method_id -> message

  async function addFallback(methodId, providerId) {
    setFallbackBusy((prev) => ({ ...prev, [methodId]: true }));
    setFallbackError((prev) => ({ ...prev, [methodId]: '' }));
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/enabled-methods/${methodId}/fallback`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setFallbackError((prev) => ({ ...prev, [methodId]: err.detail || 'Could not add fallback.' }));
      } else {
        loadProjectData(activeId);
      }
    } catch (e) {
      setFallbackError((prev) => ({ ...prev, [methodId]: 'Network error. Please try again.' }));
    }
    setFallbackBusy((prev) => ({ ...prev, [methodId]: false }));
  }

  async function removeFallback(methodId, providerId) {
    await fetch(`${API_BASE}/projects/${activeId}/enabled-methods/${methodId}/fallback/${providerId}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    loadProjectData(activeId);
  }

  async function testConnection(providerId) {
    setTestResult((prev) => ({ ...prev, [providerId]: { testing: true } }));
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/connected-accounts/${providerId}/test`, {
        method: 'POST', headers: authHeaders(),
      });
      const d = await r.json();
      setTestResult((prev) => ({ ...prev, [providerId]: { testing: false, ok: d.ok, message: d.message } }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [providerId]: { testing: false, ok: false, message: 'Test failed to run.' } }));
    }
  }

  function disconnectAccount(providerId) {
    if (!confirm(`Disconnect ${providerId}? Any methods it powers will stop working.`)) return;
    fetch(`${API_BASE}/projects/${activeId}/connections/${providerId}`, {
      method: 'DELETE', headers: authHeaders(),
    }).then(() => loadProjectData(activeId));
  }

  async function revokeSecret() {
    if (!confirm('Revoke this secret key? It stops working immediately and is replaced by a new one. Any app using the old key must be updated.')) return;
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/keys/rotate`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'live' }),
      });
      if (!r.ok) { alert('Could not revoke the key. Try again.'); return; }
      const kr = await fetch(`${API_BASE}/projects/${activeId}/keys`, { headers: authHeaders() });
      const kd = await kr.json();
      setKeys(kd.keys || null);
      setShowSecret(true);
    } catch (e) { alert('Could not revoke the key. Try again.'); }
  }

  // Kenya-centric sample data for preview only — obviously illustrative, never
  // persisted. Used solely to show how Money / Taxes visualizations render.
  const DEMO_MONEY = {
    has_data: true,
    total_completed_volume: 4820000, // KES 48,200.00
    total_transaction_count: 214,
    providers: [
      { provider: 'paystack', currency: 'KES', transaction_count: 142, completed_count: 138, completed_volume: 2760000, volume_share: 57.3 },
      { provider: 'flutterwave', currency: 'KES', transaction_count: 48, completed_count: 45, completed_volume: 1210000, volume_share: 25.1 },
      { provider: 'paypal', currency: 'KES', transaction_count: 16, completed_count: 15, completed_volume: 620000, volume_share: 12.9 },
      { provider: 'stripe', currency: 'KES', transaction_count: 8, completed_count: 7, completed_volume: 230000, volume_share: 4.7 },
    ],
  };
  // Preview only -- payment method isn't tracked per-transaction in the real
  // schema yet, so there's no real endpoint behind this. Same total volume as
  // DEMO_MONEY above so both toggles look internally consistent. One currency
  // throughout (matches the provider list above) -- a real merchant's
  // received-money list wouldn't jump between currencies row to row.
  // PayPal is deliberately NOT repeated here as a method: PayPal-as-a-payment-
  // method and PayPal-the-provider are the same thing, unlike M-Pesa (a real,
  // distinct method offered BY Paystack) -- listing it twice was a real
  // demo-data mistake, not two different things.
  const DEMO_MONEY_BY_METHOD = {
    has_data: true,
    methods: [
      { method: 'M-Pesa', provider: 'paystack', currency: 'KES', transaction_count: 96, completed_volume: 1980000, volume_share: 41.1 },
      { method: 'Card', provider: 'paystack', currency: 'KES', transaction_count: 58, completed_volume: 1340000, volume_share: 27.8 },
      { method: 'Airtel Money', provider: 'flutterwave', currency: 'KES', transaction_count: 16, completed_volume: 620000, volume_share: 12.9 },
      { method: 'Bank Transfer', provider: 'flutterwave', currency: 'KES', transaction_count: 30, completed_volume: 590000, volume_share: 12.2 },
      { method: 'T-Kash', provider: 'paystack', currency: 'KES', transaction_count: 14, completed_volume: 290000, volume_share: 6.0 },
    ],
  };
  // What the tabs actually render: real data, unless demo is on AND there's no
  // real data (demo can never mask real numbers).
  const moneyView = (demoMode && (!moneyData || !moneyData.has_data)) ? DEMO_MONEY : moneyData;
  const taxReceivedView = taxReceived;

  async function loadMoney(period) {
    if (!activeId) return;
    try {
      const q = period ? `?period=${period}` : '';
      const [byProvider, orch] = await Promise.all([
        fetch(`${API_BASE}/projects/${activeId}/money/by-provider${q}`, { headers: authHeaders() }).then((r) => r.json()),
        fetch(`${API_BASE}/projects/${activeId}/orchestration${q}`, { headers: authHeaders() }).then((r) => r.json()),
      ]);
      setMoneyData(byProvider);
      setMoneyOrchestration(orch);
    } catch (e) { setMoneyData(null); setMoneyOrchestration(null); }
  }

  // Real, dogfooded payment of the accrued orchestration fee -- Konduyt's own
  // checkout, same SDK a merchant's own customers would go through. Always
  // pay-as-you-go: no month-end gate, matches the earlier decision that
  // disabling this until some arbitrary date would add friction with no
  // real benefit.
  async function payOrchestrationFee() {
    if (!activeId) return;
    setPayOrchestrationBusy(true); setPayOrchestrationMsg('');
    try {
      const token = localStorage.getItem('kdu_token');
      const r = await fetch(`${API_BASE}/billing/checkout_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ purpose: 'orchestration', project_id: activeId }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.detail && d.detail.error === 'nothing_owed') {
          setPayOrchestrationMsg('Nothing owed yet this month.');
        } else if (r.status === 503) {
          setPayOrchestrationMsg('Billing isn\u2019t set up yet. Please try again shortly.');
        } else {
          setPayOrchestrationMsg((d.detail && (d.detail.message || d.detail)) || 'Could not start payment.');
        }
        setPayOrchestrationBusy(false);
        return;
      }
      if (typeof window !== 'undefined' && !window.Konduyt) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://konduyt.dev/konduyt.js';
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      window.Konduyt.checkout({
        sessionId: d.session_id,
        onSuccess: function () {
          setPayOrchestrationMsg('Paid. Refreshing your balance\u2026');
          setPayOrchestrationBusy(false);
          loadMoney(selectedMonth);
        },
        onClose: function () { setPayOrchestrationBusy(false); },
      });
    } catch (e) {
      setPayOrchestrationMsg('Could not reach billing. Please try again.');
      setPayOrchestrationBusy(false);
    }
  }

  async function loadTaxReceived(provider) {
    if (!activeId) return;
    try {
      const q = provider ? `?provider=${provider}` : '';
      const r = await fetch(`${API_BASE}/projects/${activeId}/taxes/received${q}`, { headers: authHeaders() });
      setTaxReceived(await r.json());
    } catch (e) { setTaxReceived(null); }
  }

  async function loadSentinel() {
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`${API_BASE}/sentinel/sources`, { headers: authHeaders() }),
        fetch(`${API_BASE}/sentinel/changes`, { headers: authHeaders() }),
      ]);
      const s = await sRes.json();
      const c = await cRes.json();
      setSentinelSources(s.sources || []);
      setSentinelChanges(c.changes || []);
    } catch (e) { /* leave as-is */ }
  }

  async function runSentinel() {
    setSentinelBusy(true);
    try {
      await fetch(`${API_BASE}/sentinel/run?force=true`, { method: 'POST', headers: authHeaders() });
      await loadSentinel();
    } catch (e) { /* ignore */ }
    setSentinelBusy(false);
  }

  async function reviewChange(changeId, statusVal) {
    try {
      await fetch(`${API_BASE}/sentinel/changes/${changeId}/review`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusVal }),
      });
      setSentinelChanges((cs) => cs.map((c) => c.id === changeId ? { ...c, review_status: statusVal } : c));
    } catch (e) { /* ignore */ }
  }

  async function testSentinelAlert(monitorType) {
    setSentinelBusy(true);
    try {
      const r = await fetch(`${API_BASE}/sentinel/test-alert?type=${monitorType}`, {
        method: 'POST', headers: authHeaders() });
      const d = await r.json();
      alert(d.sent ? `Test ${monitorType} alert sent — check Telegram.` : `Not sent: ${d.note}`);
    } catch (e) { alert('Could not reach Sentinel.'); }
    setSentinelBusy(false);
  }

  async function loadRouting() {
    if (!activeId) return;
    setRouteLoading(true);
    try {
      const amt = Math.max(0, Math.round((parseFloat(routeAmount) || 0) * 100));
      const cc = routeCustomerCountry ? `&customer_country=${routeCustomerCountry}` : '';
      const r = await fetch(
        `${API_BASE}/projects/${activeId}/routing?method=${routeMethod}&amount=${amt}&currency=${previewCurrency}${cc}`,
        { headers: authHeaders() });
      const d = await r.json();
      setRouteData(d);
    } catch (e) {
      setRouteData(null);
    }
    setRouteLoading(false);
  }

  async function saveMerchantCountry(country) {
    if (!activeId) return;
    setSavingCountry(true);
    try {
      const r = await fetch(`${API_BASE}/projects/${activeId}/country`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_country: country || null }),
      });
      if (r.ok) {
        const proj = await r.json();
        setProjects((ps) => ps.map((p) => (p.id === proj.id ? { ...p, ...proj } : p)));
        // Re-resolve the method graph for the new country.
        const mq = await fetch(`${API_BASE}/methods?project_id=${activeId}`, { headers: authHeaders() });
        const md = await mq.json();
        setMethodsCatalog(md.methods || []);
      }
    } catch (e) { /* keep silent; selector reflects last saved */ }
    setSavingCountry(false);
  }

  function copyToClipboard(text, label) {
    try {
      navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    } catch (e) {}
  }

  function disconnectProvider(providerId) {
    if (!confirm('Disconnect this provider?')) return;
    fetch(`${API_BASE}/projects/${activeId}/connections/${providerId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(() => { loadProjectData(activeId); });
  }

  async function createProject() {
    setProjectMenuOpen(false);
    const r = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled Project' }),
    });
    const p = await r.json();
    const rl = await fetch(`${API_BASE}/projects`, { headers: authHeaders() });
    const data = await rl.json();
    const newProjects = data.projects || [];

    // Real pricing model: 3 free projects, $10/mo per project beyond that
    // once a project is actually live. The project is still created either
    // way (a brand new project isn't live yet, so nothing is actually owed
    // the instant it's created) -- but the developer is sent straight to
    // pricing right now, not just shown a dismissible note, since that's
    // what was actually asked for.
    if (newProjects.length > 3) {
      window.location.href = '/pricing/';
      return;
    }

    setProjects(newProjects);
    setActiveId(p.id);
  }

  async function saveRename() {
    const name = renameVal.trim();
    if (!name) {
      setRenaming(false);
      return;
    }
    await fetch(`${API_BASE}/projects/${activeId}`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setProjects((ps) => ps.map((p) => (p.id === activeId ? { ...p, name } : p)));
    setRenaming(false);
  }

  async function deleteProject() {
    setProjectDeleteError('');
    const confirmName = (active?.name || '').trim();
    if (projectDeleteConfirm.trim() !== confirmName || !confirmName) {
      setProjectDeleteError(`Type the project name exactly: ${confirmName}`);
      return;
    }
    setProjectDeleteBusy(true);
    try {
      const res = await fetch(`${API_BASE}/projects/${activeId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        const remaining = projects.filter((p) => p.id !== activeId);
        setProjects(remaining);
        setActiveId(remaining[0]?.id || null);
        setProjectDeleting(false);
        setProjectDeleteConfirm('');
      } else {
        const d = await res.json().catch(() => ({}));
        setProjectDeleteError(d.detail || 'Could not delete the project. Please try again.');
      }
    } catch (e) {
      setProjectDeleteError('Could not reach the server. Please try again.');
    } finally {
      setProjectDeleteBusy(false);
    }
  }

  async function rotateTestKey() {
    if (!confirm('Roll your test secret key? The old key stops working immediately.')) return;
    setRotating(true);
    await fetch(`${API_BASE}/projects/${activeId}/keys/rotate`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'test' }),
    });
    loadProjectData(activeId);
    setRotating(false);
    setShowSecret(true);
  }

  function copy(text, label) {
    try {
      navigator.clipboard.writeText(text);
    } catch (e) {}
    setCopied(label);
    setTimeout(() => setCopied(''), 1500);
  }

  // ---- Render states ----
  // Keep showing the loading state until the correct landing tab (Money for
  // a returning user, Integrations for a new one) has actually been decided
  // -- not just until auth/projects are ready. Fixes a real glitch: without
  // this, every returning user briefly saw Integrations (tab's hardcoded
  // initial value) before the tab visibly jumped to Money once connections
  // finished loading a moment later. Safe from ever hanging: activeId is
  // always set by the time status is 'ready' (even a brand-new user gets an
  // auto-created project first), and connectionsLoaded is set to true on
  // both success AND failure of that fetch, so landingChosen always resolves.
  if (status === 'loading' || (status === 'ready' && activeId && !landingChosen)) {
    return (
      <div className="dash-root">
        <div className="dash-center">
          <div className="dash-spinner" />
          <DashLoadingNote />
        </div>
      </div>
    );
  }
  if (status === 'unauth') {
    return (
      <div className="dash-root">
        <div className="dash-center">
          <div className="dash-card" style={{ textAlign: 'center', maxWidth: 420 }}>
            <h1 className="dash-title">You&apos;re not signed in</h1>
            <p className="dash-sub">Sign in to open your console.</p>
            <Link href="/signin/" className="dash-btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const testKeys = keys?.test || null;
  const liveKeys = keys?.live || null;
  const kycVerified = active?.kyc_status === 'verified';
  const secretForSnippet = testKeys?.secret || 'kdu_test_secret_...';
  const apiForSnippet = API_BASE;

  const currentLang = LANGUAGES.find((l) => l.id === lang) || LANGUAGES[0];
  const filledCode = currentLang.code
    .replaceAll('{{SECRET}}', secretForSnippet)
    .replaceAll('{{API}}', apiForSnippet);

  return (
    <div className="dash-root">
      {/* ===== Top bar ===== */}
      <header className="con-topbar">
        <div className="con-topbar-left">
          <Link href="/dashboard/" className="con-logo">Konduyt</Link>

          {/* Project switcher */}
          <div className="con-proj" ref={projectMenuRef}>
            <button
              className="con-proj-btn"
              onClick={() => setProjectMenuOpen((o) => !o)}
              type="button"
            >
              {active ? active.name : 'No project'} <span className="con-caret">▾</span>
            </button>
            {projectMenuOpen && (
              <div className="con-proj-menu">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    className={p.id === activeId ? 'con-proj-item active' : 'con-proj-item'}
                    onClick={() => {
                      setActiveId(p.id);
                      setProjectMenuOpen(false);
                    }}
                    type="button"
                  >
                    <span className="con-proj-item-check">{p.id === activeId ? '✓' : ''}</span>
                    <span>{p.name}</span>
                  </button>
                ))}
                <div className="con-proj-divider" />
                <button className="con-proj-item con-proj-new" onClick={createProject} type="button">
                  + New Project
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="con-topbar-right">
          <button
            className={tab === 'messages' ? 'con-icon-btn active' : 'con-icon-btn'}
            onClick={() => setTab('messages')}
            type="button"
            title="Messages"
            aria-label="Messages"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {msgUnread > 0 && (
              <span className="con-icon-badge">{msgUnread > 99 ? '99+' : msgUnread}</span>
            )}
          </button>
          <button
            className={tab === 'settings' ? 'con-icon-btn active' : 'con-icon-btn'}
            onClick={() => setTab('settings')}
            type="button"
            title="Settings"
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <div className="con-avatar-wrap" ref={avatarMenuRef}>
            <button
              className="con-avatar"
              onClick={() => setAvatarMenuOpen((v) => !v)}
              type="button"
              title={user?.name || user?.email || 'Account'}
              aria-haspopup="menu"
              aria-expanded={avatarMenuOpen}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="con-avatar-img" referrerPolicy="no-referrer" />
              ) : (
                (user?.name || user?.email || '?').slice(0, 1).toUpperCase()
              )}
            </button>
            {avatarMenuOpen && (
              <div className="con-avatar-menu" role="menu">
                <div className="con-avatar-menu-who">
                  <div className="con-avatar-menu-name">{user?.name || 'Account'}</div>
                  <div className="con-avatar-menu-email">{user?.email}</div>
                </div>
                <button
                  className="con-avatar-menu-item"
                  type="button"
                  role="menuitem"
                  onClick={() => { setTab('settings'); setAvatarMenuOpen(false); }}
                >
                  Settings
                </button>
                <button
                  className="con-avatar-menu-item con-avatar-menu-danger"
                  type="button"
                  role="menuitem"
                  onClick={logout}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {accountNotice && (
        <div className={`con-notice con-notice-${accountNotice.kind}`}>
          <span>{accountNotice.text}</span>
          <button
            className="con-notice-close"
            type="button"
            onClick={() => setAccountNotice(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ===== Tabs ===== */}
      <nav className="con-tabs">
        {[
          ['quickstart', 'Code Samples'],
          ['connections', 'Payment Providers'],
          ['money', 'Payments'],
          ['checkout', 'Preview Checkouts'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'con-tab active' : 'con-tab'}
            onClick={() => setTab(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ===== Body ===== */}
      <main className="con-body">
        <>
            {tab === 'connections' && (
              <div className="mpesa-page">
                <div className="con-home-head con-home-head-row">
                  <div>
                    <h1 className="con-h1">Payment methods</h1>
                    <p className="con-sub">
                      Choose what your customers can pay with. Konduyt connects the provider behind each one.
                    </p>
                  </div>
                </div>

                {/* Real method routing: each enabled method's primary
                    provider, and any configured fallback -- Konduyt tries
                    the primary first, and only automatically tries a
                    fallback on a genuinely SAFE failure (never on an
                    ambiguous one). See the Preview Checkouts tab's "Failed
                    payment + rerouting" scenario to see this live. */}
                {enabledMethods.length > 0 && (() => {
                  const prettyName = (id) => (id || '').replace(/_/g, ' ')
                    .replace(/\b\w/g, (ch) => ch.toUpperCase());
                  const byMethod = {};
                  enabledMethods.forEach((row) => {
                    (byMethod[row.method_id] = byMethod[row.method_id] || []).push(row);
                  });
                  Object.values(byMethod).forEach((rows) => rows.sort((a, b) => a.priority - b.priority));

                  return (
                    <div className="routing-section">
                      <div className="routing-section-h">Method routing</div>
                      <p className="routing-section-sub">
                        The order Konduyt tries providers for each method. A fallback is only tried if the
                        one before it fails safely -- never on an ambiguous result.
                      </p>
                      {Object.entries(byMethod).map(([methodId, rows]) => {
                        const usedProviderIds = rows.map((r) => r.provider_id);
                        const availableToAdd = connections.filter(
                          (c) => c.status === 'connected' && !usedProviderIds.includes(c.provider_id)
                        );
                        return (
                          <div className="routing-method" key={methodId}>
                            <div className="routing-method-name">{prettyName(methodId)}</div>
                            <div className="routing-chain">
                              {rows.map((r, i) => (
                                <div className="routing-step" key={r.provider_id}>
                                  <span className="routing-step-label">
                                    {i === 0 ? 'Primary' : `Fallback ${i}`}
                                  </span>
                                  <span className="routing-step-provider">{prettyName(r.provider_id)}</span>
                                  {i > 0 && (
                                    <button type="button" className="routing-step-remove"
                                      onClick={() => removeFallback(methodId, r.provider_id)}
                                      aria-label={`Remove ${r.provider_id} as fallback`}>
                                      ✕
                                    </button>
                                  )}
                                  {i < rows.length - 1 && <span className="routing-step-arrow">→</span>}
                                </div>
                              ))}
                              {availableToAdd.length > 0 && (
                                <select className="routing-add-select"
                                  value=""
                                  disabled={!!fallbackBusy[methodId]}
                                  onChange={(e) => { if (e.target.value) addFallback(methodId, e.target.value); }}>
                                  <option value="">+ Add fallback…</option>
                                  {availableToAdd.map((c) => (
                                    <option key={c.provider_id} value={c.provider_id}>
                                      {prettyName(c.provider_id)}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {fallbackError[methodId] && (
                              <p className="routing-error">{fallbackError[methodId]}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div className="method-search">
                  <svg className="method-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    className="method-search-input"
                    type="text"
                    placeholder="Search a payment method — PayPal, Apple Pay, M-Pesa, SEPA, UPI…"
                    value={methodSearch}
                    onChange={(e) => setMethodSearch(e.target.value)}
                  />
                  {methodSearch && (
                    <button className="method-search-clear" type="button" onClick={() => setMethodSearch('')}>✕</button>
                  )}
                </div>

                {/* Cannot receive money without a connected provider */}
                {projectStatus && !projectStatus.has_connection && !methodSearch && (
                  <div className="receive-warn">
                    <span className="receive-warn-icon">⚠</span>
                    <div>
                      <strong>You cannot receive money yet.</strong> Connect a payment provider below to give
                      payments somewhere to settle. Until you do, any payment your app attempts will fail.
                    </div>
                  </div>
                )}

                {/* Provider directory: flat, deduplicated, ranked by real
                    global coverage (country count, then method count) --
                    every provider appears exactly once, never repeated
                    across regions. Every card is a real connector from
                    app/connectors/registry.py -- capabilities, countries, and
                    credential fields all come from the live catalog. */}
                {(() => {
                  // Deterministic, distinct color per provider for a small
                  // monogram badge -- NOT claimed as each company's real
                  // brand color (getting that wrong for even one of 24 real
                  // companies would misrepresent their actual identity).
                  // Just a consistent, pleasant visual anchor next to each
                  // name, hashed from the provider id so it's stable across
                  // reloads and re-sorts, not randomized per render.
                  // Real, multi-source-verified official brand colors --
                  // only for providers actually checked and confirmed (not
                  // guessed from memory). Stripe #635BFF, PayPal #003087,
                  // Adyen #0abf53 -- each confirmed against several
                  // independent sources before being used here. Every other
                  // provider intentionally still uses the deterministic
                  // hash-based palette below, since getting even one of the
                  // other ~20 real companies' colors wrong would misrepresent
                  // their actual identity -- not worth the risk without
                  // verifying each one individually.
                  const VERIFIED_BRAND_COLORS = {
                    stripe: '#635BFF',
                    paypal: '#003087',
                    adyen: '#0abf53',
                  };
                  const MONOGRAM_PALETTE = [
                    '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
                    '#d97706', '#65a30d', '#059669', '#0891b2', '#4338ca',
                  ];
                  const monogramColor = (id) => {
                    if (VERIFIED_BRAND_COLORS[id]) return VERIFIED_BRAND_COLORS[id];
                    let hash = 0;
                    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
                    return MONOGRAM_PALETTE[hash % MONOGRAM_PALETTE.length];
                  };

                  // Normalizes away spaces/hyphens so "MPesa" matches the
                  // real capability name "M-Pesa" -- a literal substring
                  // search was failing on exactly this, the real bug behind
                  // "the search bar is not working".
                  const norm = (s) => (s || '').toLowerCase().replace(/[\s-]/g, '');
                  const q = norm(methodSearch);
                  const matchesQuery = (p) => {
                    if (!q) return true;
                    if (norm(p.name).includes(q) || norm(p.id).includes(q)) return true;
                    if ((p.capabilities || []).some((c) => norm(c.name).includes(q))) return true;
                    // Country search: match on the real country name (e.g.
                    // "Kenya") -- code matching left out deliberately, a
                    // 2-letter code substring match would false-positive
                    // constantly (e.g. "us" inside "Australia").
                    return (p.countries || []).some((c) => norm(c.name).includes(q));
                  };
                  const isConnected = (providerId) => accounts.some((a) => a.provider_id === providerId);
                  const accountFor = (providerId) => accounts.find((a) => a.provider_id === providerId);

                  const renderProviderCard = (p) => {
                    const connected = isConnected(p.id);
                    const account = accountFor(p.id);
                    const isConnecting = connectingProviderId === p.id;
                    const isExpanded = expandedProvider === p.id;
                    const test = testResult[p.id] || {};
                    // "Africa", "Africa + Global", "Global" -- matches the
                    // mockup's simple region label instead of a country count.
                    const regionLabel = p.regions.length >= 4 ? 'Global'
                      : p.regions.length === 3 ? `${p.regions[0]} + Global`
                      : p.regions.join(' + ');
                    const realBreakdown = connectedProviderMethods[p.id];
                    return (
                      <div className={`provider-card ${connected ? 'connected' : ''}`} key={p.id}>
                        <div className="provider-card-head">
                          <div className="provider-card-name-col">
                            <div className="provider-card-name-row">
                              <span className="provider-card-monogram" style={{ background: monogramColor(p.id) }}>
                                {(p.name || '?').charAt(0).toUpperCase()}
                              </span>
                              <span className="provider-card-name">{p.name}</span>
                            </div>
                            <span className="provider-card-region">{regionLabel}</span>
                          </div>
                          <div className="provider-card-tags">
                            {p.status === 'beta' && <span className="provider-card-tag beta">Beta</span>}
                            {connected && <span className="provider-card-tag connected">✓ Connected</span>}
                          </div>
                        </div>

                        {/* Every method this provider supports -- never truncated,
                            shown inline as the mockup does (name • name • name). */}
                        <p className="provider-card-methods-line">
                          {(p.capabilities || []).map((cap) => cap.name).join(' • ')}
                        </p>

                        {/* Real, actual country names -- not a region-level
                            summary standing in for a country list. "European
                            Union" and "Global" are the provider's own real
                            catalog entries where that's genuinely broader
                            than a single country, not filtered out or
                            relabeled. */}
                        {p.countries && p.countries.length > 0 && (
                          <p className="provider-card-countries-line">
                            {p.countries.map((c) => c.name).join(', ')}
                          </p>
                        )}

                        {connected && account?.mode === 'test' && (
                          <div className="acct-testmode-note">
                            These are <strong>test credentials</strong> — Konduyt connects live accounts only for
                            real payments. This shouldn&apos;t normally happen; disconnect and reconnect with a live key.
                          </div>
                        )}

                        {/* Real, per-country breakdown -- built from the actual
                            eligibility engine, not the flat capabilities list
                            above (which has no country-to-method mapping). A
                            country only appears here if it genuinely has at
                            least one verified method through THIS provider. */}
                        {connected && realBreakdown && Object.keys(realBreakdown).length > 0 && (
                          <div className="provider-card-breakdown">
                            <div className="provider-card-breakdown-title">Payment methods available to you</div>
                            {Object.entries(realBreakdown).map(([countryName, methods]) => (
                              <div className="provider-card-breakdown-country" key={countryName}>
                                <div className="provider-card-breakdown-country-name">{countryName}</div>
                                <ul className="provider-card-breakdown-list">
                                  {methods.map((m) => <li key={m}>✓ {m}</li>)}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                        {connected && realBreakdown && Object.keys(realBreakdown).length === 0 && (
                          <p className="provider-card-breakdown-empty">
                            No verified methods yet for this account&apos;s markets — check back shortly.
                          </p>
                        )}

                        {connected ? (
                          <div className="provider-card-actions">
                            <button className="acct-btn" type="button"
                              onClick={() => testConnection(p.id)} disabled={test.testing}>
                              {test.testing ? 'Testing…' : 'Test connection'}
                            </button>
                            <button className="acct-btn danger" type="button"
                              onClick={() => disconnectAccount(p.id)}>Disconnect</button>
                          </div>
                        ) : (
                          <div className="provider-card-actions">
                            {/* Only the connect path that actually works is shown.
                                Every real connector in this catalog is api_key or
                                custom auth -- zero support OAuth today, so no
                                disabled "Connect automatically" placeholder here. */}
                            <button className={`con-connect-btn full ${isConnecting ? 'is-cancel' : ''}`} type="button"
                              onClick={() => {
                                setConnectingProviderId(isConnecting ? null : p.id);
                                setCredValues({}); setConnectError('');
                              }}>
                              {isConnecting ? 'Cancel' : 'Connect with API keys'}
                            </button>
                          </div>
                        )}

                        {test.message && (
                          <div className={`acct-test-result ${test.ok ? 'ok' : 'err'}`}>
                            {test.ok ? '✓ ' : '✕ '}{test.message}
                          </div>
                        )}

                        {p.best_for && (
                          <button className="mpesa-learn-toggle" type="button"
                            onClick={() => setExpandedProvider(isExpanded ? null : p.id)}>
                            {isExpanded ? '▲ Learn more' : '▼ Learn more'}
                          </button>
                        )}
                        {isExpanded && (
                          <div className="mpesa-learn">
                            <p className="mpesa-learn-blurb">{p.best_for}</p>
                            {p.status === 'beta' && (
                              <p className="mpesa-beta-note">
                                This connector is newly built and not yet verified against the live API.
                                Connect with real credentials — Konduyt validates them and connects only if they work.
                              </p>
                            )}
                            {p.docs_url && (
                              <a className="con-connect-docs" href={p.docs_url} target="_blank" rel="noreferrer">
                                Where to find your credentials ↗
                              </a>
                            )}
                          </div>
                        )}

                        {isConnecting && (
                          <div className="con-connect-form">
                            <div className="mpesa-connect-title">Connect {p.name}</div>
                            <div className="con-connect-livehint">
                              Use your <strong>live</strong> keys. Konduyt connects real provider accounts —
                              test or sandbox credentials won&apos;t be accepted here.
                            </div>
                            {(p.credential_schema?.fields || []).map((field) => (
                              <div className="con-field" key={field.name}>
                                <label className="con-connect-label">
                                  {field.label}{field.required && <span className="con-req">*</span>}
                                </label>
                                {field.type === 'select' ? (
                                  <select className="con-connect-input"
                                    value={credValues[field.name] || (field.required ? '' : (field.options || [])[0] || '')}
                                    onChange={(e) => setCredValues((v) => ({ ...v, [field.name]: e.target.value }))}>
                                    {field.required && <option value="">Select…</option>}
                                    {(field.options || []).map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                                  </select>
                                ) : (
                                  <input className="con-connect-input"
                                    type={field.type === 'password' ? 'password' : 'text'}
                                    placeholder={field.placeholder || ''}
                                    value={credValues[field.name] || ''}
                                    onChange={(e) => setCredValues((v) => ({ ...v, [field.name]: e.target.value }))} />
                                )}
                                {field.help && <p className="con-field-help">{field.help}</p>}
                              </div>
                            ))}
                            {connectError && <div className="con-connect-error">{connectError}</div>}
                            <button className="con-connect-submit"
                              onClick={() => connectProviderCard(p.id, p.credential_schema?.fields || [])}
                              disabled={connectBusy || !schemaComplete(p, credValues)}
                              type="button">
                              {connectBusy ? 'Validating…' : 'Connect'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  };

                  if (providersLoading) {
                    return <p className="con-sub" style={{ marginTop: 16 }}>Loading providers…</p>;
                  }

                  const list = q ? topProviders.filter(matchesQuery) : topProviders;
                  // Connected providers first, for easier visibility --
                  // a stable sort, so within "connected" and "not connected"
                  // each keeps its original relative order.
                  const sortedList = [...list].sort((a, b) => {
                    const aConnected = isConnected(a.id) ? 0 : 1;
                    const bConnected = isConnected(b.id) ? 0 : 1;
                    return aConnected - bConnected;
                  });

                  if (q && list.length === 0) {
                    return (
                      <div className="con-empty" style={{ marginTop: 16 }}>
                        <p className="con-empty-sub">
                          No provider matches “{methodSearch}”. Try Paystack, Stripe, PayPal, Flutterwave…
                        </p>
                      </div>
                    );
                  }

                  if (list.length === 0) {
                    return (
                      <div className="con-empty" style={{ marginTop: 16 }}>
                        <p className="con-empty-sub">No providers available yet.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="provider-directory">
                      <div className="provider-grid">
                        {sortedList.map(renderProviderCard)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {tab === 'quickstart' && (
              <div className="lang-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Code Samples</h1>
                  <p className="con-sub">
                    Pick your language to see how to create a payment with Konduyt. Then grab your keys below.
                  </p>
                </div>

                <div className="lang-chips">
                  {LANG_SNIPPETS.map((l) => {
                    const brand = LANG_BRAND[l.icon] || '#0a0a0a';
                    const selected = langTab === l.id;
                    return (
                      <button key={l.id} type="button"
                        className={`lang-chip ${selected ? 'sel' : ''}`}
                        style={{ '--brand': brand }}
                        onClick={() => setLangTab(l.id)}>
                        {LANG_ICONS[l.icon] && (
                          <span className="lang-chip-icon"
                            dangerouslySetInnerHTML={{ __html: LANG_ICONS[l.icon] }} />
                        )}
                        {l.label}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const lang = LANG_SNIPPETS.find((l) => l.id === langTab) || LANG_SNIPPETS[0];
                  const env = ENV_SETUP[lang.icon] || {};
                  const isPlatform = Boolean(lang.platform);
                  return (
                    <>
                    {/* First-time .env setup — simple, no room for confusion */}
                    <div className="env-setup">
                      <button className="env-setup-head" type="button" onClick={() => setEnvOpen((o) => !o)}>
                        <span>{isPlatform ? 'Where does the secret key go?' : 'New to .env files? Set one up (2 minutes)'}</span>
                        <span className="env-setup-chevron">{envOpen ? '▲' : '▼'}</span>
                      </button>
                      {envOpen && (
                        <div className="env-setup-body">
                          {isPlatform ? (
                            <p className="env-p">
                              {lang.platform} apps are installed on your customers&apos; devices, and anything
                              shipped inside the app can be extracted — so the secret key must <strong>never</strong> live
                              in the app. Keep it on <strong>your own server</strong>: your app calls your server, and your
                              server (holding the key) calls Konduyt. {env.loaderNote}
                            </p>
                          ) : (
                            <>
                              <div className="env-step">
                                <span className="env-step-n">1</span>
                                <div>
                                  <div className="env-step-title">Put a file called <code className="inline-code">.env</code> at your project root</div>
                                  <p className="env-p">That&apos;s the top folder of your project — the same place as your <code className="inline-code">{env.rootFile || 'main file'}</code>. Not inside a subfolder.</p>
                                  <pre className="env-tree"><code>{`your-project/            ${'\u2190'} project root — .env goes HERE
${'\u251C\u2500\u2500'} .env                 ${'\u2190'} create it here${env.rootFile ? `
${'\u251C\u2500\u2500'} ${env.rootFile}` : ''}
${'\u251C\u2500\u2500'} src/
${'\u2502'}   ${'\u2514\u2500\u2500'} ... your code
${'\u2514\u2500\u2500'} ...`}</code></pre>
                                </div>
                              </div>

                              <div className="env-step">
                                <span className="env-step-n">2</span>
                                <div>
                                  <div className="env-step-title">Create the file</div>
                                  <p className="env-p"><strong>In VS Code:</strong> {ENV_STEPS.create_vscode}</p>
                                  <p className="env-p"><strong>In the terminal</strong> (from your project root):</p>
                                  <pre className="env-tree"><code>{`# macOS / Linux
${ENV_STEPS.create_terminal_mac}

# Windows
${ENV_STEPS.create_terminal_win}`}</code></pre>
                                  <p className="env-p env-warn">The filename is exactly <code className="inline-code">.env</code> — a dot, then &quot;env&quot;. No name before the dot, no <code className="inline-code">.txt</code> after.</p>
                                </div>
                              </div>

                              <div className="env-step">
                                <span className="env-step-n">3</span>
                                <div>
                                  <div className="env-step-title">Paste this line inside it</div>
                                  <p className="env-p">No spaces around the <code className="inline-code">=</code>. No quotes. One key per line:</p>
                                  <pre className="env-tree"><code>KONDUYT_SECRET_KEY=kdu_live_sk_your_key_here</code></pre>
                                </div>
                              </div>

                              <div className="env-step">
                                <span className="env-step-n">4</span>
                                <div>
                                  <div className="env-step-title">Never commit it — add it to <code className="inline-code">.gitignore</code></div>
                                  <p className="env-p">In a file called <code className="inline-code">.gitignore</code> at the same root, add one line:</p>
                                  <pre className="env-tree"><code>.env</code></pre>
                                </div>
                              </div>

                              {env.loader && (
                                <div className="env-step">
                                  <span className="env-step-n">5</span>
                                  <div>
                                    <div className="env-step-title">Load it in your code</div>
                                    <p className="env-p">A <code className="inline-code">.env</code> file doesn&apos;t load itself. Install the loader:</p>
                                    <pre className="env-tree"><code>{env.loader}</code></pre>
                                    <p className="env-p">{env.loaderNote}</p>
                                  </div>
                                </div>
                              )}
                              {!env.loader && env.loaderNote && (
                                <p className="env-p" style={{ marginTop: 4 }}>{env.loaderNote}</p>
                              )}

                              <p className="env-p env-host">On your host (Cloudflare / Render / Vercel) there is no <code className="inline-code">.env</code> file — instead, add <code className="inline-code">KONDUYT_SECRET_KEY</code> under the project&apos;s Settings → Environment Variables. The <code className="inline-code">.env</code> file is just for your own computer.</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="lang-blocks">
                      {lang.platform && (
                        <div className="lang-platform-note">Platform: {lang.platform}</div>
                      )}
                      {lang.sections.map((sec, i) => {
                        const code = sec.code.replaceAll('{{API}}', API_BASE);
                        const copyId = `lang_${lang.id}_${i}`;
                        return (
                          <div className="lang-block" key={i}>
                            <div className="lang-block-head">
                              <span className="lang-block-title">{sec.title}</span>
                              <button className="keys-code-copy static" type="button"
                                onClick={() => copyToClipboard(code, copyId)}>
                                {copied === copyId ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <div className="keys-codeblock">
                              <pre><code>{code}</code></pre>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    </>
                  );
                })()}

                {/* Keys — mode toggle (test / live). Both work from signup. */}
                {keys && keys.live && (() => {
                  const k = keys.live;
                  return (
                  <div className="keys-panel" style={{ marginTop: 24 }}>
                    <div className="keys-head">
                      <h3>Your API keys</h3>
                      <span className="keys-mode live-badge">Live</span>
                    </div>
                    <div className="keys-row stacked">
                      <div className="keys-field">
                        <label>Publishable key</label>
                        <div className="keys-value">
                          <code>{k.publishable_key}</code>
                          <button className="keys-copy" type="button"
                            onClick={() => copyToClipboard(k.publishable_key, 'pub')}>
                            {copied === 'pub' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="keys-field">
                        <label>Secret key</label>
                        <div className="keys-value">
                          <code>{showSecret ? (k.secret || k.secret_masked) : k.secret_masked}</code>
                          <button className="keys-copy danger" type="button"
                            onClick={revokeSecret}>
                            Revoke
                          </button>
                          <button className="keys-copy" type="button"
                            onClick={() => setShowSecret((s) => !s)}>
                            {showSecret ? 'Hide' : 'Reveal'}
                          </button>
                          <button className="keys-copy" type="button"
                            onClick={() => k.secret && copyToClipboard(k.secret, 'sec')}>
                            {copied === 'sec' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="keys-note">
                      Keep your secret key server-side. Never ship it to a browser or commit it.
                    </p>

                    {/* You cannot receive money without connecting a provider */}
                    <div className={`keys-connect-note ${projectStatus && projectStatus.live ? 'ok' : ''}`}>
                      {projectStatus && projectStatus.live ? (
                        <span>✓ This project can receive money — a provider is connected and a method is enabled.</span>
                      ) : (
                        <span>
                          <strong>You cannot receive money yet.</strong> Your keys work, but a payment needs
                          somewhere to go. Go to <button className="link-inline" type="button"
                            onClick={() => setTab('connections')}>Payment Providers</button>, connect a
                          provider account and enable a payment method — until then, payment attempts will
                          fail with <code className="inline-code">no_provider_connected</code>.
                        </span>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </div>
            )}

            {tab === 'sentinel' && (
              <div className="sentinel-page">
                <div className="con-home-head con-home-head-row">
                  <div>
                    <h1 className="con-h1">Konduyt Sentinel</h1>
                    <p className="con-sub">
                      Watches provider pricing and tax-authority pages. Detects material changes,
                      alerts Telegram, and waits for your review — it never changes Konduyt&apos;s logic on its own.
                    </p>
                  </div>
                  <div className="sentinel-actions">
                    <button className="preview-checkout-btn" type="button" disabled={sentinelBusy} onClick={runSentinel}>
                      {sentinelBusy ? 'Running…' : '↻ Run check now'}
                    </button>
                  </div>
                </div>

                <div className="sentinel-test-row">
                  <span>Verify Telegram delivery:</span>
                  <button className="sentinel-test-btn" type="button" disabled={sentinelBusy}
                    onClick={() => testSentinelAlert('fee')}>Test Fee bot</button>
                  <button className="sentinel-test-btn" type="button" disabled={sentinelBusy}
                    onClick={() => testSentinelAlert('tax')}>Test Tax bot</button>
                </div>

                <div className="int-subnav">
                  <button className={sentinelTab === 'changes' ? 'int-subtab active' : 'int-subtab'}
                    onClick={() => setSentinelTab('changes')}>
                    Detected changes{sentinelChanges.filter((c) => c.review_status === 'pending').length > 0
                      ? ` (${sentinelChanges.filter((c) => c.review_status === 'pending').length})` : ''}
                  </button>
                  <button className={sentinelTab === 'sources' ? 'int-subtab active' : 'int-subtab'}
                    onClick={() => setSentinelTab('sources')}>
                    Monitored sources ({sentinelSources.length})
                  </button>
                </div>

                {sentinelTab === 'changes' && (
                  sentinelChanges.length === 0 ? (
                    <div className="route-empty">No changes detected yet. Sentinel records a change only when a fee or tax value actually moves.</div>
                  ) : (
                    <div className="sentinel-changes">
                      {sentinelChanges.map((c) => (
                        <div className={`sentinel-change ${c.review_status}`} key={c.id}>
                          <div className="sentinel-change-head">
                            <span className={`sentinel-type ${c.type}`}>{c.type === 'tax' ? 'TAX' : 'FEE'}</span>
                            <span className="sentinel-change-source">{c.source_name}</span>
                            <span className={`sentinel-review-badge ${c.review_status}`}>{c.review_status}</span>
                          </div>
                          <div className="sentinel-change-values">
                            <div className="sentinel-val">
                              <span className="sentinel-val-label">Previous</span>
                              <span className="sentinel-val-old">{c.old_value || '—'}</span>
                            </div>
                            <span className="sentinel-arrow">→</span>
                            <div className="sentinel-val">
                              <span className="sentinel-val-label">New</span>
                              <span className="sentinel-val-new">{c.new_value || '—'}</span>
                            </div>
                          </div>
                          <div className="sentinel-change-meta">
                            <span>{c.detected_at ? new Date(c.detected_at).toLocaleString() : ''}</span>
                            <span>{c.alerted ? '✓ Telegram alerted' : 'not alerted'}</span>
                            <a href={c.url} target="_blank" rel="noreferrer" className="sentinel-review-link">Review source ↗</a>
                          </div>
                          {c.review_status === 'pending' && (
                            <div className="sentinel-change-actions">
                              <button className="sentinel-approve" type="button" onClick={() => reviewChange(c.id, 'approved')}>
                                Approve (I&apos;ll update the model)
                              </button>
                              <button className="sentinel-dismiss" type="button" onClick={() => reviewChange(c.id, 'dismissed')}>
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}

                {sentinelTab === 'sources' && (
                  <div className="sentinel-sources">
                    {['fee', 'tax'].map((t) => (
                      <div key={t} className="sentinel-source-group">
                        <h3 className="sentinel-group-title">{t === 'fee' ? 'Fee pages' : 'Tax authorities'} ({sentinelSources.filter((s) => s.type === t).length})</h3>
                        {sentinelSources.filter((s) => s.type === t).map((s) => (
                          <div className="sentinel-source" key={s.id}>
                            <div className="sentinel-source-main">
                              <span className="sentinel-source-name">{s.name}</span>
                              <a href={s.url} target="_blank" rel="noreferrer" className="sentinel-source-url">{s.url}</a>
                            </div>
                            <div className="sentinel-source-meta">
                              <span className={`sentinel-enabled ${s.enabled ? 'on' : ''}`}>{s.enabled ? '● enabled' : 'disabled'}</span>
                              <span>every {Math.round(s.check_interval / 3600)}h</span>
                              <span>{s.last_checked_at ? `checked ${new Date(s.last_checked_at).toLocaleDateString()}` : 'never checked'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'routing' && (
              <div className="route-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Routing intelligence</h1>
                  <p className="con-sub">
                    For a given payment, Konduyt ranks every rail by cost, then settlement speed —
                    and tells you if you&apos;re leaving money on the table.
                  </p>
                </div>

                {/* Controls */}
                <div className="route-controls">
                  <label className="route-field">
                    <span className="route-label">Method</span>
                    <select className="con-connect-input" value={routeMethod}
                      onChange={(e) => setRouteMethod(e.target.value)}>
                      {[['mpesa','M-Pesa'],['card','Cards'],['apple_pay','Apple Pay'],['paypal_wallet','PayPal'],
                        ['bank_transfer','Bank Transfer'],['rtgs','RTGS'],['pesalink','PesaLink'],['ach','ACH'],
                        ['sepa','SEPA'],['upi','UPI'],['pix','Pix']].map(([id,label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="route-field">
                    <span className="route-label">Amount</span>
                    <div className="route-amount-field">
                      <select className="route-cur" value={previewCurrency}
                        onChange={(e) => setPreviewCurrency(e.target.value)}>
                        {['KES','USD','GBP','EUR','NGN','ZAR','INR','BRL'].map((c) => <option key={c}>{c}</option>)}
                      </select>
                      <input className="route-amt" value={routeAmount}
                        onChange={(e) => setRouteAmount(e.target.value)} inputMode="decimal" />
                    </div>
                  </label>
                  <label className="route-field">
                    <span className="route-label">Customer location</span>
                    <select className="con-connect-input" value={routeCustomerCountry}
                      onChange={(e) => setRouteCustomerCountry(e.target.value)}>
                      <option value="">Same as merchant (domestic)</option>
                      {MERCHANT_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </label>
                </div>

                {routeLoading && <div className="route-loading">Ranking rails…</div>}

                {/* Gap nudge — the advice */}
                {routeData?.gap && (
                  <div className="route-gap">
                    <span className="route-gap-icon">💡</span>
                    <span>{routeData.gap.message}</span>
                  </div>
                )}

                {/* Ranked table */}
                {routeData?.options && routeData.options.length > 0 && (
                  <div className="route-table">
                    <div className="route-row route-row-head">
                      <span className="route-c-rank">#</span>
                      <span className="route-c-name">Provider</span>
                      <span className="route-c-fee">Fee</span>
                      <span className="route-c-settle">Settles</span>
                      <span className="route-c-status">Status</span>
                    </div>
                    {routeData.options.map((o, i) => (
                      <div className={`route-row ${o.connected ? 'connected' : ''} ${i === 0 && o.fee_profiled ? 'best' : ''}`} key={o.connector}>
                        <span className="route-c-rank">{o.fee_profiled ? i + 1 : '–'}</span>
                        <span className="route-c-name">
                          {o.connector_name}
                          {i === 0 && o.fee_profiled && <span className="route-badge cheapest">Cheapest</span>}
                          {o.fx_applied && <span className="route-badge fx">incl. FX</span>}
                        </span>
                        <span className="route-c-fee">
                          {o.effective_percent !== null ? `${o.effective_percent}%` : <span className="route-pending">pending</span>}
                        </span>
                        <span className="route-c-settle">{o.settlement !== 'unknown' ? o.settlement.toUpperCase() : '—'}</span>
                        <span className="route-c-status">
                          {o.connected
                            ? <span className="route-conn on">● Connected</span>
                            : <span className="route-conn">Not connected</span>}
                        </span>
                      </div>
                    ))}
                    <div className="route-foot">
                      Ranked by fee, then settlement speed. Fees are published provider rates
                      {routeData.options.some((o) => o.fx_applied) ? ', including cross-border FX where it applies' : ''}.
                      Your negotiated rates may differ.
                    </div>
                  </div>
                )}

                {routeData && (!routeData.options || routeData.options.length === 0) && !routeLoading && (
                  <div className="route-empty">No providers serve this method for your merchant country yet.</div>
                )}
              </div>
            )}

            {tab === 'overview' && (
              <div className="ov-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Overview</h1>
                  <p className="con-sub">A live summary of this project, from real payment data.</p>
                </div>
                <div className="ov-stats">
                  <div className="ov-stat">
                    <span className="ov-stat-label">Completed volume</span>
                    <span className="ov-stat-value">
                      {summary ? `KES ${(summary.completed_volume || 0).toLocaleString()}` : '—'}
                    </span>
                  </div>
                  <div className="ov-stat">
                    <span className="ov-stat-label">Completed payments</span>
                    <span className="ov-stat-value">{summary ? summary.completed_count : '—'}</span>
                  </div>
                  <div className="ov-stat">
                    <span className="ov-stat-label">API requests</span>
                    <span className="ov-stat-value">{summary ? summary.total_api_requests : '—'}</span>
                  </div>
                </div>
                {summary && summary.payments_by_status && Object.keys(summary.payments_by_status).length > 0 ? (
                  <div className="ov-breakdown">
                    <h3>Payments by status</h3>
                    {Object.entries(summary.payments_by_status).map(([status, v]) => (
                      <div className="ov-row" key={status}>
                        <span className={`ov-status-dot ${status}`} />
                        <span className="ov-row-label">{status}</span>
                        <span className="ov-row-count">{v.count}</span>
                        <span className="ov-row-amount">KES {(v.amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="con-sub">No payments yet. Connect a provider in Integrations, then create your first payment through the API — it'll show here.</p>
                )}
              </div>
            )}

            {tab === 'activity' && (
              <div className="ov-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Activity</h1>
                  <p className="con-sub">Every API request and webhook for this project, newest first.</p>
                </div>
                {activity.length === 0 ? (
                  <p className="con-sub">No activity yet. API calls to <code>/v1/payments</code> and incoming webhooks will appear here.</p>
                ) : (
                  <div className="act-list">
                    {activity.map((a) => (
                      <div className="act-item" key={a.id}>
                        {a.kind === 'api_request' ? (
                          <>
                            <span className={`act-method ${a.status >= 400 ? 'err' : 'ok'}`}>{a.method}</span>
                            <span className="act-path">{a.path}</span>
                            <span className={`act-status ${a.status >= 400 ? 'err' : 'ok'}`}>{a.status}</span>
                            <span className="act-meta">{a.duration_ms}ms</span>
                          </>
                        ) : (
                          <>
                            <span className="act-method wh">{a.direction === 'inbound' ? 'HOOK IN' : 'HOOK OUT'}</span>
                            <span className="act-path">{a.event_type || a.provider}</span>
                            <span className={`act-status ${a.verified === false || a.delivered === false ? 'err' : 'ok'}`}>
                              {a.direction === 'inbound' ? (a.verified ? 'verified' : 'rejected') : (a.delivered ? 'delivered' : 'failed')}
                            </span>
                            <span className="act-meta">{a.provider}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'money' && !taxDetailOpen && (
              <div className="money-page">
                <div className="con-home-head con-home-head-row">
                  <div />
                  {(!moneyData || !moneyData.has_data) && (
                    <label className="demo-toggle">
                      <input type="checkbox" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} />
                      <span>Preview with sample data</span>
                    </label>
                  )}
                </div>

                {demoMode && moneyView === DEMO_MONEY && (
                  <div className="demo-banner">Demo data — not real transactions. Nothing here is stored or counted.</div>
                )}

                {(() => {
                  // Real month navigation. Never allows going past the actual
                  // current calendar month (no browsing into the future).
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const monthLabel = new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
                  const shiftMonth = (delta) => {
                    const d = new Date(y, m - 1 + delta, 1);
                    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  };
                  const now = new Date();
                  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth() + 1;

                  return (
                    <div className="money-month-nav">
                      <button type="button" className="money-month-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
                      <span className="money-month-nav-label">{monthLabel}</span>
                      <button type="button" className="money-month-nav-btn" onClick={() => shiftMonth(1)}
                        disabled={isCurrentMonth} aria-label="Next month">›</button>
                    </div>
                  );
                })()}

                {/* Total combined, this month -- the real by-provider total,
                    never a sum of providers+methods together (method rows are
                    the SAME money re-sliced a different way, not additional
                    money -- summing both would double-count). Shows ONLY the
                    single currency with the most real volume -- not every
                    currency the merchant happens to have received in, mixed
                    together. If real volume genuinely exists in more than one
                    currency, the rest are still visible per-row below, just
                    not crammed into this one headline number. Konduyt-owed
                    sits right alongside it -- both real figures for the same
                    selected month, not one buried further down the page. */}
                {(() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const monthLabel = new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

                  const byCcy = {};
                  (moneyView?.providers || []).forEach((p) => {
                    byCcy[p.currency] = (byCcy[p.currency] || 0) + p.completed_volume;
                  });
                  const entries = Object.entries(byCcy);
                  const hasReceived = moneyView?.has_data && entries.length > 0;
                  const [dominantCcy, dominantMinor] = hasReceived
                    ? entries.sort((a, b) => b[1] - a[1])[0] : [null, 0];

                  const isDemo = moneyView === DEMO_MONEY;
                  // In demo mode, the received figure above is a preview
                  // number -- showing a real "Nothing owed yet" right next to
                  // it was internally inconsistent (a real KES 48,200.00
                  // received implies a real amount owed, not zero). The RATE
                  // itself is genuinely real and decided (0.25%, confirmed
                  // active) -- only the volume being multiplied is demo, so
                  // this applies the real rate to the demo volume rather than
                  // fabricating a rate too. Still fully gated on rate_set:
                  // if the rate genuinely weren't set, this would honestly
                  // say so even in demo mode, never invent one.
                  const owedLine = !moneyOrchestration?.rate_set ? null
                    : isDemo
                      ? (hasReceived ? { currency: dominantCcy, konduyt_fee_total: Math.round(dominantMinor * moneyOrchestration.rate) } : null)
                      : (moneyOrchestration.lines?.length > 0
                          ? moneyOrchestration.lines.slice().sort((a, b) => b.konduyt_fee_total - a.konduyt_fee_total)[0]
                          : null);

                  return (
                    <div className="money-headline-row">
                      <div className="money-total-headline">
                        <span className="money-total-headline-label">Received on {monthLabel}</span>
                        <span className="money-total-headline-value">
                          {hasReceived ? (
                            <span className="money-total-headline-ccy">
                              {dominantCcy} {(dominantMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="money-total-headline-empty">No payments this month</span>
                          )}
                        </span>
                      </div>
                      <div className="money-total-headline money-total-headline-owed">
                        <span className="money-total-headline-label">
                          You owe Konduyt{moneyOrchestration?.rate_set ? ` (${(moneyOrchestration.rate * 100).toFixed(2)}%)` : ''}
                        </span>
                        <span className="money-total-headline-value">
                          {!moneyOrchestration ? (
                            <span className="money-total-headline-empty">—</span>
                          ) : !moneyOrchestration.rate_set ? (
                            <span className="money-total-headline-empty">Rate not yet set</span>
                          ) : owedLine ? (
                            <span className="money-total-headline-ccy">
                              {owedLine.currency} {(owedLine.konduyt_fee_total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="money-total-headline-empty">Nothing owed yet</span>
                          )}
                        </span>
                        {/* Real payment only -- never wired to demo data. isDemo
                            here means moneyView is the DEMO_MONEY object, in
                            which case owedLine (built from moneyOrchestration,
                            always the real API response) would only coincide
                            by accident; excluding isDemo explicitly means a
                            demo-mode viewer can never trigger a real charge. */}
                        {!isDemo && owedLine && (
                          <button type="button" className="money-owed-pay-btn"
                            disabled={payOrchestrationBusy} onClick={payOrchestrationFee}>
                            {payOrchestrationBusy ? 'Starting\u2026' : 'Pay now'}
                          </button>
                        )}
                        {payOrchestrationMsg && (
                          <p className="money-owed-pay-msg">{payOrchestrationMsg}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const docsUrlFor = (providerId) => {
                    const p = topProviders.find((tp) => tp.id === providerId);
                    return p?.docs_url || null;
                  };

                  const providerRows = (moneyView?.providers || []).map((p, i) => ({
                    key: `p-${p.provider}-${p.currency}-${i}`,
                    type: 'Provider', name: p.provider, currency: p.currency,
                    amount: p.completed_volume, docsUrl: docsUrlFor(p.provider),
                  }));
                  const showMethodPreview = moneyView === DEMO_MONEY;
                  const methodRows = showMethodPreview ? DEMO_MONEY_BY_METHOD.methods.map((m, i) => ({
                    key: `m-${m.method}-${i}`,
                    type: 'Method', name: m.method, currency: m.currency,
                    amount: m.completed_volume, docsUrl: docsUrlFor(m.provider),
                  })) : [];
                  const rows = [...providerRows, ...methodRows];

                  if (rows.length === 0) {
                    return <div className="route-empty">No transactions yet this month.</div>;
                  }

                  return (
                    <div className="money-simple-list">
                      {rows.map((row) => (
                        <div className="money-simple-row" key={row.key}>
                          <span className="money-simple-name">{row.name}</span>
                          <span className="money-simple-amount">
                            {row.currency} {(row.amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <div className="money-row-links">
                            {row.docsUrl && (
                              <a className="money-row-link" href={row.docsUrl} target="_blank" rel="noreferrer">
                                View account →
                              </a>
                            )}
                            <button type="button" className="money-row-link money-row-link-btn"
                              onClick={() => setTaxDetailOpen(true)}>
                              View taxes →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <p className="money-privacy-note">
                  We don&apos;t show individual senders — check your provider&apos;s dashboard for that.
                </p>

                {/* Only shown when Konduyt fees are genuinely accruing in MORE
                    THAN ONE currency this month -- the headline above already
                    covers the single-currency case (the common one), showing
                    this too then would just repeat it. */}
                {moneyOrchestration?.rate_set && moneyOrchestration.lines?.length > 1 && (
                  <div className="money-owed">
                    <div className="money-owed-head">
                      <span className="money-owed-title">Other currencies owed to Konduyt this month</span>
                    </div>
                    <div className="money-owed-lines">
                      {moneyOrchestration.lines.map((l) => (
                        <div className="money-owed-line" key={l.currency}>
                          <span>{l.currency} {(l.orchestrated_volume / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })} received</span>
                          <span className="money-owed-amount">
                            {l.currency} {(l.konduyt_fee_total / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tax detail: entered by clicking "View taxes" on any row --
                every row links to the SAME account-wide, per-country view
                (not scoped to that specific provider/method). Replaces the
                old standalone Taxes tab, which is gone. */}
            {tab === 'money' && taxDetailOpen && (
              <div className="tax-page">
                <button type="button" className="money-row-link money-row-link-btn" style={{ marginBottom: 16 }}
                  onClick={() => { setTaxDetailOpen(false); setTaxReceived(null); setTaxExpanded(null); }}>
                  ← Back to Money
                </button>
                <div className="con-home-head">
                  <h1 className="con-h1">Taxes by country</h1>
                  <p className="con-sub">Based on where each payment was sent from, across every connected provider.</p>
                </div>

                <div className="tax-received">
                  {!taxReceivedView || !taxReceivedView.has_data ? (
                    <div className="route-empty">No payments received yet.</div>
                  ) : (
                    <div className="tax-country-list">
                      {taxReceivedView.countries.map((row) => {
                        const open = taxExpanded === row.country_code;
                        const t = row.tax;
                        return (
                          <div className={`tax-country-item ${open ? 'open' : ''}`} key={row.country_code}>
                            <button className="tax-country-row" type="button"
                              onClick={() => setTaxExpanded(open ? null : row.country_code)}>
                              <span className="tax-country-name">{t ? t.country : row.country_code}</span>
                              <span className="tax-country-vol">{row.currency} {(row.received_volume / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              <span className="tax-country-count">{row.completed_count} payment{row.completed_count === 1 ? '' : 's'}</span>
                              <span className="tax-country-chev">{open ? '▲' : '▼'}</span>
                            </button>
                            {open && t && (
                              <div className="tax-country-detail">
                                <div className="tax-result-head">
                                  <span className="tax-result-type">{t.tax_type}</span>
                                  <span className="tax-ref-badge">reference</span>
                                </div>
                                {t.computable ? (
                                  <div className="tax-breakdown">
                                    <div className="tax-line"><span>Received</span><span>{row.currency} {(row.received_volume/100).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                                    <div className="tax-line"><span>Rate</span><span>{t.rate}%</span></div>
                                    <div className="tax-line tax-line-total"><span>Reference tax on this</span><span>{row.currency} {(t.tax_minor/100).toLocaleString(undefined,{minimumFractionDigits:2})}</span></div>
                                  </div>
                                ) : (
                                  <div className="tax-noncomputable">No single national rate for {t.country} — tax isn&apos;t a single number here.</div>
                                )}
                                {t.caveats && t.caveats.length > 0 && (
                                  <ul className="tax-caveats">{t.caveats.map((c, i) => <li key={i}>{c}</li>)}</ul>
                                )}
                                {row.how_to_pay && (
                                  <div className="tax-howto">
                                    <div className="tax-howto-title">How to account for this tax</div>
                                    {row.how_to_pay.filing && (
                                      <div className={`tax-filing ${row.how_to_pay.filing.frequency === 'varies' ? 'unknown' : ''}`}>
                                        <span className="tax-filing-badge">
                                          {row.how_to_pay.filing.frequency === 'varies' ? 'check' : row.how_to_pay.filing.frequency}
                                        </span>
                                        <span className="tax-filing-text">
                                          {row.how_to_pay.filing.frequency !== 'varies'
                                            ? <>You file <strong>{row.how_to_pay.filing.frequency}</strong>{row.how_to_pay.filing.deadline ? ` — ${row.how_to_pay.filing.deadline}.` : '.'} Account for all {t ? t.country : ''} sales together each period, not per payment.</>
                                            : <>Filing frequency for {t ? t.country : 'this country'} isn&apos;t confirmed in Konduyt. Missing a deadline can be costly — confirm the cycle directly with {row.how_to_pay.authority}{row.how_to_pay.portal ? <> at <a href={row.how_to_pay.portal} target="_blank" rel="noreferrer">{row.how_to_pay.portal}</a></> : ''} before you rely on it.</>}
                                        </span>
                                      </div>
                                    )}
                                    <div className="tax-howto-auth">
                                      {row.how_to_pay.authority}
                                      {row.how_to_pay.portal && (
                                        <> · <a href={row.how_to_pay.portal} target="_blank" rel="noreferrer">{row.how_to_pay.portal}</a></>
                                      )}
                                    </div>
                                    <ol className="tax-howto-steps">
                                      {row.how_to_pay.steps.map((s, i) => <li key={i}>{s}</li>)}
                                    </ol>
                                    {!row.how_to_pay.detailed && (
                                      <div className="tax-howto-note">Konduyt doesn&apos;t have step-by-step guidance for this country yet — the pointer above is your starting point.</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'checkout' && (
              <div className="mpesa-page">
                <div className="con-home-head">
                  <h1 className="con-h1">Preview Checkouts</h1>
                  <p className="con-sub">
                    See what your customers see, and drop the same checkout into your own site.
                  </p>
                </div>

                {/* Real, deployed example storefronts -- not mockups. Each is
                    a genuine standalone site testing one real scenario end to
                    end (a session-based recurring subscription, and a
                    publishable-key one-time purchase), with its own real
                    source on GitHub to inspect or copy from directly. */}
                <div className="scenario-list">
                  <div className="scenario-card">
                    <div className="scenario-card-head">
                      <span className="scenario-card-name">Recurring subscription</span>
                      <span className="scenario-card-tag">Netflix-style</span>
                    </div>
                    <p className="scenario-card-desc">
                      A real session-based checkout with <code className="inline-code">recurring: true</code> --
                      the shopper sees the "Recurring — charged every month" disclosure and a Subscribe button.
                    </p>
                    <div className="scenario-card-actions">
                      <a href="https://konduyt-test-recurring-subscription.onrender.com" target="_blank"
                        rel="noreferrer" className="scenario-card-btn">View site ↗</a>
                      <button type="button" className="scenario-card-btn scenario-card-btn-ghost"
                        onClick={() => { setCodeViewerScenario('recurring'); setCodeViewerFile('server'); }}>
                        View code
                      </button>
                    </div>
                  </div>

                  <div className="scenario-card">
                    <div className="scenario-card-head">
                      <span className="scenario-card-name">One-time purchase</span>
                      <span className="scenario-card-tag">Shopping</span>
                    </div>
                    <p className="scenario-card-desc">
                      A real publishable-key checkout for a single item -- no session, no recurring intent,
                      just <code className="inline-code">Konduyt.checkout()</code> called directly.
                    </p>
                    <div className="scenario-card-actions">
                      <a href="https://konduyt-test-onetime-purchase.onrender.com" target="_blank"
                        rel="noreferrer" className="scenario-card-btn">View site ↗</a>
                      <button type="button" className="scenario-card-btn scenario-card-btn-ghost"
                        onClick={() => { setCodeViewerScenario('onetime'); setCodeViewerFile('server'); }}>
                        View code
                      </button>
                    </div>
                  </div>

                  <div className="scenario-card">
                    <div className="scenario-card-head">
                      <span className="scenario-card-name">Failed payment + rerouting</span>
                      <span className="scenario-card-tag">Real failover</span>
                    </div>
                    <p className="scenario-card-desc">
                      A real payment routed by <code className="inline-code">method</code>, not an explicit
                      provider -- Konduyt tries every configured provider in order, stopping on success,
                      continuing only on a genuinely safe failure. Never on an ambiguous one.
                    </p>
                    <div className="scenario-card-actions">
                      <a href="https://konduyt-test-failover-demo.onrender.com" target="_blank"
                        rel="noreferrer" className="scenario-card-btn">View site ↗</a>
                      <button type="button" className="scenario-card-btn scenario-card-btn-ghost"
                        onClick={() => { setCodeViewerScenario('failover'); setCodeViewerFile('server'); }}>
                        View code
                      </button>
                    </div>
                  </div>

                  <div className="scenario-card">
                    <div className="scenario-card-head">
                      <span className="scenario-card-name">Cross-border payment</span>
                      <span className="scenario-card-tag">Shopper-aware</span>
                    </div>
                    <p className="scenario-card-desc">
                      The same merchant, the same checkout call -- but real eligible methods change based
                      on the shopper's real country, via <code className="inline-code">customer_country</code>.
                      Never a fixed list.
                    </p>
                    <div className="scenario-card-actions">
                      <a href="https://konduyt-test-crossborder.onrender.com" target="_blank"
                        rel="noreferrer" className="scenario-card-btn">View site ↗</a>
                      <button type="button" className="scenario-card-btn scenario-card-btn-ghost"
                        onClick={() => { setCodeViewerScenario('crossborder'); setCodeViewerFile('server'); }}>
                        View code
                      </button>
                    </div>
                  </div>

                  <div className="scenario-card">
                    <div className="scenario-card-head">
                      <span className="scenario-card-name">Pay-as-you-go</span>
                      <span className="scenario-card-tag">Usage-based</span>
                    </div>
                    <p className="scenario-card-desc">
                      A real bill computed from usage, then a real checkout for that exact amount --
                      not a fixed price. Automated recurring metered billing isn't built yet; this shows
                      the part that is.
                    </p>
                    <div className="scenario-card-actions">
                      <a href="https://konduyt-test-payg.onrender.com" target="_blank"
                        rel="noreferrer" className="scenario-card-btn">View site ↗</a>
                      <button type="button" className="scenario-card-btn scenario-card-btn-ghost"
                        onClick={() => { setCodeViewerScenario('payg'); setCodeViewerFile('server'); }}>
                        View code
                      </button>
                    </div>
                  </div>
                </div>

                {/* In-dashboard code viewer -- never leaves Konduyt. Server
                    file is language-switchable (reuses the same LANG_SNIPPETS
                    languages/icons as Quickstart, for one consistent look);
                    the client file is plain browser JS regardless of server
                    language, since that's inherently what runs in a browser. */}
                {codeViewerScenario && (() => {
                  const SCENARIOS = {
                    recurring: { label: 'Recurring subscription', server: RECURRING_SERVER_CODE, client: RECURRING_CLIENT_CODE },
                    onetime: { label: 'One-time purchase', server: ONETIME_SERVER_CODE, client: ONETIME_CLIENT_CODE },
                    failover: { label: 'Failed payment + rerouting', server: FAILOVER_SERVER_CODE, client: FAILOVER_CLIENT_CODE },
                    crossborder: { label: 'Cross-border payment', server: CROSSBORDER_SERVER_CODE, client: CROSSBORDER_CLIENT_CODE },
                    payg: { label: 'Pay-as-you-go', server: PAYG_SERVER_CODE, client: PAYG_CLIENT_CODE },
                  };
                  const scenario = SCENARIOS[codeViewerScenario];
                  const serverCode = scenario.server[codeViewerLang];
                  const clientCode = scenario.client;
                  const scenarioLabel = scenario.label;
                  const displayedCode = codeViewerFile === 'server' ? serverCode : clientCode;
                  return (
                    <div className="code-viewer">
                      <div className="code-viewer-head">
                        <span className="code-viewer-title">{scenarioLabel} — source</span>
                        <button type="button" className="code-viewer-close"
                          onClick={() => setCodeViewerScenario(null)} aria-label="Close">✕</button>
                      </div>

                      <div className="code-viewer-files">
                        <button type="button"
                          className={codeViewerFile === 'server' ? 'code-viewer-file sel' : 'code-viewer-file'}
                          onClick={() => setCodeViewerFile('server')}>
                          server.{codeViewerLang === 'cpp' ? 'cpp' : codeViewerLang === 'python' ? 'py' : 'js'}
                        </button>
                        <button type="button"
                          className={codeViewerFile === 'client' ? 'code-viewer-file sel' : 'code-viewer-file'}
                          onClick={() => setCodeViewerFile('client')}>
                          public/index.html
                        </button>
                      </div>

                      {codeViewerFile === 'server' && (
                        <div className="lang-chips code-viewer-langs">
                          {LANG_SNIPPETS.filter((l) => SCENARIO_SERVER_LANGUAGES.includes(l.id)).map((l) => {
                            const brand = LANG_BRAND[l.icon] || '#0a0a0a';
                            const selected = codeViewerLang === l.id;
                            return (
                              <button key={l.id} type="button"
                                className={`lang-chip ${selected ? 'sel' : ''}`}
                                style={{ '--brand': brand }}
                                onClick={() => setCodeViewerLang(l.id)}>
                                {LANG_ICONS[l.icon] && (
                                  <span className="lang-chip-icon"
                                    dangerouslySetInnerHTML={{ __html: LANG_ICONS[l.icon] }} />
                                )}
                                {l.label}
                              </button>
                            );
                          })}
                          <span className="code-viewer-more-langs">
                            More languages coming soon
                          </span>
                        </div>
                      )}
                      {codeViewerFile === 'client' && (
                        <p className="code-viewer-note">
                          Browser code — always JavaScript, whatever your server language is.
                        </p>
                      )}

                      <pre className="code-viewer-block"><code>{displayedCode}</code></pre>
                      <button className="code-viewer-copy" type="button"
                        onClick={() => copyToClipboard(displayedCode, 'scenario-code')}>
                        {copied === 'scenario-code' ? '✓ Copied' : 'Copy code'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {tab === 'messages' && (
              <div className="con-messages">
                <div className="con-messages-head">
                  <div>
                    <h2 className="con-messages-title">Messages</h2>
                    <p className="con-messages-sub">
                      Important updates about your providers, payments, taxes and the Konduyt API.
                    </p>
                  </div>
                  {isAdmin && (
                    <a href="/admin/messages/" className="con-msg-admin-btn">+ Create post</a>
                  )}
                </div>

                <div className="msg-filters">
                  {[['all', 'All'], ['unread', 'Unread'], ['important', 'Important']].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={msgFilter === id ? 'msg-filter active' : 'msg-filter'}
                      onClick={() => setMsgFilter(id)}
                    >{label}</button>
                  ))}
                  <select
                    className="msg-cat-select"
                    value={msgCategory}
                    onChange={(e) => setMsgCategory(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {['Provider', 'API', 'Payments', 'Tax', 'Security', 'Maintenance', 'Feature', 'Deprecation', 'Account'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {msgLoading ? (
                  <div className="msg-empty">Loading…</div>
                ) : msgs.length === 0 ? (
                  <div className="msg-empty">
                    <div className="msg-empty-icon">✓</div>
                    <div className="msg-empty-title">You're all caught up</div>
                    <div className="msg-empty-sub">No messages{msgFilter !== 'all' ? ' match this filter' : ' right now'}.</div>
                  </div>
                ) : (
                  <div className="msg-list">
                    {msgs.map((m) => (
                      <div
                        key={m.id}
                        className={`msg-card sev-${m.severity} ${m.read ? '' : 'unread'}`}
                        onClick={() => !m.read && markMessageRead(m.id)}
                      >
                        <div className="msg-card-top">
                          <span className="msg-card-provider">
                            {(m.provider || m.category || '').toUpperCase()}
                          </span>
                          <span className={`msg-sev-dot sev-${m.severity}`} />
                          {!m.read && <span className="msg-unread-dot" />}
                        </div>
                        <div className="msg-card-title">{m.title}</div>
                        <div className="msg-card-body">{m.body}</div>
                        {m.action_url && (
                          <a
                            href={m.action_url}
                            className="msg-action-btn"
                            onClick={(e) => e.stopPropagation()}
                          >{m.action_label || 'View details'}</a>
                        )}
                        <div className="msg-card-foot">
                          <span className="msg-card-date">
                            {m.published_at ? new Date(m.published_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          </span>
                          <button
                            type="button"
                            className="msg-dismiss"
                            onClick={(e) => { e.stopPropagation(); dismissMessage(m.id); }}
                          >Dismiss</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'settings' && (
              <div className="con-settings">
                <h2 className="con-settings-title">Settings</h2>
                <p className="con-settings-sub">Manage your account, appearance and preferences.</p>

                {settingsView === 'main' && (
                  <div className="settings-sections">
                    {/* Project */}
                    {active && (
                      <section className="settings-card">
                        <div className="settings-card-h">Project</div>
                        <div className="settings-row">
                          <div>
                            <div className="settings-row-k">Name</div>
                            {!renaming ? (
                              <div className="settings-row-d">{active.name}</div>
                            ) : (
                              <span className="con-rename-edit">
                                <input
                                  className="con-rename-input"
                                  value={renameVal}
                                  onChange={(e) => setRenameVal(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                                  autoFocus
                                />
                                <button className="con-rename-save" onClick={saveRename} type="button">Save</button>
                              </span>
                            )}
                          </div>
                          {!renaming && (
                            <button className="settings-link-btn" type="button"
                              onClick={() => { setRenameVal(active.name); setRenaming(true); }}>
                              Rename
                            </button>
                          )}
                        </div>

                        {!projectDeleting && (
                          <div className="settings-row">
                            <div>
                              <div className="settings-row-k settings-danger-k">Delete this project</div>
                              <div className="settings-row-d">
                                Permanently deletes "{active.name}" — its keys, connections, and payment
                                history. Your Konduyt account and other projects are not affected.
                              </div>
                            </div>
                            <button type="button" className="settings-danger-btn"
                              onClick={() => { setProjectDeleteConfirm(''); setProjectDeleteError(''); setProjectDeleting(true); }}>
                              Delete
                            </button>
                          </div>
                        )}

                        {projectDeleting && (
                          <div className="settings-delete-inline">
                            <p className="settings-delete-label">
                              Type this project's name <strong>{active.name}</strong> to confirm deleting
                              only <strong>this project</strong> — not your account:
                            </p>
                            <input
                              className="settings-delete-input"
                              value={projectDeleteConfirm}
                              onChange={(e) => setProjectDeleteConfirm(e.target.value)}
                              placeholder={active.name}
                              autoFocus
                            />
                            {projectDeleteError && <div className="settings-delete-error">{projectDeleteError}</div>}
                            <div className="settings-delete-actions">
                              <button type="button" className="settings-link-btn"
                                onClick={() => setProjectDeleting(false)} disabled={projectDeleteBusy}>
                                Cancel
                              </button>
                              <button type="button" className="settings-danger-btn" onClick={deleteProject}
                                disabled={projectDeleteBusy || projectDeleteConfirm.trim() !== active.name.trim()}>
                                {projectDeleteBusy ? 'Deleting…' : 'Delete this project'}
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    )}

                    {/* Profile */}
                    <section className="settings-card">
                      <div className="settings-card-h">Profile</div>
                      <div className="settings-profile">
                        <div className="settings-avatar">{(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}</div>
                        <div>
                          <div className="settings-profile-name">{user?.name || 'Konduyt developer'}</div>
                          <div className="settings-profile-email">{user?.email || '—'}</div>
                          {user?.provider && (
                            <div className="settings-profile-method">
                              Signed in with <strong>{user.provider === 'google' ? 'Google' : user.provider === 'github' ? 'GitHub' : user.provider}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Plan */}
                    <section className="settings-card">
                      <div className="settings-card-h">Plan</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-row-k">Current plan</div>
                          <div className="settings-row-d">
                            {projects.length <= 3
                              ? `Free — ${projects.length} of 3 free live projects used.`
                              : `${projects.length} live projects · $${(projects.length - 3) * 10}/mo beyond the 3 free.`}
                          </div>
                        </div>
                        <a href="/pricing/" className="settings-link-btn">View pricing</a>
                      </div>
                    </section>

                    {/* Resources */}
                    <section className="settings-card">
                      <div className="settings-card-h">Resources</div>
                      <a href="/docs/" className="settings-nav-row" target="_blank" rel="noreferrer">
                        <span><span className="settings-nav-k">Documentation</span><span className="settings-nav-d">Guides and API reference</span></span>
                        <span className="settings-nav-arrow">↗</span>
                      </a>
                      <a href="https://github.com/konduyt-hq" className="settings-nav-row" target="_blank" rel="noreferrer">
                        <span><span className="settings-nav-k">GitHub</span><span className="settings-nav-d">github.com/konduyt-hq</span></span>
                        <span className="settings-nav-arrow">↗</span>
                      </a>
                      <a href="/labs/" className="settings-nav-row" target="_blank" rel="noreferrer">
                        <span><span className="settings-nav-k">Konduyt Labs</span><span className="settings-nav-d">Konduyt Intelligence — join the list</span></span>
                        <span className="settings-nav-arrow">↗</span>
                      </a>
                      <a href="/terms/" className="settings-nav-row" target="_blank" rel="noreferrer">
                        <span><span className="settings-nav-k">Privacy &amp; Terms</span><span className="settings-nav-d">Terms, DPA, Privacy Notice</span></span>
                        <span className="settings-nav-arrow">↗</span>
                      </a>
                    </section>

                    {/* Linked accounts */}
                    <section className="settings-card">
                      <div className="settings-card-h">Linked accounts</div>
                      <p className="settings-about">
                        You can sign in with more than one provider. Link a second one now,
                        so you never end up with two separate Konduyt accounts by mistake.
                      </p>
                      <div className="settings-linked-list">
                        {identitiesLoading && <div className="settings-linked-loading">Loading…</div>}
                        {!identitiesLoading && identities && (
                          <>
                            {['google', 'github'].map((p) => {
                              const linked = identities.find((i) => i.provider === p);
                              return (
                                <div className="settings-linked-row" key={p}>
                                  <span className="settings-linked-name">
                                    {p === 'google' ? 'Google' : 'GitHub'}
                                  </span>
                                  {linked ? (
                                    <span className="settings-linked-status">
                                      Linked{linked.email_is_placeholder ? '' : ` · ${linked.email}`}
                                    </span>
                                  ) : (
                                    <button
                                      className="settings-linked-btn"
                                      type="button"
                                      onClick={() => linkProvider(p)}
                                    >
                                      Link {p === 'google' ? 'Google' : 'GitHub'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </section>

                    {/* About */}
                    <section className="settings-card">
                      <div className="settings-card-h">About Konduyt</div>
                      <p className="settings-about">
                        Konduyt is a payment orchestration and intelligence layer. One integration to every
                        provider, routing to the best option, without ever touching your money.
                      </p>
                      <p className="settings-about-more">
                        <a href="/about/" className="settings-about-link">From Collective Brains &rarr;</a>
                      </p>
                    </section>

                    {/* Contact */}
                    <section className="settings-card">
                      <div className="settings-card-h">Contact</div>
                      <a href="https://wa.me/254746355884" className="settings-nav-row" target="_blank" rel="noreferrer">
                        <span><span className="settings-nav-k">WhatsApp <span className="settings-preferred">Preferred</span></span><span className="settings-nav-d">+254 746 355884</span></span>
                        <span className="settings-nav-arrow">↗</span>
                      </a>
                      <a href="mailto:teamkonduyt@gmail.com" className="settings-nav-row">
                        <span><span className="settings-nav-k">Email</span><span className="settings-nav-d">teamkonduyt@gmail.com</span></span>
                        <span className="settings-nav-arrow">↗</span>
                      </a>
                    </section>

                    {/* Account actions */}
                    <section className="settings-card settings-card-danger">
                      <div className="settings-card-h">Account</div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-row-k">Log out</div>
                          <div className="settings-row-d">Sign out of this device.</div>
                        </div>
                        <button type="button" className="settings-link-btn" onClick={logout}>Log out</button>
                      </div>
                      <div className="settings-row">
                        <div>
                          <div className="settings-row-k settings-danger-k">Delete account</div>
                          <div className="settings-row-d">Permanently delete your account, projects and connected credentials.</div>
                        </div>
                        <button type="button" className="settings-danger-btn" onClick={() => { setSettingsView('delete'); setDeleteConfirm(''); setDeleteError(''); }}>Delete</button>
                      </div>
                    </section>
                  </div>
                )}

                {settingsView === 'delete' && (
                  <div className="settings-delete">
                    <div className="settings-delete-card">
                      <div className="settings-delete-h">Delete your Konduyt account?</div>
                      <p className="settings-delete-p">
                        This permanently deletes your entire Konduyt account — every project, key,
                        connection, and payment record you have. This cannot be undone.
                      </p>
                      <p className="settings-delete-note">
                        Looking to delete just one project instead? Go to that project's Settings
                        tab — this is for your whole account.
                      </p>
                      <p className="settings-delete-label">
                        Type your account email <strong>{user?.email || ''}</strong> to confirm:
                      </p>
                      <input
                        className="settings-delete-input"
                        value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder={user?.email || 'you@example.com'}
                        autoFocus
                      />
                      {deleteError && <div className="settings-delete-error">{deleteError}</div>}
                      <div className="settings-delete-actions">
                        <button type="button" className="settings-link-btn" onClick={() => setSettingsView('main')} disabled={deleteBusy}>Cancel</button>
                        <button type="button" className="settings-danger-btn" onClick={deleteAccount}
                          disabled={deleteBusy || deleteConfirm.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase() || !user?.email}>
                          {deleteBusy ? 'Deleting…' : 'Delete my account'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
        </>

        {/* Customer checkout preview — what the end customer sees on "Pay" */}
        {(() => {
          // REAL eligibility, from GET /v1/payment-methods/available -- the
          // same engine that decides what the actual SDK shows a real
          // shopper. Replaces a hardcoded fallback dataset (fabricated fee
          // percentages attached to real provider names) that used to render
          // whenever nothing was connected yet -- that was never sourced from
          // anything real, so it's gone, not extended.
          const merchantCountryName = (MERCHANT_COUNTRIES.find((c) => c.code === active?.merchant_country) || {}).name
            || 'not set yet';
          const prettyMethodName = (id) => (id || '').replace(/_/g, ' ')
            .replace(/\b\w/g, (ch) => ch.toUpperCase());
          const rankedByMethod = {};
          (previewRanked || []).forEach((r) => { rankedByMethod[r.method] = r; });
          const payable = (previewEligibility?.methods || []).map((m) => {
            const rank = rankedByMethod[m.method];
            return {
              id: m.method.toLowerCase(),
              name: prettyMethodName(m.method),
              connectable: true,
              via: m.selected_provider,
              available_via: [{ name: prettyMethodName(m.selected_provider) }],
              eligible_providers: m.eligible_providers,
              capability_detail: m.capability_detail,
              // Real fee data where it exists (never fabricated when it
              // doesn't) -- this is what makes CheckoutModal actually show
              // the "Best value" payment intelligence badge.
              fee_percent: rank ? rank.fee_percent : undefined,
              fee_amount: rank ? rank.fee_amount : undefined,
            };
          });

          const amountMinor = Math.max(0, Math.round((parseFloat(previewAmount) || 0) * 100));

          async function onPay(methodId) {
            try {
              const secret = keys?.live?.secret;
              if (!secret) {
                return { ok: true, message: `This is a preview. With ${merchantName} connected to a live provider, the customer would now complete payment via ${methodId}.` };
              }
              const r = await fetch(`${API_BASE}/v1/payments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${secret}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amountMinor, currency: previewCurrency, method: methodId,
                                       customer: { email: 'customer@example.com' } }),
              });
              const d = await r.json().catch(() => ({}));
              if (r.ok) {
                return { ok: true, message: '' };
              }
              const detail = d.detail;
              const msg = (detail && detail.message) || (typeof detail === 'string' ? detail : 'Payment could not start.');
              return { ok: false, message: msg };
            } catch (e) {
              return { ok: false, message: 'Network error starting the payment.' };
            }
          }

          const merchantName = active?.name || 'Your Store';
          return (
            <>
              {checkoutOpen && (
                <div className="locality-intel">
                  <div className="locality-intel-row">
                    <div className="locality-intel-side">
                      <span className="locality-intel-label">Your business</span>
                      <span className="locality-intel-val">
                        {merchantCountryName} · {previewCurrency}
                      </span>
                    </div>
                    <span className="locality-intel-arrow">→</span>
                    <div className="locality-intel-side">
                      <span className="locality-intel-label">Shopper is in</span>
                      <select className="con-connect-input locality-intel-select"
                        value={previewShopperCountry}
                        onChange={(e) => setPreviewShopperCountry(e.target.value)}>
                        {MERCHANT_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="locality-intel-note">
                    {previewEligibilityLoading ? 'Checking eligible methods for this locality…'
                      : payable.length > 0
                        ? `Konduyt found ${payable.length} real, verified payment method${payable.length !== 1 ? 's' : ''} for a shopper in ${MERCHANT_COUNTRIES.find((c) => c.code === previewShopperCountry)?.name || previewShopperCountry} — each traced to a connected, capability-verified provider below. Change the country to see it adapt.`
                        : `No connected provider has verified capability for ${MERCHANT_COUNTRIES.find((c) => c.code === previewShopperCountry)?.name || previewShopperCountry} yet — connect a provider that covers this market to unlock methods here.`}
                  </p>
                </div>
              )}
              <CheckoutModal
                open={checkoutOpen}
                onClose={() => setCheckoutOpen(false)}
                merchant={merchantName}
                amount={amountMinor}
                currency={previewCurrency}
                methods={payable}
                reference="kdu_preview_demo"
                onPay={onPay}
                preview
              />
            </>
          );
        })()}
      </main>
    </div>
  );
}
