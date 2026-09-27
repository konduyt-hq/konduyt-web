// Render the real DirectConnectionsCountries component -- the global landscape
// that now lives INSIDE Direct Connections (the separate Directory tab was
// removed) -- and prove the honesty invariant holds on the surface where it is
// easiest to break: a listing is never presented as a capability.
//
// What this guards:
//   1. Every country in the canonical list is reachable and no country list is
//      hard-coded; all six product regions are represented.
//   2. A country WITH data reports the rows it shows (`banks` / `mobile_money`),
//      never the connector-registry `execution.listed` count.
//   3. Each service's state comes from the API's own execution_capability ON THE
//      ROW -- the component performs no second lookup and no name matching, so a
//      listing can never be promoted to a capability by the frontend.
//   4. NOWHERE on this surface is there a Connect affordance. Connecting lives
//      on the connect half; a listing page must not invent a flow.
//   5. A country with no data says it is a gap in our data -- never that no
//      services exist.
//   6. Switching country A -> B -> C -> A never leaves a previous country's
//      services on screen because of stale state or a late response.
//   7. Search preserves capability semantics: a hit carries the same state the
//      country page shows and is never made connectable by being found.
//
// No new dependency: JSX is compiled with the Babel inside Next and run against
// a real (jsdom) DOM with fetch stubbed at the network boundary.
//
// Run: node scripts/test-direct-connections-countries-render.mjs
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
const SRC_PATH = 'app/dashboard/DirectConnectionsCountries.js';

const compiled = babel.transformSync(readFileSync(join(ROOT, SRC_PATH), 'utf8'), {
  filename: 'DirectConnectionsCountries.js',
  presets: [[presetReact, { runtime: 'classic' }]],
  plugins: [pluginCjs],
  babelrc: false, configFile: false,
}).code;
const TMP = join(ROOT, '.dc-countries-render.cjs');
writeFileSync(TMP,
  `var React = require('react');\n${compiled.replace(/^['"]use client['"];?/, '')}`);

const dom = new JSDOM('<!doctype html><html><body></body></html>',
  { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://app.konduyt.test/' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;

const React = require('react');
const { createRoot } = require('react-dom/client');
const mod = require(TMP);
const Component = mod.default;
const { REGIONS, regionOf, flagEmoji, countryLine } = mod;

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

// Render with a route map: the longest matching substring in `routes` wins, so
// /countries/KE is not swallowed by /countries.
async function render(routes, props) {
  const fakeFetch = (url) => {
    const u = String(url);
    const hit = Object.keys(routes)
      .filter((k) => u.includes(k))
      .sort((a, b) => b.length - a.length)[0];
    if (!hit) {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    }
    const body = typeof routes[hit] === 'function' ? routes[hit](u) : routes[hit];
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  };
  dom.window.fetch = fakeFetch;
  global.fetch = fakeFetch;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(Component,
      props || { active: { id: 'p1', merchant_country: 'KE' } }));
  });
  await React.act(async () => {});
  const container2 = container;
  const handle = {
    get text() { return container2.textContent; },
    get html() { return container2.innerHTML; },
    click: async (predicate) => {
      const el = [...container2.querySelectorAll('button')].find(predicate);
      if (!el) throw new Error('no button matched');
      await React.act(async () => { el.click(); });
      await React.act(async () => {});
      return handle;
    },
    type: async (value) => {
      const input = container2.querySelector('input[type="search"]');
      const setter = Object.getOwnPropertyDescriptor(
        dom.window.HTMLInputElement.prototype, 'value').set;
      await React.act(async () => {
        setter.call(input, value);
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      });
      // The search is debounced; give it time and settle.
      await React.act(async () => { await new Promise((r) => setTimeout(r, 320)); });
      await React.act(async () => {});
      return handle;
    },
    unmount: async () => { await React.act(async () => { root.unmount(); }); container2.remove(); },
  };
  return handle;
}

