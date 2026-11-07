// Real-browser acceptance for the CreatorOS workspace.
//
// This drives a real Chromium against the real static export talking to the
// real API, so it exercises the seams a source-reading test cannot: IndexedDB,
// the offline outbox, the sync round-trip, the calendar projection, and the
// Twin's server-enforced privacy control.
//
//   BASE=http://localhost:4173 API=http://localhost:8000 WORKSPACE_TOKEN=<jwt> \
//     node scripts/audit-creatoros-workspace.mjs
//
// Needs both servers up, so it is an audit rather than part of npm test.

import { chromium } from 'playwright';

const API = process.env.API || 'http://127.0.0.1:8000';
const WEB = process.env.BASE || 'http://localhost:4173';
const TOKEN = process.env.WORKSPACE_TOKEN;
if (!TOKEN) {
  console.error('WORKSPACE_TOKEN is required (a real Konduyt session JWT).');
  process.exit(2);
}

let checks = 0, failures = 0;
function check(name, passed, detail = '') {
  checks += 1;
  if (!passed) failures += 1;
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${name}${!passed && detail ? ` — ${detail}` : ''}`);
}

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

// Seed the existing Konduyt session exactly as a returning user would have it.
await page.addInitScript(([k, v]) => {
  try { localStorage.setItem(k, v); } catch (e) {}
}, ['kdu_token', TOKEN]);

await page.goto(`${WEB}/creators/ideas/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const bodyText = await page.locator('body').innerText();
check('the workspace loads for a signed-in creator',
  /New idea|Your ideas workspace/.test(bodyText), bodyText.slice(0, 160));

// Create an idea through the real UI.
await page.getByRole('button', { name: /Start an idea|New idea/ }).first().click();
await page.waitForTimeout(400);
const titleBox = page.locator('.ideas-title');
check('creating an idea opens the editor', await titleBox.count() > 0);

await titleBox.fill('Pacing and audience attention');
await page.waitForTimeout(900);
const blockText = page.locator('.ideas-block-text').first();
await blockText.fill('Pacing matters because the audience feels it. '
  + 'A slow opening loses people before the argument lands.');
await page.waitForTimeout(1800);

// Wait for the background sync to land it server-side.
await page.waitForTimeout(2500);
const listed = await page.locator('.ideas-item-title').allInnerTexts();
check('the idea appears in the list after typing',
  listed.some((t) => /Pacing/.test(t)), listed.join(' | '));

// The calendar view.
await page.getByRole('button', { name: 'Calendar' }).click();
await page.waitForTimeout(1200);
const calText = await page.locator('.ideas-calendar').innerText();
check('the calendar view opens', /Publishing calendar/.test(calText), calText.slice(0, 120));

// Back to writing, then schedule the idea.
await page.getByRole('button', { name: 'Write' }).click();
await page.waitForTimeout(600);
await page.locator('.ideas-item').first().click();
await page.waitForTimeout(800);
const dateBox = page.locator('.ideas-date');
check('the editor offers a schedule date', await dateBox.count() > 0);
await dateBox.fill('2030-03-04');
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'Calendar' }).click();
await page.waitForTimeout(1500);
const cal2 = await page.locator('.ideas-calendar').innerText();
check('a scheduled idea appears on the calendar at its date',
  /Pacing/.test(cal2) && /Mar 4/.test(cal2), cal2.slice(0, 300));

// Twin privacy toggle, and the server must agree.
await page.getByRole('button', { name: 'Write' }).click();
await page.waitForTimeout(600);
await page.locator('.ideas-item').first().click();
await page.waitForTimeout(600);
const privBtn = page.getByRole('button', { name: /Twin can see|Private to Twin/ });
check('the per-idea Twin privacy control is present', await privBtn.count() > 0);
await privBtn.click();
await page.waitForTimeout(2500);

