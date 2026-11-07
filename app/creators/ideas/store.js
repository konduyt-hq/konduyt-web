'use client';

// Local-first storage for the Ideas workspace.
//
// The creator's ideas live in IndexedDB first and reach the server second. That
// ordering is the whole design: writing must never wait on the network, and a
// dropped connection must not lose a sentence. The server is a sync target, not
// the source of truth for an open session.
//
// Three mechanisms make that safe:
//
//   1. **A durable outbox.** Every local change appends an operation to an
//      `outbox` store in the same IndexedDB transaction that writes the
//      document. If the tab closes mid-sync, the operation is still there.
//
//   2. **Client-generated operation ids.** Each queued op carries its own
//      `op_id`, generated once and reused on every retry. The server keys on it,
//      so replaying a batch after a dropped response applies nothing twice. This
//      is what makes "retry until it succeeds" safe rather than duplicating.
//
//   3. **Explicit conflicts.** When the server reports a conflict, the local
//      edit is NOT discarded and NOT forced over the server. The server keeps
//      both versions and this module surfaces the choice to the creator.
//
// Plain IndexedDB, no framework: it can be reasoned about and exercised directly.

const DB_NAME = 'konduyt-ideas';
const DB_VERSION = 1;
const STORE_DOCS = 'docs';
const STORE_OUTBOX = 'outbox';
const STORE_META = 'meta';

//: The lifecycle, mirroring the server's list. Kept here too so the editor can
//: render the status control before it has ever reached the network.
export const STATUSES = [
  { id: 'captured', label: 'Captured' },
  { id: 'developing', label: 'Developing' },
  { id: 'ready', label: 'Ready' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'parked', label: 'Parked' },
  { id: 'discarded', label: 'Discarded' },
];

export const BLOCK_TYPES = [
  { id: 'paragraph', label: 'Text' },
  { id: 'heading', label: 'Heading' },
  { id: 'subheading', label: 'Subheading' },
  { id: 'bullet', label: 'Bullet' },
  { id: 'numbered', label: 'Numbered' },
  { id: 'quote', label: 'Quote' },
  { id: 'prompt', label: 'Note' },
];

