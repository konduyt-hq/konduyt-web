// The "cannot receive money yet" notices used to be built on one fact —
// "no connected provider has verified capability for this country" — and
// rendered as "no connected provider covers Kenya". With PayPal connected
// that reads as a lie: PayPal IS connected. The missing distinction is LOCAL
// rails (a provider catalogued for the country: Flutterwave/Paystack in Kenya)
// vs a GLOBAL method (PayPal — the same wallet worldwide, catalogued "Global").
//
// This test covers both halves:
//   1. the classifier (providerreach.js) is exercised for real — no mocks — on
//      the exact catalog shapes the API returns, and
//   2. the dashboard source actually branches on that distinction and names
//      the connected provider instead of claiming none is connected.
//
// Checked at the source level (the exact expressions), the way
// test-billing-gate.mjs guards its shipped bug.
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  providerReach, connectedReach, joinNames, LOCAL, GLOBAL_REACH,
} from '../app/dashboard/providerreach.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DASH_SRC = join(ROOT, 'app/dashboard/page.js');

let failures = 0;
let checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

// ---- 1. Classifier (real logic) ----
console.log('\nproviderreach classification');

// Real catalog shapes: PayPal is countries ["Global"] with a wallet capability;
// Flutterwave is enumerated for KE with local methods; Stripe is enumerated for
// other countries only and offers no global method.
const paypal = {
  id: 'paypal', name: 'PayPal',
  countries: [{ code: 'Global', flag: '🌍', name: 'Global' }],
  capabilities: [{ id: 'paypal_wallet', category: 'wallets' }],
};
const flutterwave = {
  id: 'flutterwave', name: 'Flutterwave',
  countries: [{ code: 'KE', name: 'Kenya' }, { code: 'NG', name: 'Nigeria' }],
  capabilities: [{ id: 'mpesa', category: 'mobile_money' }],
};
const stripe = {
  id: 'stripe', name: 'Stripe',
  countries: [{ code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' }],
  capabilities: [{ id: 'card', category: 'cards' }],
};
const catalog = [paypal, flutterwave, stripe];

check('PayPal classifies as GLOBAL for Kenya (catalogued "Global", wallet)',
  providerReach(paypal, 'KE') === GLOBAL_REACH, providerReach(paypal, 'KE'));
check('Flutterwave classifies as LOCAL for Kenya (enumerated, local rails)',
  providerReach(flutterwave, 'KE') === LOCAL, providerReach(flutterwave, 'KE'));
check('Stripe is neither local nor global for Kenya (enumerated elsewhere, no wallet)',
  providerReach(stripe, 'KE') === null, providerReach(stripe, 'KE'));
check('PayPal is still GLOBAL for an enumerated market it is not listed in',
  providerReach(paypal, 'US') === GLOBAL_REACH, providerReach(paypal, 'US'));

// A global method is not a local rail: the exact confusion the notice had.
check('a connected global provider does not count as local coverage',
  connectedReach([{ provider_id: 'paypal' }], catalog, 'KE').local.length === 0);
check('a connected local provider does count as local coverage',
  connectedReach([{ provider_id: 'flutterwave' }], catalog, 'KE').local.length === 1);
check('connected PayPal is reported by name, not erased',
  connectedReach([{ provider_id: 'paypal' }], catalog, 'KE').globalReach
    .map((p) => p.name).join() === 'PayPal');
check('a catalog miss is neither local nor global (absent), never invented',
  connectedReach([{ provider_id: 'ghost' }], catalog, 'KE').byId.ghost === undefined);

check('joinNames reads as a sentence', joinNames(['PayPal']) === 'PayPal'
  && joinNames(['PayPal', 'Wise']) === 'PayPal and Wise'
  && joinNames(['A', 'B', 'C']) === 'A, B, and C');

// ---- 2. Dashboard source uses the distinction ----
console.log('\ndashboard messaging');

const src = readFileSync(DASH_SRC, 'utf8');

check('page.js imports the reach classifier',
  /from\s+['"]\.\/providerreach['"]/.test(src));

// The old, unconditional coverage line is gone — it claimed no provider was
// connected whenever local coverage was empty, even with PayPal connected.
check('the old "customers there won\'t see any payment methods" line is gone',
  !src.includes("won&apos;t see any payment methods"),
  'the misleading unconditional wording still appears in app/dashboard/page.js');

// The coverage banner now names connected global providers.
check('coverage banner names connected global providers',
  /connectedGlobalNames\.length\s*>\s*0/.test(src)
  && /You have\s*\{joinNames\(connectedGlobalNames\)\}/.test(src));

// The code-samples notice branches on the precise projectStatus flags, so a
// connected-but-not-enabled project is told to ENABLE a method, not to CONNECT
// a provider, and a test-mode project is told to switch to live.
check('code-samples notice branches on projectStatus.has_connection',
  /projectStatus\s*&&\s*!projectStatus\.has_connection\s*\?\s*\(/.test(src));
check('code-samples notice also handles connected-but-no-method-enabled',
  /projectStatus\s*&&\s*!projectStatus\.has_enabled_method\s*\?\s*\(/.test(src));
check('connected-but-not-enabled notice names the connected provider(s)',
  /joinNames\(connectedProviderNames\)/.test(src));
check('connected-but-not-enabled notice tells the user to enable a method',
  /no payment method has been enabled against/.test(src));

// The locality preview note names the connected global providers too.
check('locality preview note names connected global providers',
  /previewGlobalNames\.length\s*>\s*0/.test(src)
  && /joinNames\(previewGlobalNames\)/.test(src));

// The provider card labels a connected global method as not-a-local-rail.
check('provider card labels a connected global method',
  /reach\s*===\s*GLOBAL_REACH/.test(src) && /acct-global-note/.test(src));

// A class with no CSS rule fails silently (see AGENTS.md) — the note must be
// styled, not rendered as an unstyled div.
const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
check('the global-method note class has a CSS rule',
  /\.acct-global-note\s*\{/.test(css),
  'expected a .acct-global-note { ... } rule in app/globals.css');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} FAILED`);
  process.exit(1);
}