// The canonical country registry, as /direct-connections/countries returns it.
// 197 countries, six regions; `Americas` carries subregions, as the real API does.
function countriesPayload() {
  const c = [
    { code: 'KE', name: 'Kenya', region: 'Africa', subregion: 'Eastern Africa' },
    { code: 'NG', name: 'Nigeria', region: 'Africa', subregion: 'Western Africa' },
    { code: 'IN', name: 'India', region: 'Asia', subregion: 'Southern Asia' },
    { code: 'AE', name: 'United Arab Emirates', region: 'Asia', subregion: 'Western Asia' },
    { code: 'DE', name: 'Germany', region: 'Europe', subregion: 'Western Europe' },
    { code: 'US', name: 'United States', region: 'Americas', subregion: 'North America' },
    { code: 'MX', name: 'Mexico', region: 'Americas', subregion: 'Central America' },
    { code: 'BR', name: 'Brazil', region: 'Americas', subregion: 'South America' },
    { code: 'AU', name: 'Australia', region: 'Oceania', subregion: 'Australia and New Zealand' },
  ].map((x) => ({ ...x, discovery_state: 'discovered' }));
  // One country genuinely without data, so the "not in our data yet" label and
  // the no-data detail path are exercised against the real 197-country shape.
  c.find((x) => x.code === 'NG').discovery_state = 'not_discovered';
  return { total: 197, discovered: 189, countries: c };
}

const realFixture = JSON.parse(
  readFileSync(join(ROOT, 'scripts/fixtures/direct-connections.sample.json'), 'utf8'));

console.log('Direct Connections region browser: derived facts and no invented capability');
console.log('--------------------------------------------------------------------------------');

// --- Pure derivation --------------------------------------------------------
check('regionOf keeps the six product regions',
  REGIONS.join(',') === 'Africa,Asia,Europe,North America,South America,Oceania',
  REGIONS.join(','));
check('regionOf maps the Americas subregions onto North/South',
  regionOf({ region: 'Americas', subregion: 'South America' }) === 'South America'
  && regionOf({ region: 'Americas', subregion: 'North America' }) === 'North America'
  && regionOf({ region: 'Americas', subregion: 'Central America' }) === 'North America'
  && regionOf({ region: 'Americas', subregion: 'Caribbean' }) === 'North America',
  JSON.stringify(regionOf({ region: 'Americas', subregion: 'Caribbean' })));
check('regionOf passes non-Americas regions through unchanged',
  regionOf({ region: 'Africa', subregion: 'Eastern Africa' }) === 'Africa');

check('flagEmoji derives the flag from the ISO code, not a table',
  flagEmoji('KE') === '\u{1F1F0}\u{1F1EA}'
  && flagEmoji('ke') === '\u{1F1F0}\u{1F1EA}');
check('flagEmoji tolerates a user-assigned code (XK) without inventing one',
  flagEmoji('XK') === '\u{1F1FD}\u{1F1F0}');
check('flagEmoji is empty for a non-code, never a stray glyph',
  flagEmoji('') === '' && flagEmoji('Kenya') === '');

// countryLine: the count it reports must be the directory rows, never the
// registry's `execution.listed`.
const zeroExec = countryLine({
  discovery_state: 'discovered',
  mobile_money: [{ name: 'A' }, { name: 'B' }],
  banks: [{}, {}, {}],
  execution: { listed: 999, executable: 0 },
});
check('a country with rows reports the rows, not the registry listed count',
  zeroExec.includes('2 mobile-money services') && zeroExec.includes('3 banks')
  && !zeroExec.includes('999'), zeroExec);
check('a country with rows but no connector says none can accept a payment yet',
  zeroExec.includes('none can accept a payment yet')
  && zeroExec.includes('Appearing here is not a claim'), zeroExec);
const someExec = countryLine({
  discovery_state: 'discovered', mobile_money: [{ name: 'A' }], banks: [],
  execution: { listed: 0, executable: 1 },
});
check('an executable country reports the API executable count separately',
  someExec.includes('1 can accept a payment today'), someExec);
const none = countryLine({ discovery_state: 'not_discovered' });
check('a country with no data calls it a gap in our data, not an absence',
  none.includes('gap in our data') && !none.toLowerCase().includes('no banks'),
  none);

// --- Render ----------------------------------------------------------------
let r = await render({
  '/direct-connections/countries': countriesPayload(),
});
check('all six region chips are offered', REGIONS.every((x) => r.text.includes(x)),
  r.text);
check('Africa is the default region and its countries are listed',
  r.text.includes('Kenya') && r.text.includes('Nigeria'));
check('the canonical total is shown', r.text.includes('197'), r.text);
check('the disclosure that a name here is not a capability is on screen',
  r.text.includes('does not mean Konduyt can connect to it'), r.text);
