// Guard the redesigned Analytics surface.
//
// The old Analytics tab mixed growth agents, user counts, tax sentinels and
// transaction-price-change panels into one wall of numbers. The redesign is a
// single read of GET /growth/analytics, blockers first, in four areas: growth
// overview, agents, sources and outreach ops. This test fails loudly if the
// dashboard regresses -- if it re-adds a tax surface, reads the removed
// /admin/analytics endpoints, or drops one of the four areas.
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

console.log('Analytics redesign');
console.log('------------------');

const tab = read('app/dashboard/AnalyticsTab.js');
const page = read('app/dashboard/page.js');

// The redesign reads the one real snapshot endpoint and nothing cached.
check('the Analytics surface reads GET /growth/analytics',
  /`\$\{apiBase\}\/growth\/analytics`/.test(tab));
check('the removed /admin/analytics endpoints are not called',
  !/admin\/analytics/.test(tab) && !/admin\/analytics/.test(page));

// Blockers are computed and shown first, before any area.
check('blockers are rendered before the areas',
  tab.indexOf('an-blockers') > -1 && tab.indexOf('an-blockers') < tab.indexOf('con-tabs'));
check('an empty blocker list says so honestly', /No blockers detected/.test(tab));

// The four areas exist and are reachable.
check('A - Growth overview is registered', /'overview', 'A · Growth overview'/.test(tab));
check('B - Agents is registered', /'agents', 'B · Agents'/.test(tab));
check('C - Sources is registered', /'sources', 'C · Sources'/.test(tab));
check('D - Outreach ops is registered', /'outreach', 'D · Outreach ops'/.test(tab));
check('each area renders its own component',
  /AreaOverview/.test(tab) && /AreaAgents/.test(tab) && /AreaSources/.test(tab)
  && /AreaOutreach/.test(tab));

// Sources area is read/write through the real audit + retire/restore endpoints.
check('Sources reads the audit endpoint', /\/growth\/sources\/audit/.test(tab));
check('Sources can retire a source', /act\(s\.source, 'retire'\)/.test(tab));
check('Sources can restore a source', /act\(s\.source, 'restore'\)/.test(tab));

// page.js wires the component into the admin-only analytics tab.
check('page.js imports AnalyticsTab', /import AnalyticsTab from '\.\/AnalyticsTab'/.test(page));
check('page.js renders AnalyticsTab under the admin analytics tab',
  /tab === 'analytics' && isAdmin[\s\S]{0,400}<AnalyticsTab/.test(page));

// The payment surfaces that share the tab are preserved.
check('the fee monitor is preserved', /Fee monitoring/.test(page));
check('the Sentinel transaction-fee view is preserved', /Sentinel — transaction fees/.test(page));
check('the Growth agents surface is preserved', /<GrowthTab/.test(page));

// No tax surface is reintroduced anywhere in the dashboard.
check('no Taxes tab is reintroduced', !/Taxes/.test(page) && !/Taxes/.test(tab));

console.log('------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures === 0 ? 0 : 1);
