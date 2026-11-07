// Real-browser acceptance for the shared-platform product routing: the product
// switcher, the destination carried through authentication, and the three
// separated pricing models.
//
//   BASE=http://localhost:4173 API=http://localhost:8000 \
//     node scripts/audit-product-routing.mjs
//
// Needs both servers up, so it is an audit rather than part of npm test.

import { chromium } from 'playwright';

const WEB = process.env.BASE || 'http://localhost:4173';

let checks = 0, failures = 0;
function check(name, passed, detail = '') {
  checks += 1;
  if (!passed) failures += 1;
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${name}${!passed && detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch();

// ---- A creator signing in is aimed at the creator product ------------------
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${WEB}/creators/`, { waitUntil: 'networkidle' });
  const href = await page.locator('.nav-right .signin').first().getAttribute('href');
  check('the creator surface sign-in carries the creators destination',
    href === '/signin/?next=%2Fcreators%2Fideas%2F', String(href));

  await page.goto(`${WEB}/signin/?next=%2Fcreators%2Fideas%2F`, { waitUntil: 'networkidle' });
  const seen = [];
  page.on('request', (r) => { if (/\/auth\/(google|github)/.test(r.url())) seen.push(r.url()); });
  await page.locator('.auth-btn').first().click();
  await page.waitForTimeout(2000);
  check('the provider start URL carries the chosen product through the round trip',
    seen.length > 0 && /next=%2Fcreators%2Fideas%2F/.test(seen[0]), seen.join(' | '));
  await ctx.close();
}

// ---- The dashboard return honours a valid destination, not a forged one ----
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${WEB}/dashboard/#token=faketoken&next=%2Fcreators%2Fideas%2F`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('a valid creator destination lands in the creator workspace',
    /\/creators\/ideas\/?$/.test(new URL(page.url()).pathname), page.url());
  await ctx.close();
}

{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${WEB}/dashboard/#token=faketoken`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('a plain dashboard sign-in still stays on the dashboard',
    /\/dashboard\/?$/.test(new URL(page.url()).pathname), page.url());
  await ctx.close();
}

{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${WEB}/dashboard/#token=faketoken&next=https%3A%2F%2Fevil.example.com%2F`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check('an off-site destination cannot redirect the browser off Konduyt',
    new URL(page.url()).host === new URL(WEB).host, page.url());
  await ctx.close();
}

// ---- The shared product switcher ------------------------------------------
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${WEB}/developers/`, { waitUntil: 'networkidle' });
  const btn = page.locator('.product-switcher-btn');
  check('the product switcher is on the developers surface', await btn.count() === 1);
  await btn.click();
  await page.waitForTimeout(300);
  check('the switcher lists all three products',
    await page.locator('.product-switcher-item').count() === 3);
  const creatorsItem = page.locator('.product-switcher-item', { hasText: 'Creators' });
  check('the switcher links to Creators', (await creatorsItem.getAttribute('href')) === '/creators/');
  const payroll = page.locator('.product-switcher-item-soon');
  check('Payroll is listed but is not a link, so it cannot lead anywhere broken',
    await payroll.count() === 1 && (await payroll.getAttribute('href')) === null);
  check('the switcher marks the product you are in',
    await page.locator('.product-switcher-item.is-current').count() === 1);
  await ctx.close();
}

// ---- Three separated pricing models ---------------------------------------
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${WEB}/pricing/`, { waitUntil: 'networkidle' });
  const t = await page.locator('body').innerText();
  check('pricing names the Developers & Businesses model', /Konduyt for Developers & Businesses/.test(t));
  check('pricing names the Creators model', /Konduyt for Creators/.test(t));
  check('pricing names the Payroll model and marks it coming soon',
    /Konduyt Payroll/.test(t) && /coming soon/i.test(t));
  check('Creators is described as free while in beta', /free while in beta/i.test(t));
  check('the Developers live-project price is unchanged', /\$10/.test(t));
  check('no plan is sold for the Payroll product', !/\$\d+[\s\S]{0,40}payroll/i.test(t));
  await ctx.close();
}

await browser.close();
console.log('\n----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
