// Real-browser acceptance for the three-product landing page and the existing
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

// ---- The landing page -----------------------------------------------------
{
  const { ctx, page } = await open('/');
  const text = await page.locator('body').innerText();
  check('the landing page loads', text.length > 200);

  const cards = page.locator('.product-card');
  check('exactly three product options are shown', (await cards.count()) === 3,
    String(await cards.count()));

  check('Developers & Businesses is present',
    /Konduyt for Developers & Businesses/.test(text));
  check('Creators is present', /Konduyt for Creators/.test(text));
  check('Payroll is present', /Konduyt Payroll/.test(text));

  check('Developers & Businesses carries the existing-platform status',
    /Existing platform\. Still operational, currently undergoing major developments\./.test(text));
  check('Creators carries the actively-developing status',
    /This is the product we are actively developing\./.test(text));
  check('Payroll is marked coming soon', /Coming soon/.test(text));

  const devHref = await cards.nth(0).getAttribute('href');
  const creHref = await cards.nth(1).getAttribute('href');
  check('Developers & Businesses links to the existing product',
    devHref === '/developers/', String(devHref));
  check('Creators links to the creator product', creHref === '/creators/', String(creHref));
  check('Payroll is not a link, so it cannot lead anywhere broken',
    (await cards.nth(2).getAttribute('href')) === null);
  check('Payroll is marked disabled for assistive technology',
    (await cards.nth(2).getAttribute('aria-disabled')) === 'true');

  // Navigation actually works.
  await page.locator('.product-card').nth(0).click();
  await page.waitForLoadState('networkidle');
  check('clicking Developers & Businesses opens the existing product',
    /developers/.test(page.url()) && (await page.locator('body').innerText()).length > 200,
    page.url());
  await ctx.close();
}

{
  const { ctx, page } = await open('/');
  await page.locator('.product-card').nth(1).click();
  await page.waitForLoadState('networkidle');
  check('clicking Creators opens the creator entry point',
    /creators/.test(page.url()) && /Creators/.test(await page.locator('body').innerText()),
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
  const cards = page.locator('.product-card');
  check('all three product options are still shown on a phone',
    (await cards.count()) === 3);
  check('Payroll is still not a link on a phone',
    (await cards.nth(2).getAttribute('href')) === null);
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

// ---- Existing product surface still reachable ---------------------------
for (const path of ['/developers/', '/docs/', '/pricing/']) {
  const { ctx, page } = await open(path);
  const t = await page.locator('body').innerText();
  check(`the existing ${path} page still loads`, t.length > 200, t.slice(0, 120));
  await ctx.close();
}

const realErrors = errors.filter((e) =>
  !/favicon|React DevTools|manifest|Failed to load resource/i.test(e));
check('no page errors across the session', realErrors.length === 0,
  realErrors.slice(0, 3).join(' | '));

await browser.close();
console.log('\n----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