const ctxRes = await fetch(`${API}/creatoros/twin/context`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const ctxJson = await ctxRes.json();
const ideasRes = await fetch(`${API}/creatoros/ideas`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const ideasJson = await ideasRes.json();
const marked = (ideasJson.ideas || []).filter((i) => i.exclude_from_twin);
const visibleIds = new Set((ctxJson.ideas_visible || []).map((i) => i.id));
check('turning the page private reaches the server as a document flag',
  marked.length > 0, JSON.stringify((ideasJson.ideas || []).map((i) => [i.id, i.exclude_from_twin])));
check('a private page is excluded from what the Twin can see',
  marked.length > 0 && marked.every((i) => !visibleIds.has(i.id)),
  JSON.stringify({ marked: marked.map((i) => i.id), visible: [...visibleIds] }));

// The Twin panel: enable, then ask a connection question with no model.
await page.getByRole('button', { name: 'Twin', exact: true }).click();
await page.waitForTimeout(1200);
const panel = page.locator('.twin-panel');
check('the Twin panel opens', await panel.count() > 0, '');
const turnOn = page.getByRole('button', { name: /Turn on my Twin/ });
if (await turnOn.count()) {
  await turnOn.click();
  await page.waitForTimeout(1800);
}
const afterEnable = await panel.innerText();
check('the Twin turns on', /On ·/.test(afterEnable), afterEnable.slice(0, 160));

await page.getByRole('button', { name: /What does this connect to\?/ }).click();
await page.waitForTimeout(2500);
const thread = await panel.innerText();
check('the Twin answers a connection question without a model',
  /other ideas|share ground|standing on its own|Nothing in your other/i.test(thread),
  thread.slice(-300));

// "What does my Twin know" must show observations the creator can remove.
await page.getByRole('button', { name: /What does my Twin know\?/ }).click();
await page.waitForTimeout(1800);
// `innerText` returns text as rendered, and these headings are uppercased by
// CSS, so match case-insensitively rather than on the source casing.
const knowText = await panel.innerText();
check('the panel shows what the Twin knows', /what it can see/i.test(knowText));
check('the panel lists patterns the creator can remove',
  /patterns in your writing/i.test(knowText), knowText.slice(0, 400));

// A second idea sharing a subject must produce an observation the creator can
// then remove, and the removal must stick on the server. The first idea is
// made visible again first: while it is private it is deliberately not part of
// the Twin's view, so a shared word across the two could not be derived from it.
await page.getByRole('button', { name: 'Twin', exact: true }).click(); // close panel
await page.waitForTimeout(500);
await page.getByRole('button', { name: /Private to Twin/ }).click();
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /New idea/ }).first().click();
await page.waitForTimeout(400);
await page.locator('.ideas-title').fill('Pacing in long-form video');
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Twin', exact: true }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /Update what it knows/ }).click();
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /What does my Twin know\?/ }).click();
await page.waitForTimeout(1500);

const ctxObs = await (await fetch(`${API}/creatoros/twin/context`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
})).json();
const observed = ctxObs.observed || [];
check('a recurring subject is derived as an observation',
  observed.some((o) => o.kind === 'recurring_subject'),
  JSON.stringify(observed.map((o) => [o.kind, o.value])));

const removable = observed.find((o) => o.kind === 'recurring_subject');
if (removable) {
  const row = page.locator('.twin-observation').filter({ hasText: String(removable.value) });
  check('the observation is rendered with a remove control',
    (await row.count()) > 0 && (await row.locator('.twin-observation-x').count()) > 0);
  await row.locator('.twin-observation-x').first().click();
  await page.waitForTimeout(1800);
  const after = await (await fetch(`${API}/creatoros/twin/context`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })).json();
  check('removing an observation sticks on the server',
    !(after.observed || []).some((o) => o.kind === 'recurring_subject'
      && String(o.value) === String(removable.value)),
    JSON.stringify((after.observed || []).map((o) => [o.kind, o.value])));
}

// Mobile: the workspace must reflow, not overflow.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(900);
const overflow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
}));
check('the workspace does not overflow horizontally on a phone',
  overflow.scrollW <= overflow.clientW + 2, JSON.stringify(overflow));

const realErrors = errors.filter((e) =>
  !/favicon|Download the React DevTools|manifest/i.test(e));
check('no page errors during the session', realErrors.length === 0,
  realErrors.slice(0, 3).join(' | '));

await browser.close();
console.log('\n----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
