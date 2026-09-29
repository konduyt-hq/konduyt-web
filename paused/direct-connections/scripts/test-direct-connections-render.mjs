// Render the real DirectConnections dashboard component and prove the status
// text it shows comes from the connection's `offerable` flag the API returns --
// never from a hard-coded assumption that an EXECUTABLE connection is live.
//
// The bug this guards: every EXECUTABLE connection was labelled
// "Verified · live at checkout" whether or not the merchant had actually
// offered it. A merchant who verified an account but turned offering OFF was
// told at checkout it was live. The API was already telling the truth
// (offerable: false); the page was overriding it.
//
// This is the render half of the offering-switch contract. The API half lives
// in app/test_direct_connections.py [13].
//
// No new dependency: JSX is compiled with the Babel that ships inside Next, and
// the component runs against a real (jsdom) DOM with only fetch stubbed at the
// network boundary.
//
// Run: node scripts/test-direct-connections-render.mjs
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

function compile(relPath, outName) {
  const src = readFileSync(join(ROOT, relPath), 'utf8');
  const code = babel.transformSync(src, {
    filename: relPath.split('/').pop(),
    presets: [[presetReact, { runtime: 'classic' }]],
    plugins: [pluginCjs],
    babelrc: false, configFile: false,
  }).code;
  // 'use client' is a Next directive the plain CommonJS module does not need,
  // and classic JSX emit expects `React` in scope (Next injects it at build).
  const body = code.replace(/^['"]use client['"];?/, '');
  const out = join(ROOT, outName);
  writeFileSync(out, `var React = require('react');\n${body}`);
  return out;
}

// The dashboard now renders the country browser inside DirectConnections, so
// both modules must be in the CommonJS require graph. Point the import at the
// compiled child before writing the parent.
const TMP_COUNTRIES = compile('app/dashboard/DirectConnectionsCountries.js',
  '.dc-countries-render.cjs');
const SRC = readFileSync(join(ROOT, 'app/dashboard/DirectConnections.js'), 'utf8');
const compiled = babel.transformSync(SRC, {
  filename: 'DirectConnections.js',
  presets: [[presetReact, { runtime: 'classic' }]],
  plugins: [pluginCjs],
  babelrc: false, configFile: false,
}).code;
const TMP = join(ROOT, '.direct-connections-render.cjs');
const body = compiled.replace(/^['"]use client['"];?/, '')
  .replace(/require\(['"]\.\/DirectConnectionsCountries['"]\)/,
    "require('./.dc-countries-render.cjs')");
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

// The API's own catalogue shape: the page renders this and derives nothing.
// `connection.state` and `connection.offerable` are the two API facts the
// status text is allowed to depend on.
function catalogue(connectionState, offerable, summary) {
  return {
    country: 'KE',
    summary: summary || { executable: 1, total: 2, connected: 1,
                          direct_available: 1 },
    sections: [{
      category: 'MOBILE_MONEY', title: 'Mobile Money',
      institutions: [{
        institution_id: 'KE_MPESA', name: 'M-Pesa', status: 'Connected',
        action: 'CONNECTED', execution_capability: 'EXECUTABLE',
        direct_available: true, connected_available: true,
        automatically_confirmed: true,
        account_label: 'M-Pesa number', account_format: '2547XXXXXXXX',
        connection: {
          id: 'dcn_1', state: connectionState, offerable,
          display_account: '****5678',
        },
      }, {
        institution_id: 'KE_AIRTEL_MONEY', name: 'Airtel Money',
        status: 'Not currently supported', action: 'NOT_SUPPORTED',
        execution_capability: 'NOT_SUPPORTED', direct_available: false,
        limitation_note: 'No connector.',
      }],
    }],
  };
}

// A catalogue whose first institution is DIRECT-available but NOT yet
// connected: the "how do I get paid here?" case. `observable` toggles whether
// Konduyt also has a real connector for it.
function directAvailableCatalogue(observable) {
  return {
    country: 'KE',
    summary: { executable: observable ? 1 : 0, total: 1, connected: 0,
               direct_available: 1 },
    sections: [{
      category: 'MOBILE_MONEY', title: 'Mobile Money',
      institutions: [{
        institution_id: 'KE_MPESA', name: 'M-Pesa', status: 'Connect',
        action: 'CONNECT', execution_capability:
          observable ? 'EXECUTABLE' : 'NOT_SUPPORTED',
        direct_available: true, connected_available: observable,
        automatically_confirmed: observable,
        account_label: 'M-Pesa number', account_format: '2547XXXXXXXX',
        destination_schema: { fields: [
          { name: 'account_number', label: 'M-Pesa number', required: true,
            type: 'text', example: '254712345678' },
        ] },
      }],
    }],
  };
}

async function render(payload) {
  // The country browser now lives inside DirectConnections and fetches the
  // country list on mount. Serve that too, so the parent's own assertions see
  // the same text they always did.
  const countryList = {
    total: 197, discovered: 189,
    countries: [
      { code: 'KE', name: 'Kenya', region: 'Africa', subregion: 'Eastern Africa',
        discovery_state: 'discovered' },
      { code: 'NG', name: 'Nigeria', region: 'Africa', subregion: 'Western Africa',
        discovery_state: 'not_discovered' },
    ],
  };
  const fakeFetch = (url) => {
    const body = String(url).includes('/direct-connections/countries')
      ? countryList : payload;
    return Promise.resolve({
      ok: true, status: 200, json: () => Promise.resolve(body),
    });
  };
  dom.window.fetch = fakeFetch;
  global.fetch = fakeFetch;
  const container = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(React.createElement(Component,
      { active: { id: 'p1', merchant_country: 'KE' } }));
  });
  await React.act(async () => {});
  const text = container.textContent;
  await React.act(async () => { root.unmount(); });
  container.remove();
  return text;
}

console.log('Direct Connections dashboard: the live/offered status text');
console.log('-----------------------------------------------------------');

// The page's status text is driven by connection.state and offerable, both
// backend facts. The load-bearing invariant: neither the page nor the API may
// describe a connection as live/auto-confirmed unless the backend says so.

let text = await render(catalogue('EXECUTABLE', true));
check('an offered EXECUTABLE connection reads "live at checkout"',
  text.includes('Verified · live at checkout'), text);
check('an EXECUTABLE (auto-confirmable) connection says confirmed automatically',
  text.includes('confirmed automatically'), text);

// THE BUG. The API says offerable:false -- the page must not say "live".
text = await render(catalogue('EXECUTABLE', false));
check('a non-offered EXECUTABLE connection says "not offered to customers"',
  text.includes('Verified · not offered to customers'), text);
check('a non-offered EXECUTABLE connection NEVER reads "live at checkout"',
  !text.includes('live at checkout'), text);

// DIRECT_READY is payable but manual: it may read "live at checkout" when the
// merchant offered it, yet it must NEVER be described as automatically
// confirmed -- Konduyt cannot observe the rail.
text = await render(catalogue('DIRECT_READY', true,
  { executable: 0, total: 2, connected: 1, direct_available: 1 }));
check('an offered DIRECT_READY connection is live at checkout',
  text.includes('Verified · live at checkout'), text);
check('an offered DIRECT_READY connection is confirmed with the merchant',
  text.includes('confirmed with you'), text);
check('a DIRECT_READY connection NEVER claims automatic confirmation',
  !text.includes('confirmed automatically'), text);

text = await render(catalogue('DIRECT_READY', false,
  { executable: 0, total: 2, connected: 1, direct_available: 1 }));
check('a non-offered DIRECT_READY connection is not live',
  !text.includes('live at checkout'), text);

text = await render(catalogue('CONNECTED', false));
check('a connected-but-unverified connection says "not verified yet"',
  text.includes('Added · not verified yet'), text);
check('a connected-but-unverified connection never reads "live at checkout"',
  !text.includes('live at checkout'), text);

// A DIRECT-available method that is NOT yet connected invites the merchant to
// add their own account, and never implies automatic confirmation when the API
// says it cannot observe the rail.
text = await render(directAvailableCatalogue(false));
check('a direct-available method invites adding the merchant\'s own account',
  text.includes('No provider setup needed'), text);
check('a direct-available method offers an "Add payment account" action',
  text.includes('Add payment account'), text);
check('a direct-available non-observable method says the merchant confirms',
  text.includes('you confirm these payments yourself'), text);

// When Konduyt CAN observe the rail (a real connector exists), adding the
// merchant's own account is still the primary path; connecting the provider is
// described as the optional enhancement, never a prerequisite.
text = await render(directAvailableCatalogue(true));
check('an observable direct-available method explains connecting a provider is optional',
  text.includes('Connecting a provider integration is optional'), text);

// The coverage line is the other half of "no invented coverage": a country the
// API catalogues with ZERO receivable methods must not read as a green
// success banner. This is the global-directory case -- every row is listed but
// none can be paid.
console.log('\nDirect Connections dashboard: the coverage line is honest at zero');
console.log('-----------------------------------------------------------');

// A directory country: many institutions, none receivable.
text = await render(catalogue('NOT_SUPPORTED', false,
  { executable: 0, total: 47, connected: 0, direct_available: 0 }));
check('a zero-receivable country says none can accept a payment yet',
  text.includes('none can accept a payment yet'), text);
check('a zero-receivable country does NOT say "can accept a payment today"',
  !text.includes('can accept a payment today'), text);
check('a zero-receivable country does NOT show the green success tick',
  !text.includes('✓'), text);

// A country where addition-of-own-account works: this IS receivable, and the
// banner may go green -- but must still distinguish manual from automatic.
text = await render(catalogue('NOT_SUPPORTED', false,
  { executable: 0, total: 5, connected: 0, direct_available: 3 }));
check('a direct-available country says you can receive money today',
  text.includes('You can receive money in KE today'), text);
check('a direct-available country explains no provider setup is needed',
  text.includes('no provider setup'), text);
check('it does not claim automatic confirmation when none is executable',
  !text.includes('confirmed automatically'), text);

// A country with nothing catalogued at all: a data gap, never a claim that
// receiving is impossible.
text = await render(catalogue('NOT_SUPPORTED', false,
  { executable: 0, total: 0, connected: 0, direct_available: 0 }));
check('a country with no catalogue is described as a data gap',
  text.includes('gap in our data'), text);
check('a country with no catalogue does NOT claim none exist',
  !text.includes('none exist as a fact'), text);

rmSync(TMP, { force: true });
rmSync(TMP_COUNTRIES, { force: true });

console.log('-----------------------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