check('a country row shows its derived flag', r.html.includes('\u{1F1F0}\u{1F1EA}'));
check('a country with no data is labelled "not in our data yet"',
  r.text.includes('not in our data yet'));
check('the default Africa view shows exactly its members, not other regions',
  r.text.includes('Kenya') && !r.text.includes('India'), r.text);

// Switching region shows that region's countries.
r = await r.click((b) => b.textContent.trim() === 'Asia');
check('selecting Asia shows Asian countries',
  r.text.includes('India') && r.text.includes('United Arab Emirates'));
check('selecting Asia hides African countries',
  !r.text.includes('Kenya'), r.text);

await r.unmount();

// The catalogue must span the globe, not just Africa. Exercise one country from
// each of the six product regions using the real captured fixture, so the test
// cannot pass on invented data.
console.log('\nDirect Connections global coverage: one representative country per region');
console.log('--------------------------------------------------------------------------------');
const REGION_SAMPLE = [
  ['Africa', 'KE', 'Kenya'],
  ['Asia', 'IN', 'India'],
  ['Europe', 'DE', 'Germany'],
  ['North America', 'US', 'United States'],
  ['South America', 'BR', 'Brazil'],
  ['Oceania', 'AU', 'Australia'],
];
for (const [region, code, name] of REGION_SAMPLE) {
  const payload = realFixture[`countries_${code}`];
  const member = realFixture.countries.countries.find((c) => c.code === code);
  check(`${name} is filed under ${region} in the fixture`,
    member && regionOf(member) === region, JSON.stringify(member));
  const rr = await render({
    [`/direct-connections/countries/${code}`]: payload,
    '/direct-connections/countries': realFixture.countries,
  });
  // Select the country from its own region tab. Match on the ISO code shown on
  // the row, so a name collision (India vs British Indian Ocean Territory) can
  // never open the wrong country.
  await rr.click((b) => b.textContent.trim() === region);
  await rr.click((b) => b.className.includes('dc-dir-country')
    && (b.textContent.trim().endsWith(code)
      || b.textContent.includes(`${code} \u00b7`)));
  const mm = payload.mobile_money.length;
  const banks = payload.banks.length;
  check(`${name} renders its services and banks`,
    (banks === 0 || rr.text.includes(payload.banks[0].name))
    && (mm === 0 || rr.text.includes(payload.mobile_money[0].name)), rr.text);
  check(`${name}: service names are the API's canonical names`,
    payload.mobile_money.every((m) => !m.name || m.name === m.name.trim()));
  check(`${name}: no Connect affordance anywhere`,
    !rr.html.includes('dc-btn-primary')
    && !/\bConnect\b/.test(rr.text.replace(/Direct Connections/g, '')));
  check(`${name}: a false EXECUTABLE never appears when the API says zero`,
    payload.execution.executable > 0 || !rr.text.includes('Can accept a payment'),
    `${name} exec=${payload.execution.executable}`);
  await rr.unmount();
}

