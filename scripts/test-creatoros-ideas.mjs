#!/usr/bin/env node
// Contract tests for the CreatorOS Ideas workspace and the Creator Twin UI.
//
// These read the source and the built output rather than driving a browser, so
// they run in the normal offline test pass alongside the other suites. They
// assert the properties the brief makes load-bearing:
//
//   * the workspace is local-first and queues writes durably;
//   * sync is idempotent because it reuses one client-generated op id per change;
//   * a conflict keeps both versions and offers the creator the choice;
//   * a pull never clobbers unsynced local edits;
//   * the Twin is opt-in, is only invoked by an explicit ask, and cannot write
//     to a document;
//   * the Twin reports honestly when no model is configured.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
let checks = 0;
let failures = 0;

function check(name, passed, detail = '') {
  checks += 1;
  if (!passed) failures += 1;
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${name}${!passed && detail ? ` — ${detail}` : ''}`);
}

function read(p) {
  const full = resolve(root, p);
  if (!existsSync(full)) return null;
  return readFileSync(full, 'utf8');
}

const store = read('app/creators/ideas/store.js');
const page = read('app/creators/ideas/page.js');
const twinPanel = read('app/creators/ideas/TwinPanel.js');
const creatorsPage = read('app/creators/page.js');
const css = read('app/globals.css');

console.log('Ideas workspace — files');
check('the local-first store exists', !!store);
check('the ideas page exists', !!page);
check('the Twin panel exists', !!twinPanel);

console.log('\nIdeas workspace — local-first storage');
check('it uses IndexedDB, not just localStorage',
  !!store && /indexedDB\.open/.test(store) && !/localStorage\.setItem\([^)]*ideas/i.test(store));
check('there is a durable outbox store',
  !!store && /STORE_OUTBOX/.test(store) && /createObjectStore\(STORE_OUTBOX/.test(store));
check('a document write and its outbox entry share one transaction',
  !!store && /STORE_DOCS, STORE_OUTBOX\], 'readwrite'/.test(store));
check('the client generates its own operation ids',
  !!store && /export function newOpId/.test(store) && /op_id:\s*opId/.test(store));
check('the same op id is reused on retry (idempotency comes from the server keying on it)',
  !!store && /STORE_OUTBOX\)\.put\(op\)/.test(store)
  && /const ops = await outboxAll\(\)/.test(store)
  && /ops\.map\(stripOp\)/.test(store)
  && !/newOpId\(\)[\s\S]{0,400}stripOp/.test(store));

console.log('\nIdeas workspace — sync behaviour');
check('a failed sync leaves the outbox intact',
  !!store && /offline: true/.test(store) && /catch \(e\) \{[\s\S]{0,200}pending: ops\.length/.test(store));
check('terminal results remove the op from the outbox',
  !!store && /toDeleteOps\.push\(op\.op_id\)/.test(store));
check('a conflict marks the local copy instead of discarding it',
  !!store && /sync_state: 'conflict'/.test(store));
check('a pull never overwrites unsynced local edits',
  !!store && /if \(dirty\.has\(idea\.id\)\) continue;/.test(store));
check('the sync path is not blocked on the network for a local write',
  !!store && /export async function saveLocal/.test(store)
  && !/await fetch[\s\S]{0,200}export async function saveLocal/.test(store));

console.log('\nIdeas workspace — the editor');
check('the editor writes locally and debounces the network',
  !!page && /setTimeout\(async \(\) => \{[\s\S]{0,200}await saveLocal/.test(page));
check('an accepted Twin suggestion is saved with its own origin',
  !!page && /saveLocal\(next, \{ origin: 'twin_accepted' \}\)/.test(page));
check('the workspace requires the existing Konduyt session',
  !!page && /TOKEN_KEY = 'kdu_token'/.test(page) && /\/me/.test(page));
check('an unsigned-in visitor is told to sign in, not shown an error',
  !!page && /status === 'unauth'/.test(page) && /Sign in to your ideas/.test(page));
check('it reuses the existing sign-in page rather than a new auth flow',
  !!page && /href="\/signin\/"/.test(page));
check('a legacy sessionStorage session is migrated, not rejected',
  !!page && /sessionStorage\.getItem\(TOKEN_KEY\)/.test(page)
  && /localStorage\.setItem\(TOKEN_KEY, legacy\)/.test(page));
check('the block editor supports multiple block types',
  !!page && /BLOCK_TYPES\.map/.test(page) && /editBlock\(b\.id, \{ type:/.test(page));
check('the lifecycle stages are exposed as a control',
  !!page && /STATUSES\.map/.test(page));
check('there is a search over title, tags and body',
  !!page && /b\.text \|\| ''\)\.toLowerCase\(\)\.includes\(q\)/.test(page));

console.log('\nCreator Twin — opt-in and boundaries');
check('the Twin is off until the creator enables it',
  !!twinPanel && /!enabled \?/.test(twinPanel) && /Turn on my Twin/.test(twinPanel));
check('the Twin is only invoked from an explicit ask',
  !!twinPanel && /onClick=\{\(\) => ask\(k\.q\)\}/.test(twinPanel)
  && !/setInterval[\s\S]{0,120}\/twin\/ask/.test(twinPanel)
  && !/useEffect[\s\S]{0,400}\/twin\/ask/.test(twinPanel));
check('there is no timer that calls the Twin on its own',
  !!twinPanel && !/setTimeout\([\s\S]{0,120}ask\(/.test(twinPanel));
check('the Twin never writes to the document directly',
  !!twinPanel && !/ideas\/sync/.test(twinPanel) && !/patch\(\s*`\$\{apiBase\}\/creatoros\/ideas/.test(twinPanel));