function uid(prefix) {
  const rnd = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rnd}`;
}

export function newDocId() { return uid('idea'); }
export function newOpId() { return uid('op'); }
export function newBlockId() { return uid('blk'); }

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const s = db.createObjectStore(STORE_OUTBOX, { keyPath: 'op_id' });
        s.createIndex('doc_id', 'doc_id', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let out;
    try {
      out = fn(t);
    } catch (e) {
      try { t.abort(); } catch (_) {}
      reject(e);
      return;
    }
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqp(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Local reads
// ---------------------------------------------------------------------------

export async function listLocal() {
  const db = await openDb();
  const docs = await reqp(db.transaction(STORE_DOCS).objectStore(STORE_DOCS).getAll());
  return (docs || [])
    .filter((d) => !d.deleted)
    .sort((a, b) => {
      if (!!b.is_pinned !== !!a.is_pinned) return b.is_pinned ? 1 : -1;
      return String(b.updated_at).localeCompare(String(a.updated_at));
    });
}

export async function getLocal(id) {
  const db = await openDb();
  return reqp(db.transaction(STORE_DOCS).objectStore(STORE_DOCS).get(id));
}

export async function outboxCount() {
  const db = await openDb();
  return reqp(db.transaction(STORE_OUTBOX).objectStore(STORE_OUTBOX).count());
}

export async function outboxAll() {
  const db = await openDb();
  return reqp(db.transaction(STORE_OUTBOX).objectStore(STORE_OUTBOX).getAll());
}

// ---------------------------------------------------------------------------
// Local writes
// ---------------------------------------------------------------------------

function nowIso() { return new Date().toISOString(); }

/**
 * Write a document locally and queue the matching server operation.
 *
 * The document and its outbox entry are written in ONE transaction, so there is
 * no window where a change exists locally but was never queued. `base_version`
 * is the SERVER version the edit started from -- the value the server uses to
 * detect a conflict. It is null for a document the server has never seen, which
 * is also how `create_if_missing` is decided.
 */
export async function saveLocal(doc, { origin = 'creator' } = {}) {
  const db = await openDb();
  const opId = newOpId();
  const baseVersion = doc.server_version ?? null;
  const cid = await clientId();
  const local = {
    ...doc,
    local_version: (doc.local_version || 0) + 1,
    updated_at: nowIso(),
    sync_state: 'pending',
  };
  const op = {
    op_id: opId,
    doc_id: local.id,
    op_type: 'upsert',
    base_version: baseVersion,
    title: local.title,
    blocks: local.blocks,
    status: local.status,
    tags: local.tags,
    parent_id: local.parent_id ?? null,
    is_pinned: !!local.is_pinned,
    // The three fields the calendar and the Twin's privacy control depend on.
    // They travel with the same op as the edit they belong to, so a status
    // change and its date can never be queued as two separate, reorderable
    // writes.
    scheduled_for: local.scheduled_for ?? null,
    published_at: local.published_at ?? null,
    exclude_from_twin: !!local.exclude_from_twin,
    origin,
    client_id: cid,
    create_if_missing: baseVersion === null,
    queued_at: nowIso(),
  };
  await tx(db, [STORE_DOCS, STORE_OUTBOX], 'readwrite', (t) => {
    t.objectStore(STORE_DOCS).put(local);
    t.objectStore(STORE_OUTBOX).put(op);
  });
  return { doc: local, op };
}

export async function createLocal({ title = '', blocks = [], tags = [], status = 'captured',
                                    excludeFromTwin = false } = {}) {
  const doc = {
    id: newDocId(),
    title,
    blocks: blocks.length ? blocks : [{ id: newBlockId(), type: 'paragraph', text: '', meta: {} }],
    tags,
    status,
    parent_id: null,
    is_pinned: false,
    deleted: false,
    exclude_from_twin: excludeFromTwin,
    scheduled_for: null,
    published_at: null,
    local_version: 0,
    server_version: null,
    sync_state: 'pending',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  return saveLocal(doc);
}

export async function deleteLocal(id) {
  const db = await openDb();
  const doc = await getLocal(id);
  if (!doc) return null;
  const cid = await clientId();
  const op = {
    op_id: newOpId(),
    doc_id: id,
    op_type: 'delete',
    base_version: doc.server_version ?? null,
    origin: 'creator',
    client_id: cid,
    queued_at: nowIso(),
  };
  await tx(db, [STORE_DOCS, STORE_OUTBOX], 'readwrite', (t) => {
    t.objectStore(STORE_DOCS).put({ ...doc, deleted: true, sync_state: 'pending' });
    t.objectStore(STORE_OUTBOX).put(op);
  });
  return op;
}

// ---------------------------------------------------------------------------
// Identity of this device
// ---------------------------------------------------------------------------

let _clientId = null;
export async function clientId() {
  if (_clientId) return _clientId;
  const db = await openDb();
  const row = await reqp(db.transaction(STORE_META).objectStore(STORE_META).get('client_id'));
  if (row && row.value) { _clientId = row.value; return _clientId; }
  const v = uid('dev');
  await tx(db, [STORE_META], 'readwrite', (t) => {
    t.objectStore(STORE_META).put({ key: 'client_id', value: v });
  });
  _clientId = v;
  return v;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

function stripOp(op) {
  // Send only the fields the server accepts; `queued_at` is local bookkeeping.
  const { queued_at, ...rest } = op;
  return rest;
}

/**
 * Drain the outbox into the server, idempotently.
 *
 * An op leaves the outbox only when the server has given a terminal answer:
 * `applied` or `duplicate` (done), or `conflict` (the server has preserved the
 * client's version in its own table, so re-sending would only re-conflict). A
 * network failure or a `5xx` removes nothing -- the next attempt replays the
 * same op ids and the server's gate makes that safe.
 */
export async function sync({ apiBase, token }) {
  const db = await openDb();
  const ops = await outboxAll();
  if (!ops.length) return { applied: 0, conflicts: 0, duplicates: 0, failed: 0, pending: 0 };

  let payload;
  try {
    const r = await fetch(`${apiBase}/creatoros/ideas/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ops: ops.map(stripOp) }),
    });
    if (!r.ok) throw new Error(`sync failed: ${r.status}`);
    payload = await r.json();
  } catch (e) {
    return { applied: 0, conflicts: 0, duplicates: 0, failed: ops.length,
             pending: ops.length, offline: true };
  }

  const byId = {};
  for (const res of payload.results || []) byId[res.op_id] = res;

  // Resolve what each op should do to local state BEFORE opening the write
  // transaction. IndexedDB transactions auto-commit when the microtask queue
  // drains, so a request callback that awaits would run after the transaction
  // had already closed -- the writes would silently vanish.
  const toPut = [];
  const toDeleteOps = [];
  let applied = 0, conflicts = 0, duplicates = 0;
  for (const op of ops) {
    const res = byId[op.op_id];
    if (!res) continue;
    if (res.result === 'applied' || res.result === 'duplicate') {
      if (res.doc) {
        toPut.push({
          ...res.doc,
          server_version: res.doc.version,
          local_version: 0,
          sync_state: 'synced',
        });
      }
      toDeleteOps.push(op.op_id);
      if (res.result === 'applied') applied += 1; else duplicates += 1;
    } else if (res.result === 'conflict') {
      // The server kept BOTH versions. The local copy stays exactly as the
      // creator typed it and is marked, so nothing is silently lost.
      const local = await getLocal(op.doc_id);
      if (local) {
        toPut.push({ ...local, sync_state: 'conflict', conflict_id: res.conflict_id });
      }
      toDeleteOps.push(op.op_id);
      conflicts += 1;
    }
    // 'invalid' / 'not_found' stay queued: they are fixable, not terminal.
  }

  if (toPut.length || toDeleteOps.length) {
    await tx(db, [STORE_DOCS, STORE_OUTBOX], 'readwrite', (t) => {
      const docs = t.objectStore(STORE_DOCS);
      const outbox = t.objectStore(STORE_OUTBOX);
      for (const d of toPut) docs.put(d);
      for (const id of toDeleteOps) outbox.delete(id);
    });
  }
  const pending = await outboxCount();
  return { applied, conflicts, duplicates, failed: 0, pending };
}

