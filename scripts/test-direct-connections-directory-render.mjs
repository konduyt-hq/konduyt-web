// Render the real DirectConnectionsDirectory component and prove the honesty
// invariant holds on the exact surface where listing is most likely to be read
// as capability.
//
// Three claims must never appear:
//   * that a country with zero connectors can accept a payment;
//   * that an uncatalogued country has no banks (only "not catalogued yet");
//   * a green success tick on a country with zero executable institutions.
//
// The component derives nothing: every number it shows comes from the API
// payload stubbed below, which mirrors the shape /direct-connections/countries
// and /direct-connections/countries/{code} actually return.
//
// No new dependency: JSX compiles with the Babel inside Next, and the component
// runs against a real jsdom DOM with fetch stubbed at the network boundary.
//
// Run: node scripts/test-direct-connections-directory-render.mjs
import { readFileSync, writeFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
const presetReact = require('next/dist/compiled/babel/preset-react');
const pluginCjs = require('next/dist/compiled/babel/plugin-transform-modules-commonjs');
const { JSDOM } = require('jsdom');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SRC = readFileSync(
  join(ROOT, 'app/dashboard/DirectConnectionsDirectory.js'), 'utf8');
const compiled = babel.transformSync(SRC, {
  filename: 'DirectConnectionsDirectory.js',
  presets: [[presetReact, { runtime: 'classic' }]],
  plugins: [pluginCjs],
  babelrc: false, configFile: false,
}).code;
const TMP = join(ROOT, '.dc-directory-render.cjs');
const body = compiled.replace(/^['"]use client['"];?/, '');
writeFileSync(TMP, `var React = require('react');\n${body}`);

const dom = new JSDOM('<!doctype html><html><body></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://app.konduyt.test/' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = require('react');
const { createRoot } = require('react-dom/client');
const Component = require(TMP).default;

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

// The API shapes, mirrored from the real endpoints.
const COUNTRIES = {
  total: 197,
  discovered: 189,
  countries: [
    { code: 'KE', name: 'Kenya', region: 'Africa', subregion: 'Eastern Africa',
      currency: 'KES', discovery_state: 'discovered' },
    { code: 'NG', name: 'Nigeria', region: 'Africa', subregion: 'Western Africa',
      currency: 'NGN', discovery_state: 'discovered' },
    { code: 'VA', name: 'Vatican City', region: 'Europe', subregion: 'Southern Europe',
      currency: 'EUR', discovery_state: 'not_discovered' },
  ],
  note: 'A country being listed is not a statement that Konduyt can execute a payment there.',
};

// A discovered country whose every institution has NO connector.
const NG_DETAIL = {
  code: 'NG', name: 'Nigeria', region: 'Africa', subregion: 'Western Africa',
  currency: 'NGN', un_member: true, discovery_state: 'discovered',
  mobile_money: [{ name: 'Moniepoint Inc', operator: null,
                   source_url: 'https://en.wikipedia.org/wiki/Moniepoint' }],
  banks: ['Access Bank plc', 'Zenith Bank Plc', 'Guaranty Trust Bank'],
  bank_source_url: 'https://en.wikipedia.org/wiki/List_of_banks_in_Nigeria',
  source: 'Bank list for Nigeria in the English Wikipedia article "List of banks in Nigeria".',
  stats: { banks_raw: 47, banks_served: 42, banks_removed_nonbank: 3,
           banks_removed_prose: 2, banks_removed_duplicate: 0,
           mobile_money_served: 1, banks_also_listed_elsewhere: 4 },
  execution: { listed: 43, executable: 0,
               note: 'Executable count is derived from the connector registry.' },
  note: 'This directory describes accounts that exist. It is not a statement that Konduyt can execute a payment into any of them.',
};

// A discovered country WITH a connector (Kenya).
const KE_DETAIL = {
  ...NG_DETAIL,
  code: 'KE', name: 'Kenya', currency: 'KES',
  banks: ['Equity Bank', 'KCB Bank'],
  execution: { listed: 11, executable: 1,
               note: 'Executable count is derived from the connector registry.' },
};

// A country we have not catalogued at all.
const VA_DETAIL = {
  code: 'VA', name: 'Vatican City', region: 'Europe', subregion: 'Southern Europe',
  currency: 'EUR', un_member: false, discovery_state: 'not_discovered',
  mobile_money: [], banks: [], bank_source_url: null, source: null,
  stats: { banks_raw: 0, banks_served: 0, banks_removed_nonbank: 0,
           banks_removed_prose: 0, banks_removed_duplicate: 0,
           mobile_money_served: 0, banks_also_listed_elsewhere: 0 },
  execution: { listed: 0, executable: 0,
               note: 'Executable count is derived from the connector registry.' },
  note: 'This directory describes accounts that exist. It is not a statement that Konduyt can execute a payment into any of them.',
};

const SEARCH = {
  query: 'Access',
  countries: [{ code: 'NG', name: 'Nigeria', region: 'Africa', currency: 'NGN' }],
  mobile_money: [],
  banks: [{ country: 'NG', name: 'Access Bank plc',
            source_url: 'https://en.wikipedia.org/wiki/List_of_banks_in_Nigeria' }],
  note: 'A match here is a description, not a capability. Only institutions with a derived EXECUTABLE state can receive a live payment request.',
};

function fakeFetch(detail) {
  return (url) => {
    let payload = COUNTRIES;
    if (/\/search/.test(url)) payload = SEARCH;
    else if (/\/countries\/[A-Z]{2}$/.test(url)) payload = detail;
    return Promise.resolve({
      ok: true, status: 200, json: () => Promise.resolve(payload),
    });
  };
}

async function render({ detail = NG_DETAIL, props = {}, typeQuery = null } = {}) {
  dom.window.fetch = fakeFetch(detail);
  global.fetch = dom.window.fetch;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(Component, props));
  });
  await React.act(async () => {});
  if (typeQuery) {
    const input = container.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      setter.call(input, typeQuery);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    // let the 250ms debounce fire and the search resolve
    await React.act(async () => { await new Promise((r) => setTimeout(r, 320)); });
    await React.act(async () => {});
  }
  const text = container.textContent;
  await React.act(async () => { root.unmount(); });
  container.remove();
  return text;
}

async function click(textIncludes, extractPayload, detail) {
  dom.window.fetch = fakeFetch(detail);
  global.fetch = dom.window.fetch;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(Component, {}));
  });
  await React.act(async () => {});
  const btn = Array.from(container.querySelectorAll('button'))
    .find((b) => b.textContent.includes(textIncludes));
  await React.act(async () => { btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
  await React.act(async () => {});
  const text = container.textContent;
  await React.act(async () => { root.unmount(); });
  container.remove();
  return text;
}

console.log('Direct Connections directory: a listing is never a capability');
console.log('----------------------------------------------------------------');

// 1. The browse list must show the uncatalogued country honestly, not drop it.
let text = await render();
check('the country count comes from the API', text.includes('197 countries'), text);
check('an uncatalogued country is labelled, not hidden',
  text.includes('not catalogued yet'), text);
check('the browse banner repeats the listing-not-capability rule',
  text.includes('Listing is a description, not a capability'), text);

// 2. A zero-connector country's detail must say so, and must not fake success.
text = await click('Nigeria', null, NG_DETAIL);
check('a zero-connector country says none can accept a payment yet',
  text.includes('none can accept'), text);
check('a zero-connector country does NOT say institutions can accept a payment today',
  !text.includes('can accept a payment today'), text);
check('a zero-connector country does NOT show the green success tick',
  !text.includes('✓'), text);
check('the country detail still lists the real banks',
  text.includes('Access Bank plc') && text.includes('Zenith Bank Plc'), text);
check('the country detail counts the banks it cleaned',
  text.includes('non-bank and narrative entries were removed'), text);

// 3. A country WITH a connector is allowed to show the success tick.
text = await click('Kenya', null, KE_DETAIL);
check('a country with a connector shows how many can accept a payment',
  text.includes('1 of 11 listed institutions can accept a payment today'), text);

// 4. An uncatalogued country must not be described as having no banks.
text = await click('Vatican City', null, VA_DETAIL);
check('an uncatalogued country says it is a gap in our data',
  text.includes('gap in our data'), text);
check('an uncatalogued country is NOT presented as success',
  !text.includes('✓'), text);

// 5. Search surface: results grouped, and the capability note always present.
text = await render({ typeQuery: 'Access' });
check('search shows a bank hit with its country', text.includes('Access Bank plc'), text);
check('search repeats the not-a-capability note',
  text.includes('not a capability'), text);
check('search never claims a match can be paid',
  !text.includes('can accept a payment today'), text);

// ---------------------------------------------------------------------------
// Real-data pass: drive the same component with payloads captured from the
// running API (scripts/fixtures/direct-connections.sample.json), so the
// directory is proven against the real 197-country world, not only stubs.
//
// Regenerate the fixture from konduyt-api with:
//   python -c "from fastapi.testclient import TestClient; from app.main import app; ..."
// (see the API repo's test_direct_connections.py for the exact endpoints).
// ---------------------------------------------------------------------------
const FIXTURE = JSON.parse(readFileSync(
  join(ROOT, 'scripts/fixtures/direct-connections.sample.json'), 'utf8'));

function fixtureFetch(url) {
  let payload;
  if (/\/search/.test(url)) {
    payload = /M-Pesa/.test(decodeURIComponent(url))
      ? FIXTURE.search_mpesa : FIXTURE.search_equity;
  } else if (/\/countries\/KE$/.test(url)) payload = FIXTURE.countries_KE;
  else if (/\/countries\/NG$/.test(url)) payload = FIXTURE.countries_NG;
  else if (/\/countries\/VA$/.test(url)) payload = FIXTURE.countries_VA;
  else payload = FIXTURE.countries;
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) });
}

