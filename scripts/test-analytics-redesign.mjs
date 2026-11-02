// Guard the Analytics workspace.
//
// The Analytics tab (admin only) has one main content: the Growth surface, with
// exactly four tabs (Sources, Prospects, Approvals, Conversations). The old
// "Analytics snapshot" (AnalyticsTab -> GET /growth/analytics) and its
// "Secondary analytics" switcher were a second navigation system stacked over
// the four tabs, so they were removed outright. This test fails loudly if that
// secondary surface or its switcher/state comes back, or if the Growth surface
// stops being the direct content of the tab.
//
// The fee monitor (Konduyt Sentinel) shares the tab and is intentionally kept.
//
// Run: node scripts/test-analytics-redesign.mjs
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

console.log('Analytics workspace');
console.log('-------------------');

const page = read('app/dashboard/page.js');

// The removed /admin/analytics endpoints must not be called from the dashboard.
check('the removed /admin/analytics endpoints are not called',
  !/admin\/analytics/.test(page));

// The old inline analytics surface's state and loader are gone. A page.js
// reference to a variable that no longer exists is only resolved when React
// renders the tab, so it once shipped and crashed Analytics with
// "analyticsLoading is not defined". The removal must stay complete.
check('no orphaned reference to the deleted analytics state',
  !/analyticsLoading|analyticsOverview|analyticsUsers|loadAnalytics/.test(page));
check('the deleted analytics state is not re-declared',
  !/(const|let|var)\s+analyticsOverview\b/.test(page));

// --- The Analytics snapshot surface is gone, not hidden. --------------------
const hasFile = (rel) => {
  try { readFileSync(join(ROOT, rel), 'utf8'); return true; } catch { return false; }
};
check('the AnalyticsTab component file is removed',
  !hasFile('app/dashboard/AnalyticsTab.js'));
check('page.js no longer imports AnalyticsTab',
  !/import\s+AnalyticsTab\b/.test(page));
check('page.js no longer renders AnalyticsTab',
  !/<AnalyticsTab[\s/>]/.test(page));
check('the analyticsView switcher state is gone',
  !/analyticsView/.test(page) && !/setAnalyticsView/.test(page));
check('the "Secondary analytics" switcher is gone',
  !/Secondary analytics/.test(page));
check('no Analytics snapshot control remains',
  !/Analytics snapshot/.test(page));
check('no Growth workspace switcher chip remains',
  !/Growth workspace/.test(page));

// --- Growth is the direct and only main content of the tab. -----------------
check('page.js renders Growth under the admin analytics tab',
  /tab === 'analytics' && isAdmin[\s\S]{0,1500}<GrowthTab/.test(page));
// The Growth render is not gated behind any secondary view switch.
check('the Growth render is not behind a view switch',
  !/analyticsView === 'growth'/.test(page));

// --- The payment surface that shares the tab is preserved. ------------------
check('the fee monitor is preserved', /Fee monitoring/.test(page));
// The Sentinel transaction-fee view MOVED to the Sentinel tab: it is a fee
// surface, so it lives with the rest of Sentinel. It must not remain on
// Analytics (no duplicate section) and must be present in SentinelTab.
const sentinelTabSrc = read('app/dashboard/SentinelTab.js');
check('the Sentinel transaction-fee view is gone from Analytics',
  !/Sentinel — transaction fees/.test(page));
check('the Sentinel transaction-fee view lives in the Sentinel tab',
  /Sentinel — transaction fees/.test(sentinelTabSrc)
  && /'transaction-fees',\s*'Transaction fees'/.test(sentinelTabSrc));

// No tax surface is reintroduced anywhere in the dashboard.
check('no Taxes tab is reintroduced', !/Taxes/.test(page));

console.log('-------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures === 0 ? 0 : 1);
