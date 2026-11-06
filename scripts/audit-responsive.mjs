// Responsive audit: for every public route, at every breakpoint, capture a
// full-page screenshot and report (a) horizontal page overflow and (b) controls
// smaller than the 44px touch target. Evidence is written under .audit/ so the
// result can be reviewed after the fact rather than taken on trust.
//
//   node scripts/audit-responsive.mjs            # all routes
//   BASE=http://localhost:12000 node scripts/...
//
// Overflow rule: an element wider than the viewport is only a page-level
// overflow if no ancestor scrolls it. A <pre> that scrolls inside its own box is
// correct and must not be reported.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://localhost:12000';
const OUT = join(ROOT, '.audit');
const WIDTHS = [360, 390, 768, 1440];
const TOKEN = process.env.AUDIT_TOKEN || '';

// Routes that need a session. The token is injected ONLY for these: /signin/
// silently redirects to /dashboard/ when a valid token is present, so auditing
// it while signed in would screenshot the dashboard and never see the sign-in
// form at all.
const AUTH_ROUTES = new Set(
  (process.env.AUTH_ROUTES || '/dashboard/').split(',').filter(Boolean));

// Routes the task names: the three landing pages, sign-in, sign-up, the
// developer dashboard, and the supporting public pages that share the shell.
const ROUTES = (process.env.ROUTES || [
  '/',
  '/developers/',
  '/creators/',
  '/signin/',
  '/signup/',
  '/dashboard/',
  '/pricing/',
  '/docs/',
  '/about/',
  '/terms/',
  '/pay/',
  '/demo/',
  '/labs/',
  '/admin/messages/',
].join(',')).split(',').filter(Boolean);

const MIN_TAP = 44;

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const results = [];
let hardFailures = 0;

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    const slug = route === '/' ? 'root' : route.replace(/^\/|\/$/g, '').replace(/\//g, '-');
    const shot = join(OUT, `${slug}_${width}.png`);
    const rec = { route, width, shot: `.audit/${slug}_${width}.png`, ok: true, problems: [] };

    // Inject or clear the session for THIS route only.
    await page.addInitScript((t) => {
      try {
        if (t) localStorage.setItem('kdu_token', t);
        else localStorage.removeItem('kdu_token');
      } catch {}
    }, AUTH_ROUTES.has(route) ? TOKEN : '');

    try {
      const resp = await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(700);
      rec.status = resp ? resp.status() : null;
      rec.signedIn = AUTH_ROUTES.has(route) && !!TOKEN;

      await page.screenshot({ path: shot, fullPage: true });

      const probe = await page.evaluate((MIN_TAP) => {
        const vw = window.innerWidth;
        const scrollsAncestor = (el) => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (/(auto|scroll)/.test(s.overflowX) || /(auto|scroll)/.test(s.overflow)) return true;
          }
          return false;
        };
        const overflow = [];
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vw + 1) {
            if (scrollsAncestor(el)) continue;
            // A single-pixel subpixel rounding is not a real overflow.
            if (r.right - vw < 2) continue;
            overflow.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className || '').toString().slice(0, 60),
              right: Math.round(r.right),
              over: Math.round(r.right - vw),
            });
          }
        }
        const small = [];
        const severe = [];
        const SEL = 'a, button, [role="button"], input, select, textarea';
        for (const el of document.querySelectorAll(SEL)) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const s = getComputedStyle(el);
          if (s.visibility === 'hidden' || s.display === 'none') continue;
          const txt = (el.textContent || '').trim();
          // WCAG 2.5.8 Target Size (Minimum) is 24x24 CSS px. Anything under
          // that on a phone is a real, reportable miss, not a nitpick.
          if (r.height < 24 || r.width < 24) {
            severe.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className || '').toString().slice(0, 50),
              text: txt.slice(0, 30),
              w: Math.round(r.width), h: Math.round(r.height),
            });
          }
          if (r.height < MIN_TAP - 1 || r.width < 24) {
            small.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className || '').toString().slice(0, 50),
              text: txt.slice(0, 30),
              w: Math.round(r.width), h: Math.round(r.height),
            });
          }
        }
        return {
          docScrollW: document.documentElement.scrollWidth,
          vw,
          overflow,
          smallCount: small.length,
          smallSample: small.slice(0, 8),
          severeCount: severe.length,
          severeSample: severe.slice(0, 12),
        };
      }, MIN_TAP);

      rec.docScrollW = probe.docScrollW;
      rec.vw = probe.vw;
      rec.finalUrl = page.url();
      rec.pageOverflow = probe.docScrollW - probe.vw;
      rec.overflowEls = probe.overflow.length;
      rec.overflowSample = probe.overflow.slice(0, 5);
      rec.smallTargets = probe.smallCount;
      rec.smallSample = probe.smallSample;
      rec.severeTargets = probe.severeCount;
      rec.severeSample = probe.severeSample;

      // An unexpected redirect means the screenshot is not the page we asked for.
      const want = new URL(url).pathname;
      const got = new URL(page.url()).pathname;
      if (got !== want) {
        rec.ok = false;
        rec.problems.push(`redirected to ${got}`);
      }

      if (rec.pageOverflow > 1 || probe.overflow.length > 0) {
        rec.ok = false;
        rec.problems.push(`overflow ${Math.max(rec.pageOverflow, 0)}px`);
      }
      if (rec.status && rec.status >= 400) {
        rec.ok = false;
        rec.problems.push(`HTTP ${rec.status}`);
      }
    } catch (e) {
      rec.ok = false;
      rec.status = 'error';
      rec.problems.push(String(e.message).slice(0, 120));
    }

    if (!rec.ok) hardFailures++;
    results.push(rec);
    const flag = rec.ok ? 'ok ' : 'BAD';
    console.log(`${flag} ${route.padEnd(20)} @${String(width).padEnd(5)} ` +
      `status=${rec.status} scrollW=${rec.docScrollW ?? '?'} overflowEls=${rec.overflowEls ?? '?'} ` +
      `small=${rec.smallTargets ?? '?'} severe=${rec.severeTargets ?? '?'}${rec.problems.length ? '  ' + rec.problems.join('; ') : ''}`);
  }
  await ctx.close();
}

await browser.close();

writeFileSync(join(OUT, 'results.json'), JSON.stringify(results, null, 2));
console.log('----------------------------------------------');
console.log(`captured ${results.length} page/width combos, ${hardFailures} with a problem`);
console.log(`evidence: .audit/results.json and .audit/*.png`);
process.exit(hardFailures ? 1 : 0);
