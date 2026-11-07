'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import NavCta from '../../NavCta';
import SignInLink from '../../SignInLink';
import MobileNav from '../../MobileNav';
import LogoMark from '../../LogoMark';
import TwinPanel from './TwinPanel';
import {
  STATUSES, BLOCK_TYPES, listLocal, getLocal, createLocal, saveLocal,
  deleteLocal, sync, pullAndMerge, outboxCount, newBlockId,
  restoreLocal, listDeleted,
  fetchCalendar, fetchLinks, createLink, removeLink,
} from './store';

// KonduytCreators -- Ideas.
//
// A private writing workspace for one creator. Two decisions shape the page:
//
//  1. **It is local-first.** The editor reads and writes IndexedDB and never
//     waits on the network to accept a keystroke. A background sync drains a
//     durable outbox; if it fails, the writing is still there and the queued
//     operation is replayed later under the same id, so nothing is duplicated.
//
//  2. **The Twin is a panel, not an autopilot.** It is off until the creator
//     turns it on, it is only ever invoked by an explicit ask, and it cannot
//     change a document. Accepting a suggestion is a separate edit the creator
//     makes, and that edit is labelled `twin_accepted` in the revision history.
//
// Three surfaces sit on top of that editor and all of them read the same rows it
// writes: the publishing calendar (a projection of the idea's own dates), the
// links between ideas (explicit, creator-made), and the "keep out of the Twin"
// control (enforced server-side). None of them is a second copy of the data.

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

const TOKEN_KEY = 'kdu_token';

// Older sessions stored the token in sessionStorage. The dashboard migrates
// those on load; this page must do the same, or a creator with a pre-existing
// session would be asked to sign in again even though they are still signed in.
function getToken() {
  try {
    const local = localStorage.getItem(TOKEN_KEY);
    if (local) return local;
    const legacy = sessionStorage.getItem(TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy);
      sessionStorage.removeItem(TOKEN_KEY);
      return legacy;
    }
    return null;
  } catch (e) { return null; }
}

function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch (e) { return ''; }
}

