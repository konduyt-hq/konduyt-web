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

const SRC = readFileSync(join(ROOT, 'app/dashboard/DirectConnections.js'), 'utf8');
const compiled = babel.transformSync(SRC, {
  filename: 'DirectConnections.js',
  presets: [[presetReact, { runtime: 'classic' }]],
  plugins: [pluginCjs],
  babelrc: false, configFile: false,
}).code;
// 'use client' is a Next directive the plain CommonJS module does not need, and
// classic JSX emit expects `React` in scope (Next injects it at build time).
const TMP = join(ROOT, '.direct-connections-render.cjs');
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

// The API's own catalogue shape: the page renders this and derives nothing.
// `connection.state` and `connection.offerable` are the two API facts the
// status text is allowed to depend on.
function catalogue(connectionState, offerable, summary) {
  return {
    country: 'KE',
    summary: summary || { executable: 1, total: 2, connected: 1 },
    sections: [{
      category: 'MOBILE_MONEY', title: 'Mobile Money',
      institutions: [{
        institution_id: 'KE_MPESA', name: 'M-Pesa', status: 'Connected',
        action: 'CONNECTED', execution_capability: 'EXECUTABLE',
        account_label: 'M-Pesa number', account_format: '2547XXXXXXXX',
        connection: {
          id: 'dcn_1', state: connectionState, offerable,
          display_account: '****5678',
        },
      }, {
        institution_id: 'KE_AIRTEL_MONEY', name: 'Airtel Money',
        status: 'Not currently supported', action: 'NOT_SUPPORTED',
        execution_capability: 'NOT_SUPPORTED', limitation_note: 'No connector.',
      }],
    }],
  };
}

async function render(payload) {
  const fakeFetch = () => Promise.resolve({
    ok: true, status: 200, json: () => Promise.resolve(payload),
  });
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

let text = await render(catalogue('EXECUTABLE', true));
check('an offered EXECUTABLE connection reads "Verified · live at checkout"',
  text.includes('Verified · live at checkout'), text);

// THE BUG. The API says offerable:false -- the page must not say "live".
text = await render(catalogue('EXECUTABLE', false));
check('a non-offered EXECUTABLE connection says "not offered to customers"',
  text.includes('Verified · not offered to customers'), text);
check('a non-offered EXECUTABLE connection NEVER reads "live at checkout"',
  !text.includes('live at checkout'), text);

text = await render(catalogue('VERIFIED', false));
check('a verified-but-not-executable connection says "not executable yet"',
  text.includes('Verified · not executable yet'), text);
check('a verified-but-not-executable connection never reads "live at checkout"',
  !text.includes('live at checkout'), text);

text = await render(catalogue('CONNECTED', false));
check('a connected-but-unverified connection says "not verified yet"',
  text.includes('Connected · not verified yet'), text);
check('a connected-but-unverified connection never reads "live at checkout"',
  !text.includes('live at checkout'), text);

// The coverage line is the other half of "no invented coverage": a country the
// API catalogues with ZERO executable institutions must not read as a green
// success banner. This is the global-directory case -- every row is listed but
// none can be paid.
console.log('\nDirect Connections dashboard: the coverage line is honest at zero');
console.log('-----------------------------------------------------------');

// A directory country: many institutions, none executable.
text = await render(catalogue('NOT_SUPPORTED', false,
  { executable: 0, total: 47, connected: 0 }));
check('a zero-executable country says none can accept a payment yet',
  text.includes('none can accept a payment yet'), text);
check('a zero-executable country does NOT say "can accept a payment today"',
  !text.includes('can accept a payment today'), text);
check('a zero-executable country does NOT show the green success tick',
  !text.includes('✓'), text);

// A country with nothing catalogued at all.
text = await render(catalogue('NOT_SUPPORTED', false,
  { executable: 0, total: 0, connected: 0 }));
check('a country with no catalogue says there is nothing to connect',
  text.includes('nothing to connect'), text);

rmSync(TMP, { force: true });

console.log('-----------------------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