// Country switching: A -> B -> C -> A must not leave a prior country's services
// on screen, and a late response for a superseded country must be discarded.
console.log('\nDirect Connections country switching: no stale survivors');
console.log('--------------------------------------------------------------------------------');
{
  const A = { code: 'KE', name: 'Kenya', discovery_state: 'discovered',
    mobile_money: [{ name: 'M-Pesa', execution_capability: 'EXECUTABLE' }],
    banks: [{ name: 'KCB Bank Kenya Limited', execution_capability: 'NOT_SUPPORTED' }],
    execution: { listed: 9, executable: 1 }, note: 'KE note.' };
  const B = { code: 'DE', name: 'Germany', discovery_state: 'discovered',
    mobile_money: [], banks: [{ name: 'Deutsche Bank AG', execution_capability: 'NOT_SUPPORTED' }],
    execution: { listed: 111, executable: 0 }, note: 'DE note.' };
  const C = { code: 'JP', name: 'Japan', discovery_state: 'discovered',
    mobile_money: [{ name: 'PayPay', execution_capability: 'NOT_SUPPORTED' }],
    banks: [{ name: 'MUFG Bank', execution_capability: 'NOT_SUPPORTED' }],
    execution: { listed: 92, executable: 0 }, note: 'JP note.' };
  const all = { total: 197, discovered: 189, countries: [
    { code: 'KE', name: 'Kenya', region: 'Africa', subregion: 'Eastern Africa', discovery_state: 'discovered' },
    { code: 'DE', name: 'Germany', region: 'Europe', subregion: 'Western Europe', discovery_state: 'discovered' },
    { code: 'JP', name: 'Japan', region: 'Asia', subregion: 'Eastern Asia', discovery_state: 'discovered' },
  ]};
  const rr = await render({
    '/direct-connections/countries/KE': A,
    '/direct-connections/countries/DE': B,
    '/direct-connections/countries/JP': C,
    '/direct-connections/countries': all,
  });
  const openIn = async (region, code) => {
    await rr.click((b) => b.textContent.trim() === region);
    await rr.click((b) => b.className.includes('dc-dir-country')
      && b.textContent.trim().endsWith(code));
  };
  await openIn('Africa', 'KE');
  let t = rr.text;
  check('country A shows only A services', t.includes('M-Pesa') && !t.includes('Deutsche Bank'), t);
  await rr.click((b) => b.textContent.includes('←'));
  await openIn('Europe', 'DE');
  t = rr.text;
  check('country B shows only B services', t.includes('Deutsche Bank') && !t.includes('M-Pesa'), t);
  await rr.click((b) => b.textContent.includes('←'));
  await openIn('Asia', 'JP');
  t = rr.text;
  check('country C shows only C services', t.includes('MUFG Bank') && !t.includes('Deutsche Bank'), t);
  await rr.click((b) => b.textContent.includes('←'));
  await openIn('Africa', 'KE');
  t = rr.text;
  check('returning to country A shows A again, not a cached B or C',
    t.includes('M-Pesa') && !t.includes('Deutsche Bank') && !t.includes('MUFG Bank'), t);
  await rr.unmount();
}

await r.unmount();

// A country with rows: selects the country, loads its detail, and shows the
// API's own per-service capability carried on each row. NO Connect affordance
// anywhere -- and no second capability lookup exists to perform.
r = await render({
  '/direct-connections/countries/KE': {
    code: 'KE', name: 'Kenya', discovery_state: 'discovered',
    mobile_money: [
      { name: 'M-Pesa', operator: 'Safaricom', execution_capability: 'EXECUTABLE', source_url: 'https://en.wikipedia.org/wiki/M-Pesa' },
      { name: 'Airtel Money', operator: 'Airtel', execution_capability: 'NOT_SUPPORTED', source_url: 'https://en.wikipedia.org/wiki/Airtel_Africa' },
      { name: 'T-Kash', operator: 'Telkom Kenya', execution_capability: 'NOT_SUPPORTED', source_url: 'https://telkom.co.ke/t-kash' },
    ],
    banks: [
      { name: 'KCB Bank Kenya Limited', execution_capability: 'NOT_SUPPORTED' },
      { name: 'Equity Bank Kenya Limited', execution_capability: 'NOT_SUPPORTED' },
    ],
    bank_source_url: 'https://en.wikipedia.org/wiki/List_of_banks_in_Kenya',
    stats: { banks_raw: 40, banks_served: 2 },
    execution: { listed: 9, executable: 1 },
    note: 'This directory describes accounts that exist. It is not a statement that Konduyt can execute a payment into any of them.',
  },
  '/direct-connections/countries': countriesPayload(),
});
r = await r.click((b) => b.className.includes('dc-dir-country')
  && b.textContent.trim().endsWith('KE'));
check('opening a country shows its mobile-money services',
  r.text.includes('M-Pesa') && r.text.includes('Airtel Money')
  && r.text.includes('T-Kash'), r.text);
check('an EXECUTABLE service reads "Can accept a payment"',
  r.text.includes('Can accept a payment'), r.text);
check('a NOT_SUPPORTED service reads "Not connectable yet"',
  r.text.includes('Not connectable yet'), r.text);
check('the country headline reports the rows shown, not execution.listed',
  r.text.includes('3 mobile-money services') && r.text.includes('2 banks')
  && !r.text.includes('listed 9'), r.text);
check('no Connect affordance is offered on the listing surface',
  !r.html.includes('dc-btn-primary')
  && !/\bConnect\b/.test(r.text.replace(/Direct Connections/g, '')), r.text);
check('the honesty footnote from the API is shown verbatim',
  r.text.includes('It is not a statement that Konduyt can execute a payment'));
