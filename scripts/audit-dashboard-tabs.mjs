// Dashboard tab audit. The dashboard is a single route (/dashboard/) whose
// tabs render client-side from ?tab=, so "dashboard pages" means the tab set,
// not separate URLs. For each tab at each breakpoint: screenshot + overflow
// check, so the coverage claim is backed by an image per tab per width.
//
//   AUDIT_TOKEN=<jwt> node scripts/audit-dashboard-tabs.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://localhost:12000';
const OUT = join(ROOT, '.audit', 'tabs');
const WIDTHS = [360, 390, 768, 1440];
const TOKEN = process.env.AUDIT_TOKEN || '';

const TABS = [
  'connections', 'quickstart', 'routing', 'overview', 'activity',
  'money', 'messages', 'settings', 'billing',
  'fee-monitor', 'sentinel', 'users', 'analytics',
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
let problems = 0;

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript((t) => {
    try { localStorage.setItem('kdu_token', t); } catch {}
  }, TOKEN);

  for (const tab of TABS) {
    const url = `${BASE}/dashboard/?tab=${tab}`;
    const shot = join(OUT, `${tab}_${width}.png`);
    const rec = { tab, width, shot: `.audit/tabs/${tab}_${width}.png`, ok: true, problems: [] };
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      // The dashboard fetches its data after mount, so wait for the tab bar to
      // exist before probing -- a fixed sleep is not enough and silently
      // screenshots a half-rendered page.
      await page.waitForSelector('.con-tab', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1800);
      await page.screenshot({ path: shot, fullPage: true });

      const probe = await page.evaluate(() => {
        const vw = window.innerWidth;
        const scrolls = (el) => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (/(auto|scroll)/.test(s.overflowX) || /(auto|scroll)/.test(s.overflow)) return true;
          }
          return false;
        };
        let over = 0;
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (r.right > vw + 1 && !scrolls(el) && r.right - vw >= 2) over++;
        }
        const active = document.querySelector('.con-tab.active, [aria-selected="true"]');
        return {
          docScrollW: document.documentElement.scrollWidth,
          vw,
          over,
          activeTab: active ? active.textContent.trim().slice(0, 30) : null,
          bodyLen: (document.body.innerText || '').trim().length,
        };
      });
      rec.docScrollW = probe.docScrollW;
      rec.pageOverflow = probe.docScrollW - probe.vw;
      rec.overflowEls = probe.over;
      rec.activeTab = probe.activeTab;
      rec.bodyLen = probe.bodyLen;
      if (rec.pageOverflow > 1 || probe.over > 0) {
        rec.ok = false; rec.problems.push(`overflow ${Math.max(rec.pageOverflow, 0)}px`);
      }
      // A tab that rendered nothing is a silent failure worth flagging.
      if (probe.bodyLen < 40) {
        rec.ok = false; rec.problems.push(`rendered ${probe.bodyLen} chars`);
      }
    } catch (e) {
      rec.ok = false; rec.problems.push(String(e.message).slice(0, 100));
    }
    if (!rec.ok) problems++;
    results.push(rec);
    console.log(`${rec.ok ? 'ok ' : 'BAD'} tab=${tab.padEnd(12)} @${String(width).padEnd(5)} ` +
      `active="${rec.activeTab}" chars=${rec.bodyLen} overflowEls=${rec.overflowEls}` +
      `${rec.problems.length ? '  ' + rec.problems.join('; ') : ''}`);
  }
  await ctx.close();
}

await browser.close();
writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log('----------------------------------------------');
console.log(`captured ${results.length} tab/width combos, ${problems} with a problem`);
process.exit(problems ? 1 : 0);
