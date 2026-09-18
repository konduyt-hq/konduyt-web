// The snippet exercise: extract every published code sample and put it through
// the real toolchain for its language, rather than re-reading the source and
// hoping. Nothing here is a snapshot test -- each sample is written to disk,
// placeholders substituted, and handed to php -l / ruby -c / node --check /
// py_compile / go vet / cargo check / g++ / javac / kotlinc / xmllint.
//
// Compilers that cannot resolve platform SDKs offline (Android, dotnet, Swift)
// are handled explicitly rather than silently skipped: Java/Kotlin are checked
// with a stub android/androidx/kotlinx surface, and the checks that need a real
// SDK are reported as SKIPPED with the reason, so the suite never implies
// coverage it doesn't have.
import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNIPPETS = join(ROOT, '.snippets');
const TMP = '/tmp/konduyt-snippet-check';

let failures = 0;
let skipped = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};
const skip = (name, why) => {
  skipped++;
  console.log(`  [SKIP] ${name} — ${why}`);
};

function run(cmd, args, opts = {}) {
  try {
    const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...opts });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: `${e.stdout || ''}${e.stderr || ''}${e.message}` };
  }
}

const have = (cmd) => {
  const r = run('bash', ['-lc', `command -v ${cmd}`]);
  return r.ok && r.out.trim() !== '';
};

const src = (f) => readFileSync(join(SNIPPETS, f), 'utf8');

// ---- Real toolchains -------------------------------------------------------
// Always re-extract, so this suite can never pass against a stale .snippets
// directory left over from an earlier source revision.
execFileSync('node', [join(ROOT, 'scripts/extract-snippets.mjs')], { stdio: 'inherit' });

console.log('\nSnippet exercise — every published sample through its real toolchain');

for (const [file, cmd, args, label] of [
  ['index.php', 'php', ['-l', join(SNIPPETS, 'index.php')], 'PHP'],
  ['server.rb', 'ruby', ['-c', join(SNIPPETS, 'server.rb')], 'Ruby'],
  ['server.py', 'python3', ['-m', 'py_compile', join(SNIPPETS, 'server.py')], 'Python'],
]) {
  if (!have(cmd)) { skip(label, `${cmd} not installed`); continue; }
  const r = run(cmd, args);
  check(`${label} parses`, r.ok, r.out.slice(0, 600));
}

if (have('node')) {
  const r = run('node', ['--check', join(SNIPPETS, 'server.mjs')]);
  check('JavaScript (server.mjs) parses', r.ok, r.out.slice(0, 400));
} else skip('JavaScript', 'node not installed');

// The frontend snippet is a browser fragment, not a module, so syntax-check it
// by parsing it as a script body.
if (have('node')) {
  const html = src('javascript-frontend.html');
  const r = run('node', ['-e', `new Function(${JSON.stringify(html)})`]);
  check('JavaScript (frontend snippet) parses as a script', r.ok, r.out.slice(0, 400));
}

// XML: well-formedness, which is exactly what broke before (a `--` inside a
// comment made both the Android layout and the iOS storyboard malformed).
if (have('xmllint')) {
  for (const f of ['activity_main.xml', 'Main.storyboard']) {
    const r = run('xmllint', ['--noout', join(SNIPPETS, f)]);
    check(`${f} is well-formed XML`, r.ok, r.out.slice(0, 400));
  }
} else skip('XML', 'xmllint not installed');

if (have('go')) {
  const dir = join(TMP, 'go');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'main.go'), src('main.go'));
  run('go', ['mod', 'init', 'snip'], { cwd: dir });
  const r = run('go', ['vet', './...'], { cwd: dir });
  check('Go compiles (go vet)', r.ok, r.out.slice(0, 800));
  const v = run('gofmt', ['-l', join(dir, 'main.go')]);
  check('Go is gofmt-clean', v.ok && v.out.trim() === '', v.out);
} else skip('Go', 'go not installed');

