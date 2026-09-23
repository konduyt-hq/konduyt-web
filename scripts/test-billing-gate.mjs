// While billing enforcement is OFF (app/billing.py ENFORCEMENT_ENABLED = False,
// surfaced by GET /billing as enforcement_enabled), creating a project must
// never redirect the developer to /pricing/ and must never be blocked by the
// free-allowance limit. Regression test for the shipped bug where the
// dashboard hardcoded `projects.length > 3 -> /pricing/`, so a 4th project
// bounced to a page that then reported "Billing isn't set up yet."
//
// It must ALSO not create the project silently: a project that will be
// billable once billing is switched on has to be disclosed at creation time.
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

// 4. Creating a project while unenforced is disclosed, not silent. The notice
//    must be produced on the not-enforced path and must say nothing is charged
//    today while stating the future charge.
check(
  'a creation notice is emitted while billing is unenforced',
  /if\s*\(\s*!enforcedNow\s*\)\s*\{\s*setProjectCreateNotice\(/.test(src),
  'expected a `!enforcedNow` branch that calls setProjectCreateNotice'
);
check(
  'creation notice states nothing is charged today',
  /Nothing is charged today/.test(src),
  'the notice must say nothing is charged today'
);
check(
  'creation notice states the future per-project charge',
  /is \$\$\{price\}\/mo once billing is switched on/.test(src) || src.includes('/mo once billing is switched on'),
  'the notice must disclose the per-project charge that applies later'
);
check(
  'creation notice is driven by the server live count, not the project list',
  src.includes('active_production_projects') && /liveNow\s*>=?\s*allowance/.test(src),
  'the notice must compare the server live count to the allowance, not projects.length'
);
check(
  'a creation notice is actually rendered',
  /projectCreateNotice\s*&&/.test(src) && src.includes('con-proj-create-notice'),
  'setProjectCreateNotice without rendering it would still be silent'
);

// 5. The served build carries the same gate -- source and artifact agree.
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
  check(
    'built chunk contains the forward-looking creation notice',
    bundled.includes('Nothing is charged today') && bundled.includes('once billing is switched on'),
    'the served dashboard chunk does not disclose the future charge'
  );
} else {
  console.log('  [SKIP] built-chunk check — run `npx next build` first');
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
