// While billing enforcement is OFF (app/billing.py ENFORCEMENT_ENABLED = False,
// surfaced by GET /billing as enforcement_enabled), creating a project must
// never redirect the developer to /pricing/ and must never be blocked by the
// free-allowance limit. Regression test for the shipped bug where the
// dashboard hardcoded `projects.length > 3 -> /pricing/`, so a 4th project
// bounced to a page that then reported "Billing isn't set up yet."
//
// Checked at the source level (the exact expressions) and in the built chunk
// (what actually gets served), so a passing source grep cannot mask a stale
// build.
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DASH_SRC = join(ROOT, 'app/dashboard/page.js');

let failures = 0;
let checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

const src = readFileSync(DASH_SRC, 'utf8');

// 1. The redirect is conditioned on the server-reported enforcement flag.
check(
  'project-create redirect is gated on the enforcement flag',
  /if\s*\(\s*billingEnforced\s*&&\s*newProjects\.length\s*>\s*3\s*\)/.test(src),
  'expected `if (billingEnforced && newProjects.length > 3)` in app/dashboard/page.js'
);

// 2. No bare, unconditional `length > 3` redirect survives anywhere.
check(
  'no unconditional length->/pricing/ redirect remains',
  !/if\s*\(\s*(?:newP|p|project|projects|s|t)[A-Za-z]*\.length\s*>\s*3\s*\)\s*\{?\s*(?:window\.)?location\.href\s*=\s*['"]\/pricing\//.test(src),
  'an ungated `length > 3` redirect to /pricing/ is still present'
);

// 3. Enforcement is read from the API, not assumed, and defaults to false.
check(
  'enforcement flag is read from GET /billing',
  src.includes('`${API_BASE}/billing`') && src.includes('enforcement_enabled'),
  'expected a fetch of `${API_BASE}/billing` reading enforcement_enabled'
);
check(
  'enforcement defaults to false (a failed read cannot gate a user)',
  /useState\(\s*false\s*\)/.test(src.slice(src.indexOf('billingEnforced'))) || src.includes('const [billingEnforced, setBillingEnforced] = useState(false)'),
  'billingEnforced should default to false'
);

// 4. The served build carries the same gate -- source and artifact agree.
const outDir = join(ROOT, 'out/_next/static/chunks/app/dashboard');
if (existsSync(outDir)) {
  const { readdirSync } = await import('fs');
  const chunks = readdirSync(outDir).filter((f) => f.startsWith('page-') && f.endsWith('.js'));
  const bundled = chunks.map((f) => readFileSync(join(outDir, f), 'utf8')).join('\n');
  check(
    'built chunk gates the redirect on the enforcement flag',
    /if\s*\([A-Za-z_$]+&&[A-Za-z_$]+\.length>3\)\s*\{\s*(?:window\.)?location\.href\s*=\s*"\/pricing\/"/.test(bundled),
    'the served dashboard chunk still redirects on project count alone'
  );
} else {
  console.log('  [SKIP] built-chunk check — run `npx next build` first');
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