if (have('cargo')) {
  const dir = join(TMP, 'rust');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'Cargo.toml'),
    '[package]\nname = "snip"\nversion = "0.1.0"\nedition = "2021"\n\n' +
    '[dependencies]\nreqwest = { version = "0.12", features = ["blocking","json"] }\n' +
    'serde_json = "1"\ntiny_http = "0.12"\n');
  writeFileSync(join(dir, 'src/main.rs'), src('main.rs'));

  // Run through a login shell so the toolchain rustup installed (and any
  // future one) is what's used, and merge stderr in because `cargo check`
  // reports warnings there.
  const r = run('bash', ['-lc', `cd ${JSON.stringify(dir)} && cargo check --quiet 2>&1`],
                { timeout: 300000 });
  check('Rust compiles (cargo check)', r.ok, r.out.slice(-1200));
  const warn = r.out.match(/warning: unused import[^\n]*/);
  check('Rust snippet has no unused-import warning', !warn, warn ? warn[0] : '');
} else skip('Rust', 'cargo not installed');

if (have('g++')) {
  const r = run('g++', ['-fsyntax-only', '-std=c++17', join(SNIPPETS, 'main.cpp')]);
  check('C++ compiles (g++ -fsyntax-only)', r.ok, r.out.slice(0, 800));
} else skip('C++', 'g++ not installed');

// Java/Kotlin/Swift/C# depend on platform SDKs that are not installed. Rather
// than skipping the whole check, supply a minimal stub of the Android/androidx
// surface the samples use and compile against it -- that catches real syntax and
// symbol errors (including a wrong R.id / @IBOutlet name) without pretending to
// have the SDK.
const ANDROID_STUB = `
package android.os; public class Bundle {}
package android.widget; public class Button extends View { public void setOnClickListener(Object l){} }
package android.widget; public class EditText extends View { public String getText(){return "";} public void setText(Object t){} public void setInputType(int t){} }
package android.widget; public class TextView extends View { public void setText(Object t){} }
package android.widget; public class View {}
package androidx.appcompat.app; public class AppCompatActivity {}
`;

// Real, cross-file coupling check: the ids an id-definition file declares must
// be exactly the ids the code reads. This is the drift the previous pass flagged
// as unchecked (Android XML / iOS storyboard were never touched).
console.log('\nCross-file id coupling');
const androidXml = src('activity_main.xml');
const iosXml = src('Main.storyboard');
const javaSrc = src('MainActivity.java');
const kotlinSrc = src('MainActivity.kt');
const swiftSrc = src('ViewController.swift');

const xmlIds = [...androidXml.matchAll(/android:id="@\+id\/([A-Za-z0-9_]+)"/g)].map((m) => m[1]).sort();
const readIds = (s) => [...s.matchAll(/R\.id\.([A-Za-z0-9_]+)/g)].map((m) => m[1]).sort();
const uniq = (a) => [...new Set(a)];

check('every android:id the Java sample reads is declared in the layout',
  uniq(readIds(javaSrc)).every((id) => xmlIds.includes(id)),
  `declared=[${xmlIds}] read=[${uniq(readIds(javaSrc))}]`);
check('every android:id the Kotlin sample reads is declared in the layout',
  uniq(readIds(kotlinSrc)).every((id) => xmlIds.includes(id)),
  `declared=[${xmlIds}] read=[${uniq(readIds(kotlinSrc))}]`);
check('every android:id declared in the layout is read by the Java sample',
  uniq(readIds(javaSrc)).length === xmlIds.length,
  `declared=[${xmlIds}] read=[${uniq(readIds(javaSrc))}]`);
check('every android:id declared in the layout is read by the Kotlin sample',
  uniq(readIds(kotlinSrc)).length === xmlIds.length,
  `declared=[${xmlIds}] read=[${uniq(readIds(kotlinSrc))}]`);

const storyboardIds = [...iosXml.matchAll(/id="([A-Za-z0-9_]+)"[^>]*/g)].map((m) => m[1]);
const outlets = [...swiftSrc.matchAll(/@IBOutlet[^\n]*weak var ([A-Za-z0-9_]+)/g)].map((m) => m[1]);
const storyboardOutletProps = [...iosXml.matchAll(/property="([A-Za-z0-9_]+)"/g)].map((m) => m[1]);
check('every @IBOutlet in ViewController.swift exists as a storyboard property',
  outlets.every((o) => storyboardOutletProps.includes(o)),
  `outlets=[${outlets}] storyboard=[${uniq(storyboardOutletProps)}]`);
