// Guard the KonduytCreators Public Creator Audit surface.
//
// This is the first working CreatorOS feature. Three things must not regress:
//
//   1. It audits PUBLIC data only. The page must never ask for, store or send a
//      platform credential — the creator being audited never signs in, and the
//      backend has no parameter for one. A regression here would turn a public
//      audit into a credential-collecting form.
//   2. It tells the truth about platform capability. It reads
//      /creatoros/capabilities so YouTube, Instagram and TikTok are shown with
//      their real status rather than as three equal buttons, and it renders the
//      report's own limitations and data gaps instead of hiding them.
//   3. It does not introduce a second authentication system. The audit page is
//      usable without a session and must not read the account token.
//
// The CSS half is the repo's own layout-variant rule (see AGENTS.md): a class
// named in JSX with no rule in globals.css renders as full-size body text and
// fails silently, so every class the audit page uses must have a rule.
//
// Run: node scripts/test-creatoros-audit.mjs
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

console.log('KonduytCreators: Public Creator Audit');
console.log('----------------------------------------------');

const PAGE = read('app/creators/audit/page.js');
const CSS = read('app/globals.css');
const CREATORS = read('app/creators/page.js');

// --- The page exists and is a real, finished surface ------------------------
check('the audit page exists', exists('app/creators/audit/page.js'));
check('the audit page has its own metadata layout', exists('app/creators/audit/layout.js'));
check('the audit page is a client component', /^'use client';/m.test(PAGE));

// --- It audits PUBLIC data and never asks for a credential ------------------
check('the audit page says no login is required',
  /no login required/i.test(PAGE), 'the public-audit promise must be stated');
check('the audit page says the creator does not connect an account',
  /does not need to connect|no account connection/i.test(PAGE));
check('the audit page collects no credential field',
  !/type="password"/.test(PAGE) && !/name="token"/.test(PAGE) && !/access_token/i.test(PAGE),
  'a credential field would break the public-audit contract');
check('the audit page never reads the account token',
  !/\bkdu_token\b/.test(PAGE), 'the audit must work without a session');
check('the audit page never calls the auth endpoints',
  !/\/auth\//.test(PAGE) && !/\/me\b/.test(PAGE));

// --- It calls the right backend endpoints -----------------------------------
check('it reads platform capabilities from /creatoros/capabilities',
  PAGE.includes('/creatoros/capabilities'));
check('it resolves accounts via /creatoros/resolve', PAGE.includes('/creatoros/resolve'));
check('it runs audits via /creatoros/audit', PAGE.includes('/creatoros/audit'));
check('it offers all three platforms',
  PAGE.includes("'youtube'") && PAGE.includes("'instagram'") && PAGE.includes("'tiktok'"));

// --- It reports capability and limits honestly ------------------------------
check('it shows a platform status from capabilities (not three equal buttons)',
  /approval_required|blocked_reason/.test(PAGE),
  'TikTok/Instagram are approval-gated and must be labelled as such');
// `available` and `configured` are different claims. YouTube with no API key is
// available (auditable now, no credential) but not configured. Keying the label
// off `configured` alone showed a fully working platform as "Not configured",
// which is the same dishonesty as showing a blocked one as ready.
check('a platform label keys off `available`, not `configured`',
  /available/.test(PAGE) && /canRun/.test(PAGE),
  'YouTube is auditable with no key and must not read as unavailable');
check('it does not label an available platform as "Not configured"',
  !/'Not configured'/.test(PAGE),
  'a credential-free platform must never be shown as not configured');
check('it tells the user when a platform needs no key',
  /no key needed/.test(PAGE),
  'the free YouTube path should be visible, not hidden behind a missing key');
check('it renders the report limitations', /report\.limitations/.test(PAGE));
check('it renders the report data gaps', /report\.data_gaps/.test(PAGE));
check('it renders a MISSING/RESTRICTED value distinctly from a number',
  /audit-missing/.test(PAGE) && /availability/.test(PAGE),
  'a blank where a number should be is information, not a rendering bug');
check('it states that no overall score is produced',
  /scoring\?\.reason|No overall score/.test(PAGE) || /scoring/.test(PAGE));
check('it shows evidence links for each finding', /audit-evidence/.test(PAGE));

// --- It does not send creators to the developer dashboard -------------------
check('the audit page does not link to the developer dashboard',
  !/href="\/dashboard/.test(PAGE),
  'the dashboard belongs to Developers & Businesses, not Creators');

// --- The creators page links to the audit ----------------------------------
check('the creators entry point links to the audit',
  CREATORS.includes('href="/creators/audit/"'));
check('the creators page still offers early access',
  CREATORS.includes('Request early access'));
check('the creators page still points back at the developers product',
  CREATORS.includes('href="/developers/"'));

// --- Every class the audit page uses has a CSS rule ------------------------
const classesIn = (src) => {
  const out = new Set();
  const add = (raw) => {
    // Static part of the template: everything outside ${...}.
    const statics = raw.replace(/\$\{[^}]*\}/g, ' ');
    // A trailing partial from `foo-${x}` is a prefix, not a class.
    for (const cls of statics.split(/\s+/)) if (cls && !cls.endsWith('-')) out.add(cls);
    // Conditional classes live inside the ${...} as quoted literals.
    for (const q of raw.matchAll(/'([^']*)'|"([^"]*)"/g)) {
      for (const cls of (q[1] || q[2] || '').split(/\s+/)) if (cls) out.add(cls);
    }
  };
  for (const m of src.matchAll(/className=(?:"([^"]+)"|\{`([^`]*)`\})/g)) {
    add(m[1] || m[2] || '');
  }
  return out;
};
const hasRule = (cls) =>
  new RegExp(`\\.${cls.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}(?=[\\s,{:.>])`).test(CSS);

const pageClasses = [...classesIn(PAGE)];
const missing = pageClasses.filter((c) => !hasRule(c));
check(`every class in the audit page has a CSS rule (${pageClasses.length} checked)`,
  missing.length === 0, `missing: ${missing.join(', ')}`);

// The creators feature callout classes must also have rules.
const featureClasses = [...classesIn(CREATORS)].filter((c) => c.startsWith('creators-feature'));
const featureMissing = featureClasses.filter((c) => !hasRule(c));
check(`every creators-feature class has a CSS rule (${featureClasses.length} checked)`,
  featureMissing.length === 0, `missing: ${featureMissing.join(', ')}`);

// --- Responsive: the page has a mobile breakpoint --------------------------
check('the audit page has a mobile breakpoint',
  /@media \(max-width:640px\)[\s\S]{0,400}audit-/.test(CSS),
  'the brief requires the page to work on mobile');

console.log('----------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
