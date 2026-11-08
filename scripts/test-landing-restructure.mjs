// Guard the return to a single-product site.
//
// Konduyt Payments is the only active product again: CreatorOS (Konduyt for
// Creators) has been retired and Payroll is parked. The site root is the
// payment product directly, and nothing in the public experience may offer a
// retired product or a route that no longer exists.
//
// Two things must never regress silently:
//
//   1. The root is the payment landing page itself -- the hero, the vendor rail
//      and the interactive panel -- not a product-selection page.
//   2. No CreatorOS or Payroll entry point survives: no links, no pages, no
//      product cards, and no creator product surface to navigate to.
//
// The CSS half is the repo's own layout-variant rule (see AGENTS.md): a class
// named in JSX with no rule in globals.css renders as full-size body text and
// fails silently, so every class the root page uses must have a rule.
//
// Run: node scripts/test-landing-restructure.mjs
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel) => existsSync(join(ROOT, rel));

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

console.log('Single-product landing: Konduyt Payments only');
console.log('----------------------------------------------');

const HOME = read('app/page.js');
const CSS = read('app/globals.css');

// --- The root is the payment product itself ---------------------------------
check('root page is the payment product, not a product-selection page',
  /import\s+DevPanel\s+from/.test(HOME) && /vendor-row/.test(HOME)
  && !HOME.includes('PRODUCTS') && !HOME.includes('product-list'));

check('root page keeps the payment hero copy',
  HOME.includes('One integration.') && HOME.includes('Every payment'));
check('root page keeps the interactive code panel', /<DevPanel\s*\/>/.test(HOME));
check('root page keeps the supported-providers rail',
  /vendor-row/.test(HOME) && /Stripe/.test(HOME) && /M-Pesa/.test(HOME));
check('root page keeps sign in and the dashboard CTA',
  /<SignInLink\s*\/>/.test(HOME) && /<NavCta\s*\/>/.test(HOME));

// --- No CreatorOS or Payroll entry point survives ---------------------------
check('root page links to no creator product', !/href="[^"]*creators/i.test(HOME));
check('root page links to no payroll route', !/href="[^"]*payroll/i.test(HOME));
check('root page advertises no creator or payroll card',
  !/works-card/.test(HOME) && !/KONDUYT<\/span>creators/.test(HOME)
  && !/KONDUYT<\/span>payroll/.test(HOME));

check('the creators product surface is gone', !exists('app/creators'));
check('the creators entry point is gone', !exists('app/creators/page.js'));
check('the ideas workspace is gone', !exists('app/creators/ideas/page.js'));
check('the public creator audit page is gone', !exists('app/creators/audit/page.js'));
check('the three-product switcher component is gone', !exists('app/ProductSwitcher.js'));

// --- The existing payment product keeps one canonical URL -------------------
check('the /developers/ duplicate route is gone (root is canonical)',
  !exists('app/developers/page.js'));
const MW = read('functions/_middleware.js');
check('a legacy /developers/ link still resolves (redirect to the root)',
  /RETIRED_PATHS/.test(MW) && /\/developers/.test(MW));
check('the retired creators host no longer serves a product page',
  /RETIRED_HOSTS/.test(MW) && /creators\.konduyt\.dev/.test(MW));

// --- Existing signup / login / sessions are untouched -----------------------
check('signup page still exists', exists('app/signup/page.js'));
check('signin page still exists', exists('app/signin/page.js'));
check('dashboard still exists', exists('app/dashboard/page.js'));

const SIGNUP = read('app/signup/page.js');
const SIGNIN = read('app/signin/page.js');
const NAVCTA = read('app/NavCta.js');
check('signup still starts the real provider OAuth flow',
  /`\$\{API_BASE\}\/auth\/\$\{provider\}/.test(SIGNUP));
check('signin still starts the real provider OAuth flow',
  /`\$\{API_BASE\}\/auth\/\$\{provider\}/.test(SIGNIN));
check('signup and signin still carry the destination through the auth round trip',
  /\?next=\$\{encodeURIComponent\(dest\)\}/.test(SIGNUP)
  && /\?next=\$\{encodeURIComponent\(dest\)\}/.test(SIGNIN));
check('signin still validates the existing session token against /me',
  SIGNIN.includes('`${API_BASE}/me`'));
check('the same account token key is used across the auth surfaces',
  SIGNIN.includes("'kdu_token'") && NAVCTA.includes("'kdu_token'")
  && read('app/SignInLink.js').includes("'kdu_token'")
  && read('app/dashboard/page.js').includes("'kdu_token'"),
  'all auth surfaces must read the one existing token key');
check('the signed-in CTA still routes to the existing dashboard',
  NAVCTA.includes("'/dashboard/'"));
check('the root landing page does not introduce a second auth system',
  !/\/auth\//.test(HOME) && !/\bkdu_token\b/.test(HOME) && !/\/me\b/.test(HOME),
  'the landing page must not touch authentication');

// --- The destination resolver is single-product and still safe --------------
const DEST = read('app/authDestination.js');
check('the destination allow-list is the Developers console only',
  /const ALLOWED = new Set\(\[PRODUCTS\.developers\.destination\]\)/.test(DEST));
check('a stale /creators/ value can no longer resolve to a removed route',
  !/creators/.test(DEST.replace(/\/\/[^\n]*/g, '')),
  'creators must appear only in explanatory comments, never in code');
check('the destination is still validated against an allow-list, not trusted',
  /ALLOWED\.has\(next\) \? next : DEFAULT_DESTINATION/.test(DEST));

// --- Every class the root page uses has a CSS rule --------------------------
const classesIn = (src) => {
  const out = new Set();
  for (const m of src.matchAll(/className="([^"]+)"/g)) {
    for (const cls of m[1].split(/\s+/)) {
      if (cls && !cls.includes('{') && !cls.includes('$')) out.add(cls);
    }
  }
  return out;
};
const hasRule = (cls) =>
  new RegExp(`\\.${cls.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}(?=[\\s,{:.>])`).test(CSS);

const newClasses = classesIn(HOME);
const missing = [...newClasses].filter((c) => !hasRule(c));
check(`every class on the root page has a CSS rule (${newClasses.size} checked)`,
  missing.length === 0, `missing: ${missing.join(', ')}`);

// --- The footer badge is preserved on the root ------------------------------
const footerMatch = HOME.match(/<footer className="site-footer">[\s\S]*?<\/footer>/);
const footer = footerMatch ? footerMatch[0] : '';
check('the root keeps the LaunchBuck footer badge',
  footer.includes('href="https://launchbuck.com/p/konduyt"')
  && footer.includes('src="https://launchbuck.com/badges/card-light.png"'));

// --- Pricing no longer sells a retired product ------------------------------
const PRICING = read('app/pricing/page.js');
check('pricing no longer separates creators/payroll products',
  !/id="creators"/.test(PRICING) && !/id="payroll"/.test(PRICING));
check('pricing keeps the Developers price model unchanged',
  /PRICE = 10/.test(PRICING) && /FREE_LIVE = 3/.test(PRICING));

// --- The responsive contract the kept pages rely on -------------------------
check('a phone breakpoint enlarges small tap targets',
  /@media \(max-width:980px\)\{[\s\S]*?\.docs-navitem\{padding:11px/.test(CSS)
  && /@media \(max-width:980px\)\{[\s\S]*?\.copy-icon-btn\{padding:8px/.test(CSS));

console.log('----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
