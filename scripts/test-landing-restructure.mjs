// Guard the three-product landing restructure.
//
// The public root is now a product-selection page with three options, each
// pointing at a real destination. Two things must never regress silently:
//
//   1. The three options exist, with their exact copy, and Payroll stays a
//      coming-soon, non-interactive card -- so it can never lead to a broken or
//      unfinished page.
//   2. The existing payment product was moved, not rewritten: the old landing
//      page still exists in full at /developers/, and the existing signup,
//      login and dashboard flows are untouched.
//
// The CSS half is the repo's own layout-variant rule (see AGENTS.md): a class
// named in JSX with no rule in globals.css renders as full-size body text and
// fails silently, so every class the new pages use must have a rule.
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

console.log('Landing restructure: three product entry points');
console.log('----------------------------------------------');

const HOME = read('app/page.js');
const CSS = read('app/globals.css');

// --- The three options exist, with their copy -------------------------------
check('root page is the product-selection page, not the old hero',
  HOME.includes('PRODUCTS') && !/import\s+DevPanel/.test(HOME) && !/vendor-row/.test(HOME));

check('Option 1 title: Konduyt for Developers & Businesses',
  HOME.includes('Konduyt for Developers & Businesses'));
check('Option 1 description',
  HOME.includes('One integration to connect your business to multiple payment providers and payment methods.'));
check('Option 1 status note names the existing platform',
  HOME.includes('Existing platform. Still operational, currently undergoing major developments.'));

check('Option 2 title: Konduyt for Creators', HOME.includes('Konduyt for Creators'));
check('Option 2 description',
  HOME.includes('Your workspace for building, growing and running a creator business.'));
check('Option 2 status says it is the product in development',
  HOME.includes('This is the product we are actively developing.'));

check('Option 3 title: Konduyt Payroll', HOME.includes('Konduyt Payroll'));
check('Option 3 description',
  HOME.includes('A future workspace for managing payroll and paying teams.'));
check('Option 3 is marked coming soon', /Coming soon/.test(HOME));

// --- Navigation between products --------------------------------------------
check('Developers option links to the existing product at /developers/',
  HOME.includes('href="/developers/"'));
check('Creators option links to the creators entry point at /creators/',
  HOME.includes('href="/creators/"'));
check('no option links to a payroll route',
  !/href="[^"]*payroll/i.test(HOME), 'a payroll href would be a broken destination');
check('Payroll renders as a non-interactive card (no href)',
  /product-card product-card-soon/.test(HOME) && /aria-disabled="true"/.test(HOME));

// --- The existing payment product is preserved, not rewritten ---------------
check('the old landing page still exists at app/developers/page.js',
  exists('app/developers/page.js'));
const DEV = exists('app/developers/page.js') ? read('app/developers/page.js') : '';
check('the developers page keeps the full payment hero copy',
  DEV.includes('One integration.') && DEV.includes('Every payment'));
check('the developers page keeps the interactive code panel',
  /import\s+DevPanel\s+from/.test(DEV) && /<DevPanel\s*\/>/.test(DEV));
check('the developers page keeps the supported-providers rail',
  /vendor-row/.test(DEV) && /Stripe/.test(DEV) && /M-Pesa/.test(DEV));
check('the developers page keeps sign in and the dashboard CTA',
  /<SignInLink\s*\/>/.test(DEV) && /<NavCta\s*\/>/.test(DEV));
check('the developers page has its own metadata layout',
  exists('app/developers/layout.js'));

// --- Creators entry point is a real, finished page --------------------------
check('the creators entry point exists', exists('app/creators/page.js'));
const CREATORS = exists('app/creators/page.js') ? read('app/creators/page.js') : '';
check('creators page offers an early-access action',
  CREATORS.includes('Request early access'));
check('creators page says the product is not open yet',
  /not available yet|not open yet/.test(CREATORS));
check('creators page points back at the developers product',
  CREATORS.includes('href="/developers/"'));
check('creators page does NOT send creators to the developer dashboard',
  !/href="\/dashboard/.test(CREATORS),
  'the dashboard belongs to Developers & Businesses, not Creators');
check('creators page has its own metadata layout', exists('app/creators/layout.js'));

// --- Existing signup / login / sessions are untouched -----------------------
check('signup page still exists', exists('app/signup/page.js'));
check('signin page still exists', exists('app/signin/page.js'));
check('dashboard still exists', exists('app/dashboard/page.js'));

const SIGNUP = read('app/signup/page.js');
const SIGNIN = read('app/signin/page.js');
const NAVCTA = read('app/NavCta.js');
check('signup still starts the real provider OAuth flow',
  SIGNUP.includes('`${API_BASE}/auth/${provider}`'));
check('signin still starts the real provider OAuth flow',
  SIGNIN.includes('`${API_BASE}/auth/${provider}`'));
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

// --- Every class the new pages use has a CSS rule ---------------------------
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

const newClasses = new Set([...classesIn(HOME), ...classesIn(CREATORS)]);
const missing = [...newClasses].filter((c) => !hasRule(c));
check(`every class in the new pages has a CSS rule (${newClasses.size} checked)`,
  missing.length === 0, `missing: ${missing.join(', ')}`);

// --- The footer badge is preserved on the new root --------------------------
const footerMatch = HOME.match(/<footer className="site-footer">[\s\S]*?<\/footer>/);
const footer = footerMatch ? footerMatch[0] : '';
check('the new root keeps the LaunchBuck footer badge',
  footer.includes('href="https://launchbuck.com/p/konduyt"')
  && footer.includes('src="https://launchbuck.com/badges/card-light.png"'));

console.log('----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
