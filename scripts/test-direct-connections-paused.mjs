// Guard the PAUSED state of Direct Connections.
//
// Direct Connections was paused (not deleted) so the production product only
// shows payment methods/providers Konduyt can actually execute. This test fails
// loudly if a Direct Connections surface quietly returns to the production UI,
// so bringing it back has to be a deliberate, reviewed change (see
// paused/direct-connections/README.md).
//
// Run: node scripts/test-direct-connections-paused.mjs
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel) => existsSync(join(ROOT, rel));

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

console.log('Direct Connections is paused');
console.log('----------------------------');

const page = read('app/dashboard/page.js');

// The dashboard no longer reaches a Direct Connections surface.
check('page.js does not import DirectConnections',
  !/import\s+DirectConnections\s+from/.test(page));
check('page.js does not render <DirectConnections>',
  !/<DirectConnections\b/.test(page));
check('page.js registers no direct tab',
  !/\['direct'/.test(page));
check('page.js carries no direct TAB_TITLES entry',
  !/^\s*direct:\s/m.test(page));

// The components are isolated, intact and recoverable.
check('DirectConnections.js is kept in paused/',
  exists('paused/direct-connections/app/dashboard/DirectConnections.js'));
check('DirectConnectionsCountries.js is kept in paused/',
  exists('paused/direct-connections/app/dashboard/DirectConnectionsCountries.js'));
check('DirectConnections.js is gone from app/dashboard/',
  !exists('app/dashboard/DirectConnections.js'));
check('DirectConnectionsCountries.js is gone from app/dashboard/',
  !exists('app/dashboard/DirectConnectionsCountries.js'));

// The global directory/landscape is not rendered anywhere on its own either.
check('no dashboard surface imports the country browser',
  !/DirectConnectionsCountries/.test(page));

// The checkout SDK does not render Direct options. (The word "directly" in the
// footer's "money goes directly to the merchant" line is Konduyt's core
// positioning, not Direct Connections, so the guard targets the feature's own
// tokens rather than the word "direct".)
const sdk = read('public/konduyt.js');
check('konduyt.js does not read direct_options', !/direct_options/.test(sdk));
check('konduyt.js does not branch on a direct option', !/\.direct\b/.test(sdk));
check('konduyt.js has no Direct next-step renderer', !/directNextStep/.test(sdk));
check('konduyt.js does not name a Direct route', !/Direct to merchant/.test(sdk));
// A quoted label, so the pause comment explaining the feature does not trip it.
check('konduyt.js renders no "Direct Connection" route label',
  !/'Direct Connection'/.test(sdk));

// The paused suite files are kept with the components, not left in scripts/.
check('the Direct render tests are kept in paused/',
  exists('paused/direct-connections/scripts/test-direct-connections-render.mjs')
  && exists('paused/direct-connections/scripts/test-direct-connections-countries-render.mjs'));
check('the Direct fixture is kept in paused/',
  exists('paused/direct-connections/scripts/fixtures/direct-connections.sample.json'));

console.log('----------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