/**
 * Replace local state with the server's, WITHOUT dropping unsynced local work.
 *
 * A pull that clobbered the outbox would defeat the point of local-first: a
 * creator editing offline would lose the edit the moment the tab reconnected
 * and pulled. Local documents with a pending or conflicting state are kept.
 */
export async function pullAndMerge({ apiBase, token }) {
  const db = await openDb();
  let ideas = [];
  try {
    const r = await fetch(`${apiBase}/creatoros/ideas`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) return { merged: 0, error: r.status };
    const d = await r.json();
    ideas = d.ideas || [];
  } catch (e) {
    return { merged: 0, offline: true };
  }

  const outbox = await outboxAll();
  const dirty = new Set(outbox.map((o) => o.doc_id));
  const toPut = [];
  for (const idea of ideas) {
    if (dirty.has(idea.id)) continue;  // never overwrite unsynced local edits
    toPut.push({ ...idea, server_version: idea.version, local_version: 0,
                 sync_state: 'synced' });
  }
  if (toPut.length) {
    await tx(db, [STORE_DOCS], 'readwrite', (t) => {
      const docs = t.objectStore(STORE_DOCS);
      for (const d of toPut) docs.put(d);
    });
  }
  return { merged: toPut.length };
}

export async function listConflicts({ apiBase, token }) {
  try {
    const r = await fetch(`${apiBase}/creatoros/ideas/conflicts/list`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) return [];
    const d = await r.json();
    return d.conflicts || [];
  } catch (e) {
    return [];
  }
}