export default function Ideas() {
  const [status, setStatus] = useState('loading'); // loading | unauth | ready
  const [ideas, setIdeas] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [syncState, setSyncState] = useState({ pending: 0, online: true });
  const [conflicts, setConflicts] = useState([]);
  const [showTwin, setShowTwin] = useState(false);
  const [twinEnabled, setTwinEnabled] = useState(false);
  const [view, setView] = useState('write'); // write | calendar
  const [calendar, setCalendar] = useState({ entries: [], unscheduled: [] });
  const [links, setLinks] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleted, setDeleted] = useState([]);
  const [linkTarget, setLinkTarget] = useState('');
  const saveTimer = useRef(null);
  const activeIdRef = useRef(null);

  const reload = useCallback(async () => {
    const list = await listLocal();
    setIdeas(list);
    return list;
  }, []);

  const doSync = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const res = await sync({ apiBase: API_BASE, token });
    const pending = await outboxCount();
    setSyncState({ pending, online: !res.offline, last: res });
    if (res.applied || res.duplicates) {
      await pullAndMerge({ apiBase: API_BASE, token });
      await reload();
    }
    return res;
  }, [reload]);

  // Boot: confirm the session, pull, then work from the local copy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      if (!token) { setStatus('unauth'); return; }
      try {
        const r = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) { setStatus('unauth'); return; }
      } catch (e) {
        // Offline with a stored token: still usable, because the workspace is
        // local-first. The session is re-checked on the next sync.
      }
      if (cancelled) return;
      setStatus('ready');
      await doSync();
      const list = await reload();
      const cf = await import('./store').then((m) => m.listConflicts({ apiBase: API_BASE, token }));
      if (!cancelled) setConflicts(cf || []);
      if (!cancelled) setDeleted(await listDeleted());
      if (!cancelled) loadCalendar();
      if (!cancelled && list.length) openDoc(list[0].id);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodic sync while the tab is open, and whenever connectivity returns.
  useEffect(() => {
    if (status !== 'ready') return;
    const iv = setInterval(() => { doSync(); }, 20000);
    const onOnline = () => { doSync(); };
    window.addEventListener('online', onOnline);
    return () => { clearInterval(iv); window.removeEventListener('online', onOnline); };
  }, [status, doSync]);

  // Declared before `openDoc` because `openDoc` depends on `loadLinks`: a
  // `useCallback` dependency array is evaluated during render, so referencing a
  // `const` declared further down would be a temporal-dead-zone error.
  const loadCalendar = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setCalendar(await fetchCalendar({ apiBase: API_BASE, token }));
  }, []);

  const loadLinks = useCallback(async (docId) => {
    const token = getToken();
    if (!token) return;
    setLinks(await fetchLinks({ apiBase: API_BASE, token, docId }));
  }, []);

  const openDoc = useCallback(async (id) => {
    const d = await getLocal(id);
    if (!d) return;
    setActiveId(id);
    activeIdRef.current = id;
    setDraft({ ...d, blocks: d.blocks && d.blocks.length ? d.blocks : [emptyBlock()] });
    loadLinks(id);
  }, [loadLinks]);

  function emptyBlock(type = 'paragraph') {
    return { id: newBlockId(), type, text: '', meta: {} };
  }

  async function newIdea() {
    const { doc } = await createLocal({ title: '', blocks: [emptyBlock()] });
    await reload();
    setActiveId(doc.id);
    activeIdRef.current = doc.id;
    setDraft({ ...doc });
    await doSync();
  }

  // Debounced autosave. Every keystroke updates React state immediately; the
  // write to IndexedDB and the queueing of the server op happen shortly after,
  // so typing is never blocked by either.
  function queueSave(next) {
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveLocal(next);
      await reload();
      setSyncState((s) => ({ ...s, pending: s.pending + 1 }));
      doSync();
    }, 500);
  }

  function editTitle(v) { queueSave({ ...draft, title: v }); }

  function editBlock(id, patch) {
    queueSave({
      ...draft,
      blocks: draft.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  }

  function addBlock(afterId, type = 'paragraph') {
    const b = emptyBlock(type);
    const idx = draft.blocks.findIndex((x) => x.id === afterId);
    const blocks = [...draft.blocks];
    blocks.splice(idx < 0 ? blocks.length : idx + 1, 0, b);
    queueSave({ ...draft, blocks });
    return b.id;
  }

  function removeBlock(id) {
    if (draft.blocks.length <= 1) return;
    queueSave({ ...draft, blocks: draft.blocks.filter((b) => b.id !== id) });
  }

  function setStatusOf(id) {
    // Mirror the server's rule: leaving `scheduled` drops the schedule date, so
    // the local copy and the server cannot disagree about whether an idea is
    // dated. Publishing stamps a date if one is not already set.
    const next = { ...draft, status: id };
    if (id !== 'scheduled') next.scheduled_for = null;
    if (id === 'published' && !next.published_at) next.published_at = new Date().toISOString();
    if (id !== 'published') next.published_at = null;
    queueSave(next);
  }

  function setScheduledFor(value) {
    queueSave({
      ...draft,
      status: 'scheduled',
      scheduled_for: value ? new Date(value).toISOString() : null,
    });
  }

  function togglePin() { queueSave({ ...draft, is_pinned: !draft.is_pinned }); }

  async function removeIdea(id) {
    await deleteLocal(id);
    await reload();
    if (activeIdRef.current === id) { setActiveId(null); setDraft(null); }
    doSync();
  }

  // Undo a delete. The document is soft-deleted, so restoring is a normal
  // queued edit rather than a special server call.
  async function restoreIdea(id) {
    await restoreLocal(id);
    await reload();
    setDeleted(await listDeleted());
    doSync();
  }

  async function addLink() {
    const token = getToken();
    if (!token || !draft || !linkTarget) return;
    await createLink({ apiBase: API_BASE, token, fromDocId: draft.id, toDocId: linkTarget });
    setLinkTarget('');
    await loadLinks(draft.id);
  }

  async function dropLink(otherId) {
    const token = getToken();
    if (!token || !draft) return;
    await removeLink({ apiBase: API_BASE, token, fromDocId: draft.id, toDocId: otherId });
    await loadLinks(draft.id);
  }

  // Keep the open idea out of the Twin's context. The server enforces it; this
  // only records the creator's intent, and it travels with the document so the
  // setting survives a reload on another device.
  async function toggleExcludeFromTwin() {
    if (!draft) return;
    queueSave({ ...draft, exclude_from_twin: !draft.exclude_from_twin });
  }

  // The Twin hands back text; inserting it is an explicit creator action that
  // is recorded with origin='twin_accepted' so the revision history shows it.
  async function insertTwinText(text) {
    if (!draft) return;
    const next = {
      ...draft,
      blocks: [...draft.blocks, { id: newBlockId(), type: 'paragraph', text, meta: {} }],
    };
    setDraft(next);
    await saveLocal(next, { origin: 'twin_accepted' });
    await reload();
    doSync();
  }

  async function resolve(conflictId, resolution) {
    const token = getToken();
    const m = await import('./store');
    await m.resolveConflict({ apiBase: API_BASE, token, conflictId, resolution });
    const cf = await m.listConflicts({ apiBase: API_BASE, token });
    setConflicts(cf || []);
    await reload();
    if (activeIdRef.current) openDoc(activeIdRef.current);
  }

  const filtered = ideas.filter((d) => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    if ((d.title || '').toLowerCase().includes(q)) return true;
    if ((d.tags || []).some((t) => t.includes(q))) return true;
    return (d.blocks || []).some((b) => (b.text || '').toLowerCase().includes(q));
  });

  if (status === 'loading') {
    return (
      <>
        <div className="wrap"><nav><div className="brand">
          <a href="/" className="brand-home"><LogoMark /><span className="brand-name">Konduyt</span></a>
        </div></nav></div>
        <section className="landing"><div className="landing-head">
          <p className="landing-sub">Opening your workspace…</p>
        </div></section>
      </>
    );
  }

  if (status === 'unauth') {
    return (
      <>
        <div className="wrap">
          <nav>
            <div className="brand">
              <a href="/" className="brand-home"><LogoMark /><span className="brand-name">Konduyt</span></a>
              <span className="beta-badge">Creators</span>
            </div>
            <div className="nav-links">
              <a href="/creators/">Overview</a>
              <a href="/creators/audit/">Creator Audit</a>
            </div>
            <MobileNav />
            <div className="nav-right"><SignInLink /><NavCta /></div>
          </nav>
        </div>
        <section className="landing">
          <div className="landing-head">
            <span className="landing-eyebrow">Konduyt for Creators</span>
            <h1 className="landing-title">Sign in to your ideas</h1>
            <p className="landing-sub">
              Your ideas workspace is private to your account. Sign in with the
              same Konduyt account you already use — there is no separate
              creator login.
            </p>
            <div className="landing-cta">
              <a className="btn-primary" href="/signin/">Sign in</a>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="wrap">
        <nav>
          <div className="brand">
            <a href="/" className="brand-home"><LogoMark /><span className="brand-name">Konduyt</span></a>
            <span className="beta-badge">Creators</span>
          </div>
          <div className="nav-links">
            <a href="/creators/">Overview</a>
            <a href="/creators/audit/">Creator Audit</a>
            <a href="/creators/ideas/" className="nav-active">Ideas</a>
          </div>
          <MobileNav />
          <div className="nav-right"><SignInLink /><NavCta /></div>
        </nav>
      </div>

      <div className="ideas-shell">
        <aside className="ideas-side">
          <div className="ideas-side-head">
            <button className="ideas-new" onClick={newIdea}>+ New idea</button>
            <div className="ideas-views">
              <button
                className={`ideas-view ${view === 'write' ? 'is-active' : ''}`}
                onClick={() => setView('write')}
              >Write</button>
              <button
                className={`ideas-view ${view === 'calendar' ? 'is-active' : ''}`}
                onClick={() => { setView('calendar'); loadCalendar(); }}
              >Calendar</button>
            </div>
            <span className={`ideas-sync ${syncState.pending ? 'is-pending' : 'is-ok'}`}>
              {syncState.online === false
                ? 'Offline — changes saved on this device'
                : syncState.pending
                  ? `${syncState.pending} change${syncState.pending === 1 ? '' : 's'} saving…`
                  : 'All changes saved'}
            </span>
          </div>

          <input
            className="ideas-search"
            placeholder="Search your ideas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="ideas-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All stages</option>
            {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          {conflicts.length > 0 && (
            <div className="ideas-conflicts">
              <span className="ideas-conflicts-title">
                {conflicts.length} edit{conflicts.length === 1 ? '' : 's'} need attention
              </span>
              <p className="ideas-conflicts-note">
                You edited these on two devices. Nothing was lost — both versions
                are kept. Choose what to keep.
              </p>
              {conflicts.map((c) => (
                <div key={c.id} className="ideas-conflict">
                  <span className="ideas-conflict-title">
                    {c.client_title || c.server_title || 'Untitled'}
                  </span>
                  <div className="ideas-conflict-actions">
                    <button onClick={() => resolve(c.id, 'kept_client')}>Keep my offline version</button>
                    <button onClick={() => resolve(c.id, 'kept_server')}>Keep the server version</button>
                    <button onClick={() => resolve(c.id, 'kept_both')}>Keep both</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <ul className="ideas-list">
            {filtered.map((d) => (
              <li key={d.id}>
                <button
                  className={`ideas-item ${d.id === activeId ? 'is-active' : ''}`}
                  onClick={() => openDoc(d.id)}
                >
                  <span className="ideas-item-title">{d.title || 'Untitled'}</span>
                  <span className="ideas-item-meta">
                    {d.is_pinned ? 'Pinned · ' : ''}
                    {statusLabel(d.status)} · {fmtTime(d.updated_at)}
                    {d.sync_state === 'pending' ? ' · saving' : ''}
                    {d.sync_state === 'conflict' ? ' · needs attention' : ''}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="ideas-empty">
                {ideas.length === 0
                  ? 'No ideas yet. Start one — it saves on this device first.'
                  : 'Nothing matches that.'}
              </li>
            )}
          </ul>

          {deleted.length > 0 && (
            <div className="ideas-deleted">
              <button className="ideas-deleted-toggle"
                      onClick={() => setShowDeleted((v) => !v)}>
                {showDeleted ? 'Hide' : 'Show'} deleted ({deleted.length})
              </button>
              {showDeleted && (
                <ul className="ideas-deleted-list">
                  {deleted.map((d) => (
                    <li key={d.id}>
                      <span className="ideas-deleted-title">{d.title || 'Untitled'}</span>
                      <button onClick={() => restoreIdea(d.id)}>Restore</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        <main className="ideas-main">
          {view === 'calendar' ? (
            <CalendarView
              calendar={calendar}
              onOpen={(id) => { setView('write'); openDoc(id); }}
            />
          ) : !draft ? (
            <div className="ideas-blank">
              <h2>Your ideas workspace</h2>
              <p>
                Write freely. Everything you type is saved on this device first
                and synced in the background, so a lost connection never costs
                you a sentence.
              </p>
              <button className="btn-primary" onClick={newIdea}>Start an idea</button>
            </div>
          ) : (
            <>
              <div className="ideas-toolbar">
                <input
                  className="ideas-title"
                  value={draft.title}
                  placeholder="Untitled idea"
                  onChange={(e) => editTitle(e.target.value)}
                />
                <div className="ideas-toolbar-right">
                  <select
                    className="ideas-status"
                    value={draft.status}
                    onChange={(e) => setStatusOf(e.target.value)}
                    title="Where this idea is in your pipeline"
                  >
                    {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <input
                    className="ideas-date"
                    type="date"
                    title="Schedule this idea for a day"
                    value={draft.scheduled_for ? String(draft.scheduled_for).slice(0, 10) : ''}
                    onChange={(e) => setScheduledFor(e.target.value)}
                  />
                  <button className="ideas-icon-btn" onClick={togglePin}
                          title={draft.is_pinned ? 'Unpin' : 'Pin'}>
                    {draft.is_pinned ? '★' : '☆'}
                  </button>
                  <button
                    className={`ideas-icon-btn ${draft.exclude_from_twin ? 'is-on' : ''}`}
                    onClick={toggleExcludeFromTwin}
                    title={draft.exclude_from_twin
                      ? 'The Twin cannot see this idea — click to allow it'
                      : 'Keep this idea out of the Twin'}
                  >
                    {draft.exclude_from_twin ? 'Private to Twin' : 'Twin can see'}
                  </button>
                  <button className="ideas-icon-btn"
                          onClick={() => setShowTwin((v) => !v)}
                          title="Creator Twin">
                    Twin
                  </button>
                  <button className="ideas-icon-btn ideas-danger"
                          onClick={() => removeIdea(draft.id)}>Delete</button>
                </div>
              </div>

              <div className="ideas-editor">
                {draft.blocks.map((b) => (
                  <div key={b.id} className={`ideas-block ideas-block-${b.type}`}>
                    <select
                      className="ideas-block-type"
                      value={b.type}
                      onChange={(e) => editBlock(b.id, { type: e.target.value })}
                      title="Block type"
                    >
                      {BLOCK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <textarea
                      className="ideas-block-text"
                      value={b.text}
                      placeholder={placeholderFor(b.type)}
                      onChange={(e) => editBlock(b.id, { text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          const id = addBlock(b.id);
                          requestAnimationFrame(() => {
                            const el = document.querySelector(`[data-block="${id}"]`);
                            if (el) el.focus();
                          });
                        }
                      }}
                      data-block={b.id}
                      rows={Math.max(2, Math.min(14, (b.text || '').split('\n').length + 1))}
                    />
                    <div className="ideas-block-actions">
                      <button onClick={() => addBlock(b.id)} title="Add a block below">+</button>
                      <button onClick={() => removeBlock(b.id)} title="Remove this block">×</button>
                    </div>
                  </div>
                ))}
                <p className="ideas-hint">⌘/Ctrl + Enter adds a block below.</p>
              </div>

              {/* Links connect two of the creator's own ideas. They are made
                  here, explicitly, and stored server-side with an owner on the
                  row, so a link can never point at another creator's idea. */}
              <div className="ideas-links">
                <span className="ideas-links-title">Connected ideas</span>
                {links.length === 0 ? (
                  <p className="ideas-links-note">
                    Nothing connected yet. Link an idea when it belongs with this one.
                  </p>
                ) : (
                  <ul className="ideas-links-list">
                    {links.map((l) => {
                      const otherId = l.from_doc_id === draft.id ? l.to_doc_id : l.from_doc_id;
                      const other = ideas.find((x) => x.id === otherId);
                      return (
                        <li key={l.id}>
                          <button className="ideas-link-open" onClick={() => openDoc(otherId)}>
                            {other ? (other.title || 'Untitled') : otherId}
                          </button>
                          <button className="ideas-link-x"
                                  onClick={() => dropLink(otherId)}
                                  title="Remove this link">×</button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="ideas-link-add">
                  <select value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}>
                    <option value="">Link another idea…</option>
                    {ideas.filter((x) => x.id !== draft.id).map((x) => (
                      <option key={x.id} value={x.id}>{x.title || 'Untitled'}</option>
                    ))}
                  </select>
                  <button onClick={addLink} disabled={!linkTarget}>Link</button>
                </div>
              </div>
            </>
          )}
        </main>

        {showTwin && draft && (
          <TwinPanel
            apiBase={API_BASE}
            token={getToken()}
            docId={draft.id}
            docTitle={draft.title}
            enabled={twinEnabled}
            onEnabledChange={setTwinEnabled}
            onInsert={insertTwinText}
            onClose={() => setShowTwin(false)}
          />
        )}
      </div>
    </>
  );
}

function statusLabel(id) {
  const s = STATUSES.find((x) => x.id === id);
  return s ? s.label : 'Captured';
}

// The publishing calendar.
//
// It renders the same rows the editor writes, grouped by month, so it can never
// disagree with an idea's own status and dates. Ideas that are ready but undated
// are shown separately -- that list is the useful one, because an idea with no
// date is the thing a creator is most likely to forget.
function CalendarView({ calendar, onOpen }) {
  const entries = (calendar && calendar.entries) || [];
  const unscheduled = (calendar && calendar.unscheduled) || [];

  const byMonth = {};
  for (const e of entries) {
    const key = String(e.at || '').slice(0, 7);
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(e);
  }
  const months = Object.keys(byMonth).sort();

  return (
    <div className="ideas-calendar">
      <h2 className="ideas-calendar-title">Publishing calendar</h2>
      <p className="ideas-calendar-sub">
        Your ideas in time. A date here is the same date you set on the idea.
      </p>

      {entries.length === 0 ? (
        <p className="ideas-calendar-empty">
          Nothing scheduled or published yet. Set a date on an idea and it appears here.
        </p>
      ) : (
        months.map((m) => (
          <div key={m} className="ideas-calendar-month">
            <span className="ideas-calendar-month-name">{fmtMonth(m)}</span>
            <ul>
              {byMonth[m].map((e) => (
                <li key={e.id}>
                  <button className="ideas-calendar-item" onClick={() => onOpen(e.id)}>
                    <span className="ideas-calendar-day">{fmtDay(e.at)}</span>
                    <span className="ideas-calendar-item-title">{e.title || 'Untitled'}</span>
                    <span className={`ideas-calendar-kind is-${e.kind}`}>{e.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {unscheduled.length > 0 && (
        <div className="ideas-calendar-unscheduled">
          <span className="ideas-calendar-month-name">Ready, no date yet</span>
          <ul>
            {unscheduled.map((e) => (
              <li key={e.id}>
                <button className="ideas-calendar-item" onClick={() => onOpen(e.id)}>
                  <span className="ideas-calendar-item-title">{e.title || 'Untitled'}</span>
                  <span className="ideas-calendar-kind">{statusLabel(e.status)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function fmtMonth(key) {
  const [y, m] = String(key).split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (isNaN(d.getTime())) return key;
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function fmtDay(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
}

function placeholderFor(type) {
  switch (type) {
    case 'heading': return 'Heading';
    case 'subheading': return 'Subheading';
    case 'bullet': return 'A point';
    case 'numbered': return 'A step';
    case 'quote': return 'A quote';
    case 'prompt': return 'A note to yourself';
    default: return 'Write…';
  }
}
