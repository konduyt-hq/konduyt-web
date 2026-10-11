// Creating a project is NEVER gated on billing. Enforcement gates ACTIVATING a
// production project (app/billing_entitlement.py `can_activate_production`),
// not creating one. Regression test for the shipped bug where the dashboard
// redirected to /pricing/ on `projects.length > 3` -- a project-count rule that
// counted sandbox projects the server never bills and disagreed with the
// authoritative server-side rule. That redirect is gone for good: not
// conditional, not behind the enforcement flag.
//
// It must ALSO not create the project silently: a project that will be
// billable once billing is switched on has to be disclosed at creation time,
// and the entitlement the server actually enforces must be read from
// GET /billing/overview.
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

// 1. No project-count redirect to /pricing/ survives -- gated or not. The
//    authoritative rule is activation entitlement, never the length of the
//    project list.
check(
  'no length->/pricing/ redirect remains, gated or unconditional',
  !/(?:newP|p|project|projects|s|t)[A-Za-z]*\.length\s*>\s*3[\s\S]{0,40}?location\.href\s*=\s*['"]\/pricing\//.test(src)
    && !/location\.href\s*=\s*['"]\/pricing\//.test(
      src.slice(src.indexOf('async function createProject'), src.indexOf('async function saveRename'))),
  'a project-count redirect to /pricing/ is still present in createProject'
);

// 2. Creating a project must never early-return on a billing condition.
check(
  'createProject never bails out on a billing condition',
  !/if\s*\(\s*billingEnforced[\s\S]{0,60}?return;/.test(src),
  'createProject still returns early when billingEnforced'
);

// 3. Enforcement is read from the API, not assumed, and defaults to false.
check(
  'enforcement flag is read from GET /billing',
  src.includes('`${API_BASE}/billing`') && src.includes('enforcement_enabled'),
  'expected a fetch of `${API_BASE}/billing` reading enforcement_enabled'
);
check(
  'enforcement defaults to false (a failed read cannot gate a user)',
  src.includes('const [billingEnforced, setBillingEnforced] = useState(false)'),
  'billingEnforced should default to false'
);

// 4. Entitlement is surfaced from the authoritative server endpoint, not
//    recomputed from the project list.
check(
  'entitlement is surfaced from GET /billing/overview',
  src.includes('`${API_BASE}/billing/overview`') && src.includes('subscription_entitled'),
  'expected GET /billing/overview to supply subscription_entitled'
);

// 5. Creating a project while unenforced is disclosed, not silent. The notice
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

// 6. The served build carries the same rule -- source and artifact agree.
const outDir = join(ROOT, 'out/_next/static/chunks/app/dashboard');
if (existsSync(outDir)) {
  const { readdirSync } = await import('fs');
  const chunks = readdirSync(outDir).filter((f) => f.startsWith('page-') && f.endsWith('.js'));
  const bundled = chunks.map((f) => readFileSync(join(outDir, f), 'utf8')).join('\n');
  check(
    'built chunk carries no project-count redirect',
    !/location\.href\s*=\s*"\/pricing\/"/.test(bundled),
    'the served dashboard chunk still redirects on project count'
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