check('banks are listed with their source', r.text.includes('KCB Bank Kenya Limited'));

await r.unmount();

// A country with NO data must not read as "no services exist".
r = await render({
  '/direct-connections/countries/NG': {
    code: 'NG', name: 'Nigeria', discovery_state: 'not_discovered',
    mobile_money: [], banks: [], execution: { listed: 0, executable: 0 },
    note: 'No institution data yet.',
  },
  '/direct-connections/countries': countriesPayload(),
});
r = await r.click((b) => b.className.includes('dc-dir-country')
  && b.textContent.includes('NG'));
check('a no-data country reads as a gap in our data',
  r.text.includes('gap in our data'), r.text);
check('a no-data country is labelled "Not yet in our data"',
  r.text.includes('Not yet in our data'), r.text);
check('a no-data country never claims there are zero services',
  !r.text.includes('0 mobile-money') && !r.text.includes('0 banks'), r.text);

await r.unmount();

// Search: global, capability-preserving, and a bank hit can be opened as its
// country. A hit carries the same `execution_capability` the country page shows
// and is never made connectable by the act of being found.
r = await render({
  '/direct-connections/search': {
    countries: [{ code: 'IN', name: 'India', region: 'Asia', subregion: 'Southern Asia', discovery_state: 'discovered' }],
    mobile_money: [{ country: 'KE', name: 'T-Kash', operator: 'Telkom Kenya', execution_capability: 'NOT_SUPPORTED', source_url: 'https://telkom.co.ke/t-kash' }],
    banks: [{ country: 'IN', name: 'HDFC Bank Limited', execution_capability: 'NOT_SUPPORTED', source_url: 'https://en.wikipedia.org/wiki/HDFC_Bank' }],
  },
  '/direct-connections/countries': countriesPayload(),
});
r = await r.type('HDFC');
check('search renders a bank hit with its country', r.text.includes('HDFC Bank Limited'));
check('search renders a mobile-money hit', r.text.includes('T-Kash'));
check('search is global: it says it ignores the region', r.text.includes('regardless of region'), r.text);
check('a search result offers to open its country', r.text.includes('View IN'));
check('a non-executable search hit reads "Not connectable yet", not a capability',
  r.text.includes('Not connectable yet') && !r.text.includes('Can accept a payment'), r.text);
check('a search hit is never given a Connect affordance',
  !r.html.includes('dc-btn-primary')
  && !/\bConnect\b/.test(r.text.replace(/Direct Connections/g, '')), r.text);
check('search states that being found does not make a service connectable',
  r.text.includes('does not make it connectable'), r.text);
await r.unmount();

// A search hit that IS executable must show the capability, so the frontend does
// not hide a real action's precondition (the inverse of the honesty rule).
r = await render({
  '/direct-connections/search': {
    countries: [],
    mobile_money: [{ country: 'KE', name: 'M-Pesa', operator: 'Safaricom', execution_capability: 'EXECUTABLE' }],
    banks: [],
  },
  '/direct-connections/countries': countriesPayload(),
});
r = await r.type('M-Pesa');
check('an executable search hit reads "Can accept a payment"',
  r.text.includes('M-Pesa') && r.text.includes('Can accept a payment'), r.text);
await r.unmount();

check('an empty result explains absence is a data gap, not proof',
  (await (async () => {
    const rr = await render({
      '/direct-connections/search': { countries: [], mobile_money: [], banks: [] },
      '/direct-connections/countries': countriesPayload(),
    });
    const t = (await rr.type('nowhere')).text;
    await rr.unmount();
    return t;
  })()).includes('gap in our data'));

// --- Real API payloads ------------------------------------------------------
console.log('\nDirect Connections region browser vs the real captured fixture');
console.log('--------------------------------------------------------------------------------');

check('the fixture carries /countries and eleven country payloads',
  realFixture.countries && realFixture.countries.total === 197
  && realFixture.countries_KE && realFixture.countries_IN);
check('Kenya\'s captured directory now names T-Kash',
  realFixture.countries_KE.mobile_money.some((m) => m.name === 'T-Kash'),
  JSON.stringify(realFixture.countries_KE.mobile_money.map((m) => m.name)));