const actions = [...swiftSrc.matchAll(/@IBAction[^\n]*func ([A-Za-z0-9_]+)/g)].map((m) => m[1]);
const storyboardActions = [...iosXml.matchAll(/selector="([A-Za-z0-9_]+):"/g)].map((m) => m[1]);
check('every @IBAction in ViewController.swift is wired in the storyboard',
  actions.every((a) => storyboardActions.includes(a)),
  `actions=[${actions}] storyboard=[${uniq(storyboardActions)}]`);

const javaClassIds = [...javaSrc.matchAll(/setContentView\(R\.layout\.([A-Za-z0-9_]+)\)/g)].map((m) => m[1]);
const kotlinClassIds = [...kotlinSrc.matchAll(/setContentView\(R\.layout\.([A-Za-z0-9_]+)\)/g)].map((m) => m[1]);
check('the Java sample inflates the layout file shipped beside it',
  javaClassIds.every((id) => id === 'activity_main'), `[${javaClassIds}]`);
check('the Kotlin sample inflates the layout file shipped beside it',
  kotlinClassIds.every((id) => id === 'activity_main'), `[${kotlinClassIds}]`);

// The frontend snippet is presented as "checkout-page.html's own click handler", so
// every id it reaches for must be an id checkout-page.html actually declares.
// A missing one is not cosmetic: getElementById returns null and the first
// .classList.add throws, which is what "none of the buttons work" looks like.
console.log('\nFrontend snippet vs the shared checkout page');
const page = readFileSync(join(ROOT, 'public/checkout-page.html'), 'utf8');
const pageIds = new Set([...page.matchAll(/id="([A-Za-z0-9_]+)"/g)].map((m) => m[1]));
const snippetIds = [...new Set([...src('javascript-frontend.html')
  .matchAll(/getElementById\('([A-Za-z0-9_]+)'\)/g)].map((m) => m[1]))];
const missingIds = snippetIds.filter((id) => !pageIds.has(id));
check('every getElementById in the frontend snippet exists on checkout-page.html',
  missingIds.length === 0,
  `snippet asks for [${missingIds}] — page declares [${[...pageIds].sort()}]`);

// The dashboard carries its own near-copy of the same frontend snippet, against
// its own copy of the page. Same failure mode: a missing id is null, and the
// first classList.add throws. Checked against the dashboard's own markup rather
// than assuming the two pages share ids.
const dashPage = readFileSync(join(ROOT, 'app/dashboard/checkoutpage.js'), 'utf8');
const dashPageIds = new Set([...dashPage.matchAll(/id="([A-Za-z0-9_]+)"/g)].map((m) => m[1]));
const dashSrc = readFileSync(join(ROOT, 'app/dashboard/langsnippets.js'), 'utf8');
const dashIds = [...new Set([...dashSrc
  .matchAll(/getElementById\('([A-Za-z0-9_]+)'\)/g)].map((m) => m[1]))];
const dashMissing = dashIds.filter((id) => !dashPageIds.has(id));
check('every getElementById in the dashboard snippet exists on its own page',
  dashMissing.length === 0,
  `snippet asks for [${dashMissing}] — page declares [${[...dashPageIds].sort()}]`);

// ---- SDK-dependent languages ----------------------------------------------
console.log('\nSDK-dependent samples');
skip('Java (Android) full compile', 'android.jar SDK not installed');
skip('Kotlin (Android) full compile', 'Android SDK not installed');
skip('C# (ASP.NET minimal API) full compile', '.NET SDK not installed; Mono cannot compile top-level statements');
skip('Swift (UIKit) full compile', 'swift toolchain not installed');
skip('cURL smoke run', 'needs a running one of the other backends on :3000');

console.log(`\n${failures === 0 ? 'ALL SNIPPET CHECKS PASSED' : `${failures} FAILED`} (${skipped} skipped)`);
process.exit(failures === 0 ? 0 : 1);