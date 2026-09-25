// Renders the copy-paste HTML SDK against real /v1/demo/run responses and
// checks the two rules the landing page got wrong:
//
//   1. A country with local methods but no ranked options must still list
//      those methods -- never "No ranked options for this amount right now."
//   2. Only a method Konduyt can execute (on_konduyt) gets a Pay button; an
//      unsupported local method is shown but not payable.
//
// The snippet is extracted from the published source and run in jsdom, so
// this exercises what a developer actually copies, not a reimplementation.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.KONDUYT_API || 'https://konduyt-api.onrender.com';

const src = readFileSync(join(ROOT, 'app/dashboard/intelligencesdk.js'), 'utf8');
const html = src.match(/export const INTELLIGENCE_TESTING_SDK = `([\s\S]*)`;\s*$/)[1]
  .replace(/\\`/g, '`').replace(/\\\$/g, '$');

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  [PASS] ${name}`); }
  else { failed++; console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}

async function render(country) {
  const res = await fetch(`${API}/v1/demo/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 500000, currency: 'KES', country }),
  });
  const data = await res.json();

  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { throw e; });
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc, url: 'https://konduyt.dev/' });
  const { window } = dom;
  // The page fetches the demo endpoint on Pay; answer it with the real
  // response instead of the network so the test is deterministic.
  window.fetch = async () => ({ json: async () => data });

  window.document.getElementById('phoneInput').value = '722123456';
  window.document.getElementById('phoneInput').dispatchEvent(new window.Event('input'));
  window.document.getElementById('payButton').click();
  await new Promise((r) => setTimeout(r, 50));

  const rows = [...window.document.querySelectorAll('#railRows tr')];
  return { data, window, rows };
}

const CASES = process.env.COUNTRIES
  ? process.env.COUNTRIES.split(',')
  : ['KE', 'US', 'BR', 'IN', 'AF', 'AL', 'DZ'];

for (const country of CASES) {
  console.log(`\n${country}`);
  const { data, rows } = await render(country);
  const locals = (data.intelligence && data.intelligence.local_methods) || [];
  const options = (data.intelligence && data.intelligence.options) || [];

  check('local_methods present and an array', Array.isArray(locals), `got ${typeof locals}`);

  // The regression that mattered: empty options must not mean an empty list.
  check('no "No ranked options for this amount right now."',
    !rows.some((r) => /No ranked options/.test(r.textContent)),
    rows.map((r) => r.textContent).join(' | '));
  if (locals.length || options.length) {
    check('lists at least one method', rows.length > 0, `rows=${rows.length}`);
  }

  // Every catalogue method appears exactly once.
  const labels = rows.map((r) => r.querySelector('.rail-name')?.textContent || '');
  check('one row per method, no duplicates',
    new Set(labels).size === labels.length, labels.join(', '));

  // Pay only on executable methods; unsupported ones are marked and inert.
  const payButtons = rows.filter((r) => r.querySelector('button.rail-pay'));
  const unsupported = rows.filter((r) => r.querySelector('.rail-unsupported'));
  check('every Pay button belongs to an executable method',
    payButtons.every((r) => r.classList.contains('rail-executable')), '');
  check('unsupported rows carry no Pay button',
    unsupported.every((r) => !r.querySelector('button.rail-pay')), '');
  check('unsupported rows show "Not on Konduyt yet"',
    unsupported.every((r) => /not on konduyt yet/i.test(r.textContent)), '');
  // Baseline is the DISTINCT non-executable methods across both arrays: the
  // same method can appear in the catalogue and in the ranked options (India
  // lists UPI in both), and the merge shows it once. Comparing raw array
  // lengths would count it twice and look like a missing row.
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nonExecKeys = new Set();
  for (const m of locals) if (!m.on_konduyt) nonExecKeys.add(norm(m.label));
  for (const o of options) if (!o.on_konduyt) nonExecKeys.add(norm(o.label));
  check('unsupported count matches every distinct non-executable method',
    unsupported.length === nonExecKeys.size, `ui=${unsupported.length} api=${nonExecKeys.size}`);

  // A fee is rendered in the currency the API says it is in, not in the
  // checkout's transaction currency. A correct number under the wrong unit is
  // a wrong price, so check the string against what that currency formats to.
  const apiByLabel = new Map();
  for (const m of [...locals, ...options]) {
    if (m.fee_minor != null && m.fee_currency) apiByLabel.set(m.label, m);
  }
  const mislabelled = [];
  for (const r of rows) {
    const label = r.querySelector('.rail-name')?.textContent || '';
    const api = apiByLabel.get(label);
    if (!api) continue;
    let want;
    try {
      want = new Intl.NumberFormat(undefined, {
        style: 'currency', currency: api.fee_currency,
      }).format(api.fee_minor / 100);
    } catch { continue; }
    const shown = r.querySelector('.rail-fee')?.textContent || '';
    if (!shown.includes(want)) mislabelled.push(`${label}: "${shown}" != ${want}`);
  }
  if (apiByLabel.size) {
    check('every fee is shown in the currency the API priced it in',
      mislabelled.length === 0, mislabelled.join('; '));
  }

  // Best value must be executable and priced, and there must be at most one.
  const bestRows = rows.filter((r) => r.classList.contains('best'));
  check('at most one Best value', bestRows.length <= 1, `got ${bestRows.length}`);
  if (bestRows.length) {
    check('Best value is an executable method',
      bestRows[0].classList.contains('rail-executable'), bestRows[0].textContent);
  }
  // The API can recommend a method it cannot route (India returns UPI with
  // recommended=true, on_konduyt=false). Badging that would tell a merchant
  // to take a payment Konduyt cannot process, so the UI must refuse it.
  const recUnroutable = options.filter((o) => o.recommended && !o.on_konduyt);
  if (recUnroutable.length) {
    check('a recommended but unroutable method is never badged Best value',
      !rows.some((r) => r.classList.contains('best')
        && recUnroutable.some((o) => r.querySelector('.rail-name')?.textContent === o.label)),
      recUnroutable.map((o) => o.label).join(', '));
  }
  if (options.some((o) => o.recommended && o.on_konduyt)) {
    check('Best value exists when the API recommends an executable route', bestRows.length === 1, '');
  }

  // Executable rows come before unsupported ones, and unsupported methods
  // never outrank an executable one.
  const firstUnsupported = rows.findIndex((r) => r.classList.contains('rail-unsupported'));
  const lastExecutable = rows.map((r) => r.classList.contains('rail-executable')).lastIndexOf(true);
  if (firstUnsupported !== -1 && lastExecutable !== -1) {
    check('executable methods are grouped before unsupported ones',
      lastExecutable < firstUnsupported, `lastExec=${lastExecutable} firstUnsup=${firstUnsupported}`);
  }
}

