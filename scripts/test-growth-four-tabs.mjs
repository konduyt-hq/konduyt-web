// Guard the Growth surface's four primary tabs.
//
// The product asked for exactly four primary tabs -- Sources, Prospects,
// Approvals, Conversations -- with everything else behind a secondary menu.
// This test fails loudly if the surface regresses: if a fifth tab appears in
// the primary row, if a primary tab is dropped, if a secondary surface is
// deleted rather than demoted, or if the Approvals review window stops being
// surfaced.
//
// Run: node scripts/test-growth-four-tabs.mjs
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

console.log('Growth four-tab redesign');
console.log('-------------------------');

const growth = read('app/dashboard/GrowthTab.js');
const page = read('app/dashboard/page.js');

// --- The primary row is exactly the four tabs, in order. --------------------
const primaryBlock = growth.match(/const PRIMARY_VIEWS = \[([\s\S]*?)\];/);
check('PRIMARY_VIEWS is declared', !!primaryBlock);
const primary = primaryBlock ? primaryBlock[1] : '';
const primaryIds = [...primary.matchAll(/\['([a-z]+)',/g)].map((m) => m[1]);
check('exactly four primary tabs', primaryIds.length === 4,
  `found ${primaryIds.length}: ${primaryIds.join(', ')}`);
check('the four primary tabs are Sources, Prospects, Approvals, Conversations',
  primaryIds.join(',') === 'sources,prospects,approvals,conversations',
  primaryIds.join(','));

// The primary row renders PRIMARY_VIEWS, never the full list.
check('the nav renders PRIMARY_VIEWS', /PRIMARY_VIEWS\.map/.test(growth));
check('the nav does not render the full VIEWS list in the primary row',
  !/\{VIEWS\.map/.test(growth));

// --- The secondary surfaces are demoted, not deleted. -----------------------
const secondaryBlock = growth.match(/const SECONDARY_VIEWS = \[([\s\S]*?)\];/);
check('SECONDARY_VIEWS is declared', !!secondaryBlock);
const secondary = secondaryBlock ? secondaryBlock[1] : '';
for (const id of ['live', 'cohort', 'strategy', 'experiment', 'overview',
  'contacts', 'agents', 'diagnostics', 'settings']) {
  check(`secondary surface "${id}" is preserved`, new RegExp(`'${id}'`).test(secondary));
}
check('the secondary menu is reachable from the primary row',
  /con-tab-more-menu/.test(growth) && /con-tab-more-item/.test(growth));

// --- Each primary tab still renders its real component. ---------------------
check('Sources renders the Sources component', /view === 'sources'[\s\S]{0,200}<Sources/.test(growth));
check('Prospects renders the Prospects component', /view === 'prospects'[\s\S]{0,200}<Prospects/.test(growth));
check('Approvals renders the Approvals component', /view === 'approvals'[\s\S]{0,200}<Approvals/.test(growth));
check('Conversations renders the Conversations component',
  /view === 'conversations'[\s\S]{0,200}<Conversations/.test(growth));

// --- The default view is a primary tab, not a secondary one. ----------------
check('the default view is Sources (the first primary tab)',
  /return 'sources';/.test(growth) && !/return 'live';/.test(growth));

// --- The review window is surfaced on Approvals. ----------------------------
check('Approvals surfaces the human review window',
  /review window/.test(growth) && /windowMin/.test(growth));
check('Approvals reads the review window from settings',
  /review_window_minutes/.test(growth));

// --- Conversations is a real surface, not a stub. ---------------------------
check('Conversations reads GET /conversations', /api\('\/conversations/.test(growth));
check('Conversations shows delivery + reply summary',
  /Delivered/.test(growth) && /Replies/.test(growth));
check('Conversations surfaces objections and opt-outs',
  /Objections/.test(growth) && /opt-outs|optouts/i.test(growth));

// --- Sources shows where prospects come from. ------------------------------
check('Sources shows attribution ("where prospects come from")',
  /Where prospects come from/.test(growth)
  && /metrics\/attribution/.test(growth));

// --- The Sources load cannot be blanked by one failing read. ----------------
// The bug: a Promise.all over four reads meant the audit or attribution
// failing took the keyword list down with it, so the surface looked empty
// while discovery was actually running. Each read must settle on its own,
// and a real failure must be shown rather than rendered as "no keywords".
const sourcesBlock = growth.match(/function Sources\(\{ api[\s\S]*?\n\}/);
const sourcesBody = sourcesBlock ? sourcesBlock[0] : '';
check('the Sources loader settles each read independently',
  /Promise\.allSettled/.test(sourcesBody));
check('the Sources loader does not fail the whole panel on one read',
  !/Promise\.all\(/.test(sourcesBody));
check('a failed keyword read is surfaced, not rendered as empty',
  /loadError/.test(sourcesBody) && /Could not load keywords/.test(sourcesBody));
check('an empty keyword list is distinguished from a failed one',
  /keywords\.length === 0/.test(sourcesBody) && /No keywords yet/.test(sourcesBody));
check('the keyword list is read from GET /keywords',
  /api\('\/keywords'\)/.test(sourcesBody));

// Execute the real loader with stubbed reads. The static checks above prove
// the shape; this proves the behaviour: the audit and attribution failing must
// not take the keyword list down with them, and a genuine keyword failure must
// surface as an error rather than as "no keywords".
const loadBody = sourcesBody.match(/const load = useCallback\(async \(\) => \{([\s\S]*?)\}, \[api\]\);/);
if (loadBody) {
  const runLoad = new Function('api', 'setSources', 'setKeywords', 'setAudit',
    'setAttribution', 'setLoadError', 'return (async () => {' + loadBody[1] + '})();');
  const runWith = async (api) => {
    const state = {};
    await runLoad(api, (v) => { state.sources = v; }, (v) => { state.keywords = v; },
      (v) => { state.audit = v; }, (v) => { state.attribution = v; },
      (v) => { state.loadError = v; });
    return state;
  };

  const supplementaryFail = await runWith(async (p) => {
    if (p === '/sources') return { sources: [{ id: 's1' }] };
    if (p === '/keywords') return { keywords: [{ id: 'k1', keyword: 'payments' }] };
    throw new Error(`boom ${p}`);
  });
  check('the keyword list survives a failing audit and attribution read',
    supplementaryFail.keywords?.length === 1 && supplementaryFail.loadError === '',
    JSON.stringify(supplementaryFail));

  const keywordFail = await runWith(async (p) => {
    if (p === '/keywords') throw new Error('keywords 500');
    return { sources: [{ id: 's1' }] };
  });
  check('a failing keyword read is reported, not swallowed',
    keywordFail.loadError === 'keywords 500' && (keywordFail.keywords || []).length === 0,
    JSON.stringify(keywordFail));
} else {
  check('the Sources loader is extractable for a behavioural test', false);
}

// --- page.js makes Growth primary and the snapshot secondary. ---------------
check('page.js renders GrowthTab under the admin analytics tab',
  /tab === 'analytics' && isAdmin[\s\S]{0,1200}<GrowthTab/.test(page));
check('page.js gates the Analytics snapshot behind a secondary control',
  /analyticsView === 'snapshot'/.test(page));

console.log('-------------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