check('inserting Twin text is an explicit creator action',
  !!twinPanel && /onClick=\{\(\) => onInsert\(m\.text\)\}/.test(twinPanel));
check('the panel shows what the Twin can see',
  !!twinPanel && /What does my Twin know\?/.test(twinPanel) && /twin\/context/.test(twinPanel));
check('the creator can correct the Twin direction',
  !!twinPanel && /twin\/profile/.test(twinPanel) && /placeholder="e\.g\. weekly long-form/.test(twinPanel));
check('an unavailable model is surfaced, not hidden',
  !!twinPanel && /No model configured — this needed one/.test(twinPanel)
  && /No AI provider is set up for this deployment/.test(twinPanel));
check('the panel states that it does not change the creator\'s words',
  !!twinPanel && /it never changes your words/.test(twinPanel));
check('the Twin can be turned off again',
  !!twinPanel && /Turn off/.test(twinPanel) && /disable/.test(twinPanel));

console.log('\nCreator entry point');
check('the creators page links to the Ideas workspace',
  !!creatorsPage && /href="\/creators\/ideas\/"/.test(creatorsPage));
check('the creators page still links to the Creator Audit',
  !!creatorsPage && /href="\/creators\/audit\/"/.test(creatorsPage));
check('the creators page does not claim the whole workspace is unopened',
  !!creatorsPage && !/The workspace itself is not open yet/.test(creatorsPage));

console.log('\nStyles');
check('the Ideas workspace has styles', !!css && /\.ideas-shell\{/.test(css));
check('the Twin panel has styles', !!css && /\.twin-panel\{/.test(css));
check('the workspace is responsive at the tablet breakpoint',
  !!css && /@media \(max-width:900px\)\{[\s\S]{0,300}\.ideas-shell\{flex-direction:column/.test(css));
check('the workspace is responsive at the phone breakpoint',
  !!css && /@media \(max-width:640px\)\{[\s\S]{0,300}\.ideas-main\{padding/.test(css));
check('tap targets are enlarged on phones',
  !!css && /@media \(max-width:640px\)\{[\s\S]{0,600}\.ideas-icon-btn\{padding:9px 12px/.test(css));

console.log('\nBuilt output');
const built = read('out/creators/ideas/index.html');
check('the ideas route was exported', !!built);
if (built) {
  // The page is a client component: the static export carries the pre-hydration
  // shell, and the workspace itself renders once the session is known. Asserting
  // the workspace markup here would be asserting something the export is not
  // supposed to contain.
  check('the exported shell renders the pre-hydration state',
    /Opening your workspace/.test(built));
  check('the exported page does not leak a token or a key',
    !/kdu_token/.test(built) && !/Bearer [A-Za-z0-9._-]{20,}/.test(built));
  check('the exported page does not hardcode an owner or a document id',
    !/owner_user_id/.test(built) && !/idea_[0-9a-f]{8}/.test(built));
}
// The workspace markup must exist in the client bundle the export loads.
const chunk = (() => {
  try {
    const base = resolve(root, 'out/_next/static/chunks');
    const files = [];
    (function walk(dir) {
      for (const f of readdirSync(dir)) {
        const full = resolve(dir, f);
        if (statSync(full).isDirectory()) walk(full);
        else if (f.endsWith('.js')) files.push(full);
      }
    })(base);
    return files.map((f) => readFileSync(f, 'utf8')).join('\n');
  } catch (e) { return null; }
})();
check('the client bundle carries the workspace and Twin code',
  !!chunk && /ideas-shell/.test(chunk) && /twin-panel/.test(chunk));
check('the client bundle names the sync endpoint',
  !!chunk && /creatoros\/ideas\/sync/.test(chunk));
const builtCreators = read('out/creators/index.html');
check('the creators page exports a link to ideas',
  !!builtCreators && /creators\/ideas/.test(builtCreators));

console.log('\n----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