// A synthetic case, because real catalogues currently price every method in
// the checkout's own currency -- which is exactly the condition under which a
// missing fee_currency would go unnoticed. The API contract allows a method
// priced in its own country's currency, so the render path is exercised
// directly against a response where the two currencies DIFFER.
{
  console.log('\nSYNTHETIC (fee currency != transaction currency)');
  const data = {
    payment: { amount: 500000, currency: 'KES' },
    intelligence: {
      local_methods: [
        {
          method_id: 'bank_transfer', label: 'Nigerian Bank', rail_id: 'bank_transfer',
          method_type: 'bank', provider: 'paystack', on_konduyt: false,
          fee_minor: 100000, fee_currency: 'NGN', fee_kind: 'market',
          fee_source: 'market', is_estimated: true, source: 'https://example.test',
        },
      ],
      options: [],
    },
  };
  // Render this payload through the SDK's own published script.
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { throw e; });
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc, url: 'https://konduyt.dev/' });
  const { window } = dom;
  window.fetch = async () => ({ json: async () => data });
  window.document.getElementById('phoneInput').value = '722123456';
  window.document.getElementById('phoneInput').dispatchEvent(new window.Event('input'));
  window.document.getElementById('payButton').click();
  await new Promise((r) => setTimeout(r, 50));

  const row = [...window.document.querySelectorAll('#railRows tr')]
    .find((r) => r.querySelector('.rail-name')?.textContent === 'Nigerian Bank');
  const shown = row?.querySelector('.rail-fee')?.textContent || '';
  const wantNgn = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'NGN' }).format(1000);
  const wantKes = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'KES' }).format(1000);
  check('a method priced in another currency is rendered in that currency',
    shown.includes(wantNgn), `shown="${shown}" want~"${wantNgn}"`);
  check('and is NOT relabelled with the transaction currency',
    !shown.includes(wantKes), `shown="${shown}"`);
}

console.log(`\n${'-'.repeat(64)}\n  ${passed}/${passed + failed} passed\n${'-'.repeat(64)}`);
process.exit(failed ? 1 : 0);