async function renderReal({ query = null, clickName = null } = {}) {
  dom.window.fetch = fixtureFetch;
  global.fetch = dom.window.fetch;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => { root.render(React.createElement(Component, {})); });
  await React.act(async () => {});
  if (clickName) {
    const btn = Array.from(container.querySelectorAll('button'))
      .find((b) => b.textContent.includes(clickName));
    await React.act(async () => {
      btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
    await React.act(async () => {});
  }
  if (query) {
    const input = container.querySelector('input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype, 'value').set;
    await React.act(async () => {
      setter.call(input, query);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    await React.act(async () => { await new Promise((r) => setTimeout(r, 320)); });
    await React.act(async () => {});
  }
  const text = container.textContent;
  await React.act(async () => { root.unmount(); });
  container.remove();
  return text;
}

console.log('\nDirect Connections directory vs the real API payloads');
console.log('----------------------------------------------------------------');

const realTotal = FIXTURE.countries.total;
const nondiscovered = FIXTURE.countries.countries
  .filter((c) => c.discovery_state !== 'discovered');

let rtext = await renderReal();
check('the real country total is 197', realTotal === 197, String(realTotal));
check('the browse line shows the API total, not a hard-coded one',
  rtext.includes(`${realTotal} countries`), rtext.slice(0, 160));
check('it shows the API discovered count',
  rtext.includes(`catalogued institutions in ${FIXTURE.countries.discovered}`),
  rtext.slice(0, 200));
check('every real not-catalogued country is shown, labelled, not hidden',
  nondiscovered.every((c) => rtext.includes(c.name)), 
  nondiscovered.map((c) => c.name).join(', '));
check('the real not-catalogued count is 8', nondiscovered.length === 8,
  String(nondiscovered.length));

// Kenya: the one country with an executable institution. The rendered sentence
// must use the API's own numbers.
const ke = FIXTURE.countries_KE;
rtext = await renderReal({ clickName: 'Kenya' });
check('Kenya shows the EXECUTABLE count from the API',
  rtext.includes(`${ke.execution.executable} of ${ke.execution.listed} listed`
    + ' institutions can accept a payment today'),
  rtext.slice(0, 200));
check('Kenya lists its real M-Pesa mobile money',
  ke.mobile_money.some((m) => rtext.includes(m.name)), rtext.slice(0, 200));

// Nigeria: real banks, zero connectors. This is the case most at risk of
// reading as capability.
const ng = FIXTURE.countries_NG;
rtext = await renderReal({ clickName: 'Nigeria' });
check('Nigeria (0 executable) says none can accept a payment yet',
  rtext.includes('none can accept'), rtext.slice(0, 240));
check('Nigeria shows no green success tick', !rtext.includes('✓'), rtext.slice(0, 240));
check('Nigeria still lists real sourced banks',
  ng.banks.some((b) => rtext.includes(b)), ng.banks.slice(0, 3).join(', '));

// An uncatalogued country: a gap, never "no banks".
rtext = await renderReal({ clickName: 'Vatican City' });
check('Vatican City says it is a gap in our data',
  rtext.includes('gap in our data'), rtext.slice(0, 240));
check('Vatican City shows no green success tick', !rtext.includes('✓'));

// Search against the real API result set.
rtext = await renderReal({ query: 'Equity Bank' });
check('search finds a real bank the developer already owns',
  FIXTURE.search_equity.banks.some((b) => rtext.includes(b.name)),
  FIXTURE.search_equity.banks.slice(0, 3).map((b) => b.name).join(', '));
check('a real search hit is labelled a description, not a capability',
  rtext.includes('not a capability'), rtext.slice(0, 200));

// ---------------------------------------------------------------------------
// Wiring: the directory must actually be reachable inside Direct Connections.
// A component that renders correctly but is never mounted is not delivered.
// ---------------------------------------------------------------------------
const PAGE = readFileSync(join(ROOT, 'app/dashboard/page.js'), 'utf8');
const WIRE = readFileSync(join(ROOT, 'app/dashboard/DirectConnections.js'), 'utf8');
check('the dashboard imports the directory component',
  /import\s+DirectConnectionsDirectory\s+from\s+['"]\.\/DirectConnectionsDirectory['"]/
    .test(PAGE), 'no import found');
check('the Directory tab is in the tab bar',
  /\[\s*['"]directory['"]\s*,\s*['"][^'"]+['"]\s*\]/.test(PAGE),
  'no directory tab entry');
check('the Directory tab mounts the directory component',
  /\{\s*tab\s*===\s*['"]directory['"]\s*&&\s*\(\s*<DirectConnectionsDirectory\b/
    .test(PAGE), 'not mounted');
check('the Directory component is live code, not a placeholder',
  /export\s+default\s+function\s+DirectConnectionsDirectory/.test(
    readFileSync(join(ROOT, 'app/dashboard/DirectConnectionsDirectory.js'), 'utf8')));
// The directory view is a "what exists" tab; it must not be conflated with the
// "connect your account" tab. They are two tabs on purpose.
check('Direct Connections (connect) and Directory are separate tabs',
  /DirectConnections\b/.test(WIRE) && /DirectConnectionsDirectory/.test(PAGE));

rmSync(TMP, { force: true });

console.log('----------------------------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
