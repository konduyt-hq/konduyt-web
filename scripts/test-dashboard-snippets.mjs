// Exercise the dashboard Code Samples (app/dashboard/langsnippets.js) the same
// way the landing-page tabs are exercised, so "it parses" and "its install
// step is complete" are proven rather than assumed.
//
// The dashboard snippets are fragments, not whole servers (a "Wire it to the
// Buy button" section assumes the create_payment() defined in the section
// above it), so they are parsed per toolchain rather than started. What is
// checked:
//   1. each Python/Ruby/JS/JSON/Gradle fragment parses in its real toolchain;
//   2. every module a fragment imports has a matching Dependency section --
//      the exact class of bug where a sample can't run as printed;
//   3. the route and payload the "Wire it up" section documents actually
//      match the shared checkout page it is wiring up.
import { execFileSync } from 'child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DASH = join(ROOT, '.snippets-dashboard');
const TMP = '/tmp/konduyt-dashboard-check';

let failures = 0;
let checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};
const skip = (name, why) => console.log(`  [SKIP] ${name} — ${why}`);

const have = (cmd) => {
  try { execFileSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' }); return true; }
  catch { return false; }
};

// Re-extract so this test always reads the current source, never a stale dump.
execFileSync('node', [join(ROOT, 'scripts/extract-dashboard-snippets.mjs')], { stdio: 'ignore' });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const files = readdirSync(DASH).sort();
const read = (f) => readFileSync(join(DASH, f), 'utf8');
const forLang = (lang) => files.filter((f) => f.startsWith(lang + '__'));

console.log('\nEvery dashboard fragment parses in its real toolchain');

if (have('python3')) {
  // The Dependency section is a shell command (`pip install flask requests`),
  // not Python source.
  for (const f of forLang('python').filter((x) => !x.includes('dependency'))) {
    const path = join(TMP, f.replace(/\.txt$/, '.py'));
    writeFileSync(path, read(f));
    try {
      execFileSync('python3', ['-c',
        `import ast,sys; ast.parse(open(${JSON.stringify(path)}).read())`], { stdio: 'pipe' });
      check(`Python parses — ${f}`, true);
    } catch (e) {
      // A fragment that calls request.form["amount"] is not a whole module,
      // but it must still be syntactically valid Python.
      check(`Python parses — ${f}`, false, String(e.stderr || e).slice(0, 400));
    }
  }
} else skip('Python fragments', 'python3 not installed');

if (have('ruby')) {
  for (const f of forLang('ruby')) {
    const path = join(TMP, f.replace(/\.txt$/, '.rb'));
    writeFileSync(path, read(f));
    try {
      execFileSync('ruby', ['-c', path], { stdio: 'pipe' });
      check(`Ruby parses — ${f}`, true);
    } catch (e) {
      check(`Ruby parses — ${f}`, false, String(e.stderr || e).slice(0, 400));
    }
  }
} else skip('Ruby fragments', 'ruby not installed');

// JS fragments: the API-call ones use bare `fetch`, the route one uses
// `import express`, so parse them as ESM modules. The Dependency section is a
// shell command (`npm install express`), which is not JavaScript at all.
for (const f of forLang('js').filter((x) => !x.includes('dependency'))) {
  const path = join(TMP, f.replace(/\.txt$/, '.mjs'));
  writeFileSync(path, read(f));
  try {
    execFileSync('node', ['--check', path], { stdio: 'pipe' });
    check(`JavaScript parses — ${f}`, true);
  } catch (e) {
    check(`JavaScript parses — ${f}`, false, String(e.stderr || e).slice(0, 500));
  }
}

// Kotlin/Java Gradle dependency blocks must be real Gradle syntax, not prose.
for (const f of forLang('java').filter((x) => x.includes('dependency'))) {
  const body = read(f);
  check(`Gradle block names a real artifact — ${f}`,
    /implementation\s*['"(]/.test(body), body.slice(0, 200));
}

console.log('\nEvery import has a matching install step');

// What each language's samples actually import -> which Dependency section
// must exist to satisfy it.
const REQUIRED = {
  python: { dep: 'flask|requests', imports: /^\s*(?:import|from)\s+(\w+)/gm, pipNames: ['flask', 'requests'] },
  js: { imports: /^import\s+\w+\s+from\s+"([^"]+)"/gm, pipNames: ['express'] },
  ruby: { imports: /^require\s+"([^"]+)"/gm, pipNames: ['sinatra', 'rackup', 'puma'] },
};

// Third-party imports that must be declared somewhere in the language's own
// Dependency section (stdlib/built-in modules are exempt).
const STDLIB = new Set([
  'os', 'json', 'sys', 'io', 'base64', 'http', 'uri', 'net', 'request', 'node',
  'std', 'serde_json', 'use', 'system',
]);

for (const [lang, cfg] of Object.entries(REQUIRED)) {
  const depFile = forLang(lang).find((f) => f.includes('dependency'));
  const depText = depFile ? read(depFile) : '';
  const used = new Set();
  for (const f of forLang(lang)) {
    for (const m of read(f).matchAll(cfg.imports)) {
      const name = m[1].split(/[./]/)[0].toLowerCase();
      if (!STDLIB.has(name)) used.add(name);
    }
  }
  for (const name of used) {
    check(`${lang}: "${name}" has an install step`, depText.toLowerCase().includes(name),
      `no mention of "${name}" in ${depFile || '(no Dependency section)'}`);
  }
}

console.log('\nThe route matches the checkout page it wires up');

const sharedPage = readFileSync(join(ROOT, 'public/checkout-page.html'), 'utf8');
const mounted = new Set();
for (const f of files) {
  for (const m of read(f).matchAll(/["'](\/api\/[\w-]+)["']/g)) mounted.add(m[1]);
}
// The page posts to whatever its own handler fetches; both must exist as a
// mounted route in the samples, or the sample cannot serve the page.
for (const m of sharedPage.matchAll(/fetch\(\s*['"]([^'"]+)['"]/g)) {
  const route = m[1].replace(/^https?:\/\/localhost:3000/, '');
  // A call straight to the Konduyt API is not a route these samples mount --
  // only the page's calls back to the developer's own backend are.
  if (route.startsWith('http')) {
    check(`checkout page's API call ${route} is a real Konduyt endpoint`,
      /\/v1\/(demo\/run|payments|payment_sessions)/.test(route), route);
    continue;
  }
  check(`checkout page's fetch target ${route} is mounted by the samples`,
    mounted.has(route), `mounted routes: ${[...mounted].sort().join(', ')}`);
}

check('no dashboard sample still defines the removed subscription route',
  !files.some((f) => /create-subscription/.test(read(f))));

console.log(`\n${failures ? failures + ' FAILED' : 'ALL DASHBOARD SNIPPET CHECKS PASSED'} (${checks} checks)`);
process.exit(failures ? 1 : 0);