export async function resolveConflict({ apiBase, token, conflictId, resolution }) {
  const r = await fetch(`${apiBase}/creatoros/ideas/conflicts/${conflictId}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ resolution }),
  });
  if (!r.ok) throw new Error(`resolve failed: ${r.status}`);
  const d = await r.json();
  // Adopt the resolved document locally so the editor shows the outcome.
  const db = await openDb();
  await tx(db, [STORE_DOCS], 'readwrite', (t) => {
    t.objectStore(STORE_DOCS).put({
      ...d.doc, server_version: d.doc.version, local_version: 0, sync_state: 'synced',
    });
  });
  return d;
}

export async function clearAll() {
  const db = await openDb();
  await tx(db, [STORE_DOCS, STORE_OUTBOX], 'readwrite', (t) => {
    t.objectStore(STORE_DOCS).clear();
    t.objectStore(STORE_OUTBOX).clear();
  });
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

/**
 * Bring back a soft-deleted idea.
 *
 * Deleting locally sets `deleted` and queues a delete op; restoring is the same
 * shape in reverse, so a creator who deletes by mistake gets the idea back
 * rather than having to recreate it.
 */
export async function restoreLocal(id) {
  const db = await openDb();
  const doc = await getLocal(id);
  if (!doc) return null;
  const cid = await clientId();
  const local = { ...doc, deleted: false, sync_state: 'pending', updated_at: nowIso() };
  const op = {
    op_id: newOpId(),
    doc_id: id,
    op_type: 'upsert',
    base_version: doc.server_version ?? null,
    title: local.title,
    blocks: local.blocks,
    status: local.status,
    tags: local.tags,
    parent_id: local.parent_id ?? null,
    is_pinned: !!local.is_pinned,
    scheduled_for: local.scheduled_for ?? null,
    published_at: local.published_at ?? null,
    exclude_from_twin: !!local.exclude_from_twin,
    origin: 'creator',
    client_id: cid,
    create_if_missing: doc.server_version == null,
    queued_at: nowIso(),
  };
  await tx(db, [STORE_DOCS, STORE_OUTBOX], 'readwrite', (t) => {
    t.objectStore(STORE_DOCS).put(local);
    t.objectStore(STORE_OUTBOX).put(op);
  });
  return local;
}

export async function listDeleted() {
  const db = await openDb();
  const docs = await reqp(db.transaction(STORE_DOCS).objectStore(STORE_DOCS).getAll());
  return (docs || []).filter((d) => d.deleted);
}

// ---------------------------------------------------------------------------
// Workspace surfaces that read the server directly
// ---------------------------------------------------------------------------
// The calendar, links and Twin state are all owner-scoped server state with no
// offline-editing story: they are views over what has already been synced. They
// are fetched rather than mirrored into IndexedDB, so there is no second copy to
// fall out of step with the documents the editor writes.

async function getJson(url, token) {
  try {
    const r = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

async function postJson(url, token, body) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

/** The publishing calendar, read from the same rows the editor writes. */
export async function fetchCalendar({ apiBase, token }) {
  const d = await getJson(`${apiBase}/creatoros/ideas/calendar`, token);
  return d || { entries: [], unscheduled: [] };
}

/** Explicit links between the creator's own ideas. */
export async function fetchLinks({ apiBase, token, docId = null }) {
  const q = docId ? `?doc_id=${encodeURIComponent(docId)}` : '';
  const d = await getJson(`${apiBase}/creatoros/ideas/links${q}`, token);
  return (d && d.links) || [];
}

export async function createLink({ apiBase, token, fromDocId, toDocId, note = null }) {
  return postJson(`${apiBase}/creatoros/ideas/links`, token, {
    from_doc_id: fromDocId, to_doc_id: toDocId, kind: 'related', note,
  });
}

export async function removeLink({ apiBase, token, fromDocId, toDocId }) {
  try {
    const r = await fetch(
      `${apiBase}/creatoros/ideas/links?from_doc_id=${encodeURIComponent(fromDocId)}`
      + `&to_doc_id=${encodeURIComponent(toDocId)}`,
      { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return r.ok;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Creator Twin state
// ---------------------------------------------------------------------------

export async function fetchTwinStatus({ apiBase, token }) {
  return getJson(`${apiBase}/creatoros/twin/status`, token);
}

export async function fetchTwinContext({ apiBase, token, docId = null }) {
  const q = docId ? `?doc_id=${encodeURIComponent(docId)}` : '';
  return getJson(`${apiBase}/creatoros/twin/context${q}`, token);
}

export async function updateTwinProfile({ apiBase, token, patch }) {
  return postJson(`${apiBase}/creatoros/twin/profile`, token, patch);
}

/** Ask the server to re-derive the Twin's observations now. */
export async function observeTwin({ apiBase, token, force = false }) {
  return postJson(`${apiBase}/creatoros/twin/observe`, token, { force });
}

/** Remove one derived pattern, permanently. */
export async function dismissObservation({ apiBase, token, kind, value }) {
  return postJson(`${apiBase}/creatoros/twin/observations/dismiss`, token, { kind, value });
}