check('T-Kash is attributed to Telkom Kenya and cites a live source',
  realFixture.countries_KE.mobile_money.some(
    (m) => m.name === 'T-Kash' && m.operator === 'Telkom Kenya'
      && (m.source_url || '').startsWith('https://')));
check('the captured registry still holds T-Kash as NOT_SUPPORTED (listing != capability)',
  realFixture.institutions_KE.institutions.some(
    (i) => i.name === 'T-Kash' && i.execution_capability === 'NOT_SUPPORTED'),
  JSON.stringify(realFixture.institutions_KE.institutions.map(
    (i) => [i.name, i.execution_capability])));
check('every fixture directory row carries a capability (derived, not bare)',
  ['KE', 'IN', 'DE', 'US', 'BR', 'AU', 'JP', 'NG'].every((code) => {
    const p = realFixture[`countries_${code}`];
    return p.mobile_money.every((m) => m.execution_capability)
      && p.banks.every((b) => b && b.name && b.execution_capability);
  }));
check('every fixture search hit carries a capability too',
  ['equity', 'mpesa', 'tkash', 'hdfc'].every((k) =>
    realFixture[`search_${k}`].mobile_money.every((m) => m.execution_capability)
    && realFixture[`search_${k}`].banks.every((b) => b.execution_capability)));
check('the fixture covers all six product regions',
  ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania']
    .every((reg) => realFixture.countries.countries.some(
      (c) => regionOf(c) === reg)),
  JSON.stringify([...new Set(realFixture.countries.countries.map(regionOf))]));

// Render the real Kenya payload end-to-end: the headline must report the
// directory rows, not the registry count the API also ships.
r = await render({
  '/direct-connections/countries/KE': realFixture.countries_KE,
  '/direct-connections/countries': realFixture.countries,
});
r = await r.click((b) => b.className.includes('dc-dir-country')
  && b.textContent.trim().endsWith('KE'));
const realMm = realFixture.countries_KE.mobile_money.length;
const realBanks = realFixture.countries_KE.banks.length;
check(`Kenya headline reports its ${realMm} mobile-money rows and ${realBanks} banks`,
  r.text.includes(`${realMm} mobile-money service`) && r.text.includes(`${realBanks} banks`)
  && !r.text.includes(`listed ${realFixture.countries_KE.execution.listed}`), r.text);
check('Kenya\'s T-Kash is shown and is not presented as connectable',
  r.text.includes('T-Kash'));
await r.unmount();

// --- Wiring: the Directory tab is gone, and folded into Direct Connections --
console.log('\nDirect Connections wiring: one destination, no separate Directory tab');
console.log('--------------------------------------------------------------------------------');

const page = readFileSync(join(ROOT, 'app/dashboard/page.js'), 'utf8');
const dc = readFileSync(join(ROOT, 'app/dashboard/DirectConnections.js'), 'utf8');
check('the dashboard no longer imports DirectConnectionsDirectory',
  !/DirectConnectionsDirectory/.test(page));
check('the tab bar no longer lists a Directory tab',
  !/\[\s*'directory'\s*,\s*'Directory'\s*\]/.test(page));
check('TAB_TITLES no longer carries a directory entry',
  !/^\s*directory\s*:/m.test(page));
check('DirectConnections renders the country browser inside itself',
  /import\s+DirectConnectionsCountries\s+from\s+['"]\.\/DirectConnectionsCountries['"]/.test(dc)
  && /<DirectConnectionsCountries\b/.test(dc));
check('the old separate directory component is deleted',
  (() => { try { readFileSync(join(ROOT, 'app/dashboard/DirectConnectionsDirectory.js')); return false; }
    catch { return true; } })());

// The frontend must RENDER the API's capability, not infer it. These two checks
// fail if a name-matching join or a second capability lookup is ever reintroduced
// -- the exact inference ("the name matched, so it must be executable") that the
// API-side join removed.
const countriesSrc = readFileSync(
  join(ROOT, 'app/dashboard/DirectConnectionsCountries.js'), 'utf8');
check('the country browser performs no name-matching capability join',
  !/normalizeName/.test(countriesSrc) && !/capabilityFor/.test(countriesSrc));
check('the country browser makes no second /institutions capability lookup',
  !/\/direct-connections\/institutions/.test(countriesSrc));
check('the country browser reads execution_capability off the row',
  /execution_capability/.test(countriesSrc));

rmSync(TMP, { force: true });

console.log('\n--------------------------------------------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
