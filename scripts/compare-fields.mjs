// Field-level comparison of the payment payloads built by the landing page's
// samples (app/DevPanel.js) and the dashboard's (app/dashboard/langsnippets.js).
//
// The two surfaces are supposed to teach the same request. Known, intentional
// differences are not drift:
//   - landing page is a runnable test server: POST /v1/payments/test with
//     provider:"test" and the universal demo secret baked in
//   - dashboard is real integration code: POST /v1/payments with
//     method:"mpesa" and the key read from the environment
//   - the test endpoint deliberately rejects a customer email
// Anything else that differs is a real discrepancy in the documented request.
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANDING = join(ROOT, '.snippets');
const DASH = join(ROOT, '.snippets-dashboard');

const LANDING_FILES = {
  python: 'server.py', ruby: 'server.rb', php: 'index.php', go: 'main.go',
  rust: 'main.rs', csharp: 'Program.cs', cpp: 'main.cpp', js: 'server.mjs',
  java: 'MainActivity.java', kotlin: 'MainActivity.kt', swift: 'ViewController.swift',
};

// Fields we care about in a payment request. The dashboard's "one-time
// purchase" section is the counterpart of the landing page's main payment call.
const FIELD_PATTERNS = {
  amount: /["']?amount["']?\s*[:=]\s*[^,;\n}]*/,
  currency: /["']?currency["']?\s*[:=]\s*["'][A-Z]{3}["']/,
  method: /["']?method["']?\s*[:=]\s*["'][a-z_]+["']/,
  provider: /["']?provider["']?\s*[:=]\s*["'][a-z_]+["']/,
};

function fieldsOf(text) {
  const found = {};
  for (const [name, re] of Object.entries(FIELD_PATTERNS)) {
    const m = text.match(re);
    if (m) found[name] = m[0].replace(/\s+/g, ' ').trim();
  }
  return found;
}

const dashOneTime = new Map();
for (const f of readdirSync(DASH)) {
  if (f === 'manifest.json') continue;
  const lang = f.split('__')[0];
  if (!f.includes('one-time-purchase') && !f.includes('recurring')) continue;
  const key = f.includes('one-time') ? 'oneTime' : 'recurring';
  if (!dashOneTime.has(lang)) dashOneTime.set(lang, {});
  dashOneTime.get(lang)[key] = readFileSync(join(DASH, f), 'utf8');
}

console.log('Payment payload fields — landing page vs dashboard\n');
console.log('lang      field     landing                      dashboard                    match');
console.log('-'.repeat(88));
let mismatches = 0;
for (const [lang, file] of Object.entries(LANDING_FILES)) {
  const lp = fieldsOf(readFileSync(join(LANDING, file), 'utf8'));
  const dText = (dashOneTime.get(lang) || {}).oneTime || '';
  const dp = fieldsOf(dText);
  for (const name of ['amount', 'currency', 'method', 'provider']) {
    const l = lp[name] ?? '—';
    const d = dp[name] ?? '—';
    // amount legitimately differs: fixed demo amount vs shopper-supplied.
    const intentional =
      (name === 'provider' && d === '—') ||      // test endpoint takes provider
      (name === 'method' && l === '—') ||        // real endpoint takes method
      name === 'amount';
    const same = l === d || intentional;
    if (!same) mismatches++;
    console.log(
      `${lang.padEnd(9)} ${name.padEnd(9)} ${l.padEnd(28)} ${d.padEnd(28)} ${same ? 'ok' : 'DIFFERS'}`);
  }
}
console.log(`\n${mismatches} unexpected mismatches.`);
