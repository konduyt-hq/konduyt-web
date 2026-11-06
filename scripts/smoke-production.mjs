// Production smoke test for the existing developer/payment experience.
//
// The landing restructure moved the site root but must not have disturbed the
// live product. This script checks that against PRODUCTION, read-only: it only
// issues GETs and the public demo POST, and never sends a secret key, so it can
// never create a charge, mutate an account, or change any data.
//
// It is deliberately NOT part of `npm test` -- CI must not depend on a live
// third-party service. Run it on demand before a release:
//
//   npm run smoke:production
//
// What it proves and what it cannot: see the report it prints. Endpoints that
// require a real merchant secret key or an interactive OAuth consent can only be
// shown to be correctly guarded, not exercised end to end -- those are reported
// as such rather than claimed as tested.
const API = process.env.KONDUYT_API || 'https://konduyt-api.onrender.com';
const SITE = process.env.KONDUYT_SITE || 'https://konduyt.dev';

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

// A GET that never follows redirects and never throws, so one dead endpoint
// does not abort the run.
async function req(url, opts = {}) {
  try {
    const res = await fetch(url, { redirect: 'manual', ...opts });
    const text = await res.text();
    return { status: res.status, headers: res.headers, text };
  } catch (e) {
    return { status: 0, headers: new Headers(), text: `network error: ${e.message}` };
  }
}

const json = (t) => { try { return JSON.parse(t); } catch { return null; } };

console.log(`Konduyt production smoke test`);
console.log(`  api:  ${API}`);
console.log(`  site: ${SITE}`);
console.log('----------------------------------------------------------------');

// --- 1. API is up, healthy, and its schema is intact ------------------------
const health = await req(`${API}/health`);
const h = json(health.text) || {};
check('API /health responds 200', health.status === 200, `status=${health.status}`);
check('health reports status ok', h.status === 'ok');
check('database reachable', h.database === true);
check('encryption configured', h.encryption === true);
check('environment is production', h.environment === 'production', `env=${h.environment}`);
check('schema and migrations ok',
  h.startup?.schema?.ok === true && h.startup?.migrations?.ok === true);
check('no startup initialization error', h.startup?.initialization?.error === null);
check('both OAuth providers configured',
  h.providers?.google === true && h.providers?.github === true);

// --- 2. Login initiation hands off to the real providers --------------------
const g = await req(`${API}/auth/google`);
check('GET /auth/google redirects to Google',
  g.status === 302 && /accounts\.google\.com/.test(g.headers.get('location') || ''),
  `status=${g.status} loc=${(g.headers.get('location') || '').slice(0, 60)}`);
const gh = await req(`${API}/auth/github`);
check('GET /auth/github redirects to GitHub',
  gh.status === 302 && /github\.com\/login\/oauth/.test(gh.headers.get('location') || ''),
  `status=${gh.status} loc=${(gh.headers.get('location') || '').slice(0, 60)}`);
check('OAuth state cookie is set on login start',
  /kdu_oauth_state=/.test(g.headers.get('set-cookie') || ''),
  'the state cookie guards the callback against CSRF');

// --- 3. Session guard: unauthenticated access is refused --------------------
const me = await req(`${API}/me`);
check('GET /me without a token is refused (401)',
  me.status === 401, `status=${me.status}`);

// --- 4. Provider configuration surfaces exist and require auth --------------
for (const path of ['/providers', '/methods']) {
  const r = await req(`${API}${path}`);
  check(`GET ${path} requires auth (401, not a 500)`,
    r.status === 401, `status=${r.status} body=${r.text.slice(0, 80)}`);
}

// --- 5. Payment endpoints require a secret key ------------------------------
const ps = await req(`${API}/v1/payment_sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 5000, currency: 'KES' }),
});
check('POST /v1/payment_sessions without a key is refused (401)',
  ps.status === 401, `status=${ps.status}`);
const pay = await req(`${API}/v1/payments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 5000 }),
});
check('POST /v1/payments without a key is refused (401)',
  pay.status === 401, `status=${pay.status}`);

// --- 6. Webhook receivers reject unverifiable payloads without erroring -----
const wh = await req(`${API}/v1/webhooks/paystack`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
const whBody = json(wh.text) || {};
check('POST /v1/webhooks/paystack rejects an unverifiable payload gracefully',
  wh.status === 202 && whBody.ok === false, `status=${wh.status} body=${wh.text.slice(0, 80)}`);
const bwh = await req(`${API}/v1/billing/webhooks/paystack`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
const bwhBody = json(bwh.text) || {};
check('POST /v1/billing/webhooks/paystack rejects an unverifiable payload gracefully',
  bwh.status === 202 && bwhBody.ok === false, `status=${bwh.status} body=${bwh.text.slice(0, 80)}`);

// --- 7. The public sandbox demo actually prices a payment -------------------
const demo = await req(`${API}/v1/demo/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: 500000, currency: 'KES', country: 'KE' }),
});
const d = json(demo.text) || {};
const opt = d.intelligence?.options?.[0];
check('POST /v1/demo/run returns a priced sandbox payment',
  demo.status === 200 && d.payment?.status === 'created' && opt?.fee_minor != null,
  `status=${demo.status} fee=${opt?.fee_minor}`);
check('sandbox demo is clearly marked simulated',
  d.payment?.simulated === true, 'a demo must never look like a real charge');

// --- 8. The drop-in SDK and the public checkout config surface --------------
const cfg = await req(`${API}/checkout/config`);
check('GET /checkout/config with no key fails closed',
  cfg.status === 404 && /invalid_publishable_key/.test(cfg.text),
  `status=${cfg.status}`);
const sdk = await req(`${SITE}/konduyt.js`);
check('the drop-in SDK is served from the production site',
  sdk.status === 200 && /javascript/.test(sdk.headers.get('content-type') || ''),
  `status=${sdk.status}`);

// --- 9. The live site still serves the product ------------------------------
for (const p of ['/', '/dashboard/', '/signin/', '/signup/', '/docs/']) {
  const r = await req(`${SITE}${p}`);
  check(`production site serves ${p}`,
    r.status === 200, `status=${r.status}`);
}

console.log('----------------------------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
console.log('');
console.log('Not exercised end to end (correctly guarded, needs real credentials):');
console.log('  - a signed-in dashboard session (needs a browser OAuth consent)');
console.log('  - creating a real payment session / charge (needs a merchant secret key)');
console.log('  - delivering a signed provider webhook (needs a provider signature)');
process.exit(failures ? 1 : 0);
