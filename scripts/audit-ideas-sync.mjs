// Real-browser behavioural audit of the Ideas local-first store.
//
//   BASE=http://localhost:4173 node scripts/audit-ideas-sync.mjs
//
// The offline suite reads store.js as text. This runs the actual module against a
// real IndexedDB in Chromium, so the properties that matter -- one queued op per
// document, and a base_version taken from the stored document rather than the
// caller's possibly-stale copy -- are proven rather than pattern-matched.

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = process.env.BASE || 'http://localhost:4173';
const SRC = readFileSync(join(ROOT, 'app/creators/ideas/store.js'), 'utf8')
  .replace(/^'use client';/, '');

let checks = 0, failures = 0;
const check = (name, ok, detail = '') => {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${!ok && detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${WEB}/creators/ideas/`, { waitUntil: 'domcontentloaded' });

// Inject the store as a real ES module (it has no imports of its own).
await page.evaluate(async (src) => {
  const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  window.__store = await import(url);
}, SRC);

const result = await page.evaluate(async () => {
  const s = window.__store;
  const out = {};

  // --- One queued op per document, carrying the newest payload --------------
  const { doc } = await s.createLocal({ title: 'first' });
  await s.saveLocal({ ...doc, title: 'second' });
  await s.saveLocal({ ...doc, title: 'third' });
  const ops = (await s.outboxAll()).filter((o) => o.doc_id === doc.id);
  out.opsAfterThreeEdits = ops.length;
  out.newestTitle = ops.length ? ops[0].title : null;

  // --- base_version comes from the stored document, not the caller ---------
  // Simulate what a sync/pull does: the server version of the stored doc moves on
  // while the editor still holds the copy it opened.
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('konduyt-ideas');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('docs', 'readwrite');
      const store = tx.objectStore('docs');
      const get = store.get(doc.id);
      get.onsuccess = () => {
        store.put({ ...get.result, server_version: 7 });
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
  // The caller still passes the stale copy (server_version null).
  const { doc: after, op } = await s.saveLocal({ ...doc, title: 'fourth' });
  out.opBaseVersion = op.base_version;
  out.docServerVersion = after.server_version;

  // --- Deleting a never-synced idea queues nothing ------------------------
  const { doc: fresh } = await s.createLocal({ title: 'never synced' });
  await s.deleteLocal(fresh.id);
  out.neverSyncedOps = (await s.outboxAll()).filter((o) => o.doc_id === fresh.id).length;

  // --- Deleting a synced idea does queue a delete -------------------------
  const { doc: synced } = await s.createLocal({ title: 'synced' });
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('konduyt-ideas');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('docs', 'readwrite');
      const store = tx.objectStore('docs');
      const get = store.get(synced.id);
      get.onsuccess = () => store.put({ ...get.result, server_version: 3 });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
  const delOp = await s.deleteLocal(synced.id);
  out.syncedDeleteType = delOp && delOp.op_type;
  out.syncedDeleteBase = delOp && delOp.base_version;

  return out;
});

check('three quick edits of one idea queue exactly one operation',
  result.opsAfterThreeEdits === 1, `got ${result.opsAfterThreeEdits}`);
check('the queued operation carries the newest edit',
  result.newestTitle === 'third', String(result.newestTitle));
check('base_version is taken from the stored document, not the stale caller copy',
  result.opBaseVersion === 7, `got ${result.opBaseVersion}`);
check('the stored document keeps the authoritative server version',
  result.docServerVersion === 7, `got ${result.docServerVersion}`);
check('deleting a never-synced idea queues no operation',
  result.neverSyncedOps === 0, `got ${result.neverSyncedOps}`);
check('deleting a synced idea queues a delete against its server version',
  result.syncedDeleteType === 'delete' && result.syncedDeleteBase === 3,
  `${result.syncedDeleteType} @ ${result.syncedDeleteBase}`);

await browser.close();
console.log('\n----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
