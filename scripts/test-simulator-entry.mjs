// Guard the Phone Number Simulator entry point on konduyt.dev.
//
// The simulator is a separate application with its own deploy. This site links
// to it in three places -- the desktop nav, the mobile nav and the footer -- and
// offers a single explicit "Open Simulator" button. Two things must not regress
// silently:
//
//   1. The entry survives, points at the deployed simulator, and opens safely in
//      a new tab. Every class named in the JSX has a rule in globals.css (the
//      repo's layout-variant rule: a class with no rule renders as body text and
//      fails silently).
//   2. Konduyt Payments is untouched: the payment hero, the interactive panel
//      and the provider rail stay exactly where they were.
//
// Run: node scripts/test-simulator-entry.mjs
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

console.log('Phone Number Simulator entry on konduyt.dev');
console.log('--------------------------------------------');

const HOME = read('app/page.js');
const MOBILE = read('app/MobileNav.js');
const CSS = read('app/globals.css');
const CONFIG = read('app/simulator.js');

// --- the address -----------------------------------------------------------
check('the simulator URL is declared in exactly one module',
  /export const SIMULATOR_URL/.test(CONFIG) && !/https:\/\/work-1-/.test(HOME),
  'app/page.js must link the shared constant, not a literal URL');
check('the URL is overridable at build time',
  CONFIG.includes('NEXT_PUBLIC_SIMULATOR_URL'),
  'expected process.env.NEXT_PUBLIC_SIMULATOR_URL fallback');
check('the default points at an https deployment',
  /https:\/\/[^'"\s]+/.test(CONFIG), 'no https default URL in app/simulator.js');

// --- desktop nav -----------------------------------------------------------
const navMatch = HOME.match(/<div className="nav-links">[\s\S]*?<\/div>/);
const nav = navMatch ? navMatch[0] : '';
check('the desktop nav exists', nav.length > 0);
check('the desktop nav has a Simulator entry',
  /href=\{SIMULATOR_URL\}[^>]*>\s*Simulator\s*<\/a>/.test(nav),
  'expected <a href={SIMULATOR_URL} ...>Simulator</a> in .nav-links');
check('the nav entry opens in a new tab, safely',
  /href=\{SIMULATOR_URL\}[^>]*target="_blank"[^>]*rel="noreferrer"/.test(nav));
check('the nav keeps the existing Docs, Pricing, GitHub and Labs entries',
  ['/docs/', '/pricing/', 'https://github.com/konduyt-hq', '/labs/'].every((h) => nav.includes(h)));

// --- mobile nav ------------------------------------------------------------
check('the mobile nav imports the shared URL',
  /import \{ SIMULATOR_URL \} from '\.\/simulator'/.test(MOBILE));
check('the mobile nav lists the simulator',
  /\{ href: SIMULATOR_URL, label: 'Simulator', external: true \}/.test(MOBILE));
check('the mobile nav still lists every existing link',
  ['/docs/', '/pricing/', 'https://github.com/konduyt-hq', '/labs/'].every((h) => MOBILE.includes(h)));

// --- footer ----------------------------------------------------------------
const footerMatch = HOME.match(/<footer className="site-footer">[\s\S]*?<\/footer>/);
const footer = footerMatch ? footerMatch[0] : '';
check('the footer has a Simulator link',
  /href=\{SIMULATOR_URL\}[^>]*rel="noreferrer">Simulator<\/a>/.test(footer));
check('the footer keeps the LaunchBuck badge and terms link',
  footer.includes('launchbuck.com/p/konduyt') && footer.includes('href="/terms/"'));

// --- the Open Simulator button --------------------------------------------
const bandMatch = HOME.match(/<section className="sim-band">[\s\S]*?<\/section>/);
const band = bandMatch ? bandMatch[0] : '';
check('the landing page has a simulator band', band.length > 0);
check('the band offers an Open Simulator button',
  /className="sim-open"/.test(band) && /Open Simulator/.test(band));
check('the button links to the deployed simulator',
  /<a className="sim-open" href=\{SIMULATOR_URL\}/.test(band));
check('the button opens in a new tab, safely',
  /target="_blank"[^>]*rel="noreferrer"/.test(band));
check('the band marks the identifiers as test data',
  /\+254 999/.test(band) && /not real|never real/i.test(band),
  'the band must not present synthetic identifiers as real lines');
check('the band names what the tool does',
  /Simulated SMS/i.test(band) && /OTP/i.test(band));

// --- styling ---------------------------------------------------------------
for (const cls of ['sim-band', 'sim-card', 'sim-copy-block', 'sim-title',
                   'sim-desc', 'sim-meta', 'sim-tag', 'sim-action', 'sim-open', 'sim-note']) {
  check(`.${cls} has a CSS rule`, new RegExp(`\\.${cls}\\{[^}]*\\}`).test(CSS),
    `no .${cls} rule in globals.css`);
}
check('the band reflows on small screens',
  /@media \(max-width:760px\)\{[\s\S]*?\.sim-(card|action)/.test(CSS));

// --- payments untouched ----------------------------------------------------
check('the payment hero still renders',
  HOME.includes('One integration.') && HOME.includes('Every payment'));
check('the interactive payment panel still renders', /<DevPanel\s*\/>/.test(HOME));
check('the supported-providers rail still renders',
  /vendor-row/.test(HOME) && /Stripe/.test(HOME) && /M-Pesa/.test(HOME));
check('sign in and the account CTA are unchanged',
  /<SignInLink\s*\/>/.test(HOME) && /<NavCta\s*\/>/.test(HOME));
check('no retired product is advertised',
  !/href="[^"]*creators/i.test(HOME) && !/href="[^"]*payroll/i.test(HOME));

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
