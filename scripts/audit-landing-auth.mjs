// Real-browser acceptance for the single-product landing page and the existing
// authentication flows, run against the real static export and the real API.
//
//   BASE=http://localhost:4173 API=http://localhost:8000 \
//     node scripts/audit-landing-auth.mjs
//
// Needs both servers up, so it is an audit rather than part of npm test.

import { chromium } from 'playwright';

const API = process.env.API || 'http://127.0.0.1:8000';
const WEB = process.env.BASE || 'http://localhost:4173';

let checks = 0, failures = 0;
function check(name, passed, detail = '') {
  checks += 1;
  if (!passed) failures += 1;
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${name}${!passed && detail ? ` — ${detail}` : ''}`);
}

const errors = [];
const browser = await chromium.launch();

async function open(path, width = 1440, height = 900) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${path}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${path}: ${m.text()}`); });
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  return { ctx, page };
}

// ---- The landing page is the payment product itself -----------------------
{
  const { ctx, page } = await open('/');
  const text = await page.locator('body').innerText();
  check('the landing page loads', text.length > 200);
  check('the landing page is the payment product (hero copy present)',
    /One integration\./.test(text) && /Every payment/.test(text));
  check('the landing page shows the supported providers',
    /Stripe/.test(text) && /M-Pesa/.test(text));
  check('the landing page does not offer a product selection',
    (await page.locator('.product-card').count()) === 0);
  check('no CreatorOS entry point is offered', !/Konduyt for Creators/.test(text));
  check('no Payroll entry point is offered', !/Konduyt Payroll/.test(text));
  await ctx.close();
}

// ---- The retired creator routes are gone ----------------------------------
for (const path of ['/creators/', '/creators/ideas/', '/creators/audit/']) {
  const { ctx, page } = await open(path);
  const text = await page.locator('body').innerText();
  const status = await page.evaluate(() => document.title);
  check(`${path} no longer serves a creator product`,
    !/Your workspace for building/.test(text) && !/Creator Audit/i.test(text),
    `title=${status}`);
  await ctx.close();
}

// ---- The export itself serves no /developers/ or creator route ------------
// The /developers/ -> / redirect is a Cloudflare Pages Function
// (functions/_middleware.js), applied at the CDN edge, not by the static
// export. A plain static server cannot run it, so the redirect is asserted
// statically in scripts/test-landing-restructure.mjs rather than here. What the
// export must show is that neither route is emitted as a page of its own.
for (const path of ['/developers/', '/creators/', '/creators/ideas/']) {
  const { ctx, page } = await open(path);
  const text = await page.locator('body').innerText();
  check(`the export emits no page at ${path}`,
    !/One integration\./.test(text) && !/Your workspace for building/.test(text),
    page.url());
  await ctx.close();
}

// ---- Mobile --------------------------------------------------------------
{
  const { ctx, page } = await open('/', 390, 844);
  const overflow = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
  check('the landing page does not overflow horizontally on a phone',
    overflow.scrollW <= overflow.clientW + 2, JSON.stringify(overflow));
  check('no product-selection cards on a phone either',
    (await page.locator('.product-card').count()) === 0);
  await ctx.close();
}

// ---- Existing signup and login ------------------------------------------
{
  const { ctx, page } = await open('/signup/');
  const text = await page.locator('body').innerText();
  check('the existing signup page still loads', /Sign up|Create|Get started/i.test(text),
    text.slice(0, 200));
  check('signup offers the existing providers',
    /Google|GitHub/i.test(text), text.slice(0, 300));
  await ctx.close();
}

{
  const { ctx, page } = await open('/signin/');
  const text = await page.locator('body').innerText();
  check('the existing sign-in page still loads', /Sign in/i.test(text), text.slice(0, 200));
  check('sign-in offers the existing providers',
    /Google|GitHub/i.test(text), text.slice(0, 300));
  await ctx.close();
}

// A real OAuth start must reach the API, not a dead page. The provider buttons
// are JS handlers (they navigate on click), so the request is observed rather
// than read off an href.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const seen = [];
  page.on('request', (r) => {
    if (/\/auth\/(google|github)/.test(r.url())) seen.push(r.url());
  });
  await page.goto(`${WEB}/signin/`, { waitUntil: 'networkidle' });
  await page.locator('.auth-btn').first().click();
  await page.waitForTimeout(2500);
  check('the sign-in provider button starts the existing auth flow',
    seen.length > 0 && /\/auth\/(google|github)/.test(seen[0]), seen.join(' | '));
  if (seen.length) {
    const res = await fetch(seen[0], { redirect: 'manual' });
    check('the existing auth route responds (not a 404)',
      res.status !== 404, `status ${res.status}`);
  }
  await ctx.close();
}

// ---- Existing product surfaces still reachable ---------------------------
for (const path of ['/docs/', '/pricing/']) {
  const { ctx, page } = await open(path);
  const t = await page.locator('body').innerText();
  check(`the existing ${path} page still loads`, t.length > 200, t.slice(0, 120));
  await ctx.close();
}

// The dashboard is a signed-in surface. An anonymous visit must land on the
// existing sign-in gate -- a working page that sends the visitor to the real
// auth flow -- not a broken or blank console.
{
  const { ctx, page } = await open('/dashboard/');
  const t = await page.locator('body').innerText();
  check('the existing dashboard gates an anonymous visitor behind sign-in',
    /not signed in|sign in/i.test(t), t.slice(0, 160));
  const signInHref = await page.locator('a[href*="/signin"]').first().getAttribute('href').catch(() => null);
  check('the dashboard sign-in gate points at the existing sign-in page',
    !!signInHref && /\/signin/.test(signInHref), String(signInHref));
  await ctx.close();
}

// The API CORS allow-list is strict: a localhost origin makes /health and
// /admin/whoami fail with a console CORS error that is an environment artifact,
// not a page error (see AGENTS.md). Run against the production origin for a
// clean pass.
const realErrors = errors.filter((e) =>
  !/favicon|React DevTools|manifest|Failed to load resource/i.test(e)
  && !/CORS policy|Access-Control-Allow-Origin/i.test(e));
check('no page errors across the session', realErrors.length === 0,
  realErrors.slice(0, 3).join(' | '));

await browser.close();
console.log('\n----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
