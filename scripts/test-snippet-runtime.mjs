// The runtime half of the snippet exercise: syntax checks prove a snippet
// compiles, which is not the same as proving the server it defines actually
// serves the checkout page and rejects a bad amount. Each backend snippet is
// started for real, on the port it documents, and driven over HTTP.
//
// The Konduyt API is deliberately NOT called: the samples point at their own
// merchant test key, which does not exist here, and reaching the deployed API
// would make this suite depend on the network. What is exercised is the part
// each snippet actually owns -- routing, CORS, the checkout page, and local
// input validation -- which is where the past bugs lived.
import { spawn, execFileSync } from 'child_process';
import { mkdirSync, rmSync, copyFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNIPPETS = join(ROOT, '.snippets');
const WORK = '/tmp/konduyt-snippet-run';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

execFileSync('node', [join(ROOT, 'scripts/extract-snippets.mjs')], { stdio: 'ignore' });
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
// Each sample finds checkout-page.html either next to itself (PHP, Ruby, the
// JS snippet) or in the working directory (Python, Go). Copying every sample
// and the page into one flat directory satisfies both, without writing into
// .snippets and dirtying the tree the extractor owns.
for (const f of readdirSync(SNIPPETS)) copyFileSync(join(SNIPPETS, f), join(WORK, f));
copyFileSync(join(ROOT, 'public/checkout-page.html'), join(WORK, 'checkout-page.html'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (r.status < 500) return true;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  return false;
}

// A server left over from an earlier run keeps the port, and then every later
// backend "starts" fine while a completely different process answers the
// requests -- which reads as four languages mysteriously failing the same
// assertions. Refuse to test against a port somebody else already owns.
async function portIsFree(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) });
    return false;
  } catch {
    return true;
  }
}

// Each entry is a real command line from the snippet's own header comment.
// `probe` verifies the snippet's declared packages are importable, the same way
// `have` verifies its interpreter exists. A sample whose dependency is missing
// is SKIPPED, not FAILED -- "flask is not installed here" is a fact about this
// machine, not a defect in the snippet, and reporting it as a failure made a
// missing package read as broken sample code.
const BACKENDS = [
  { lang: 'Python', cmd: 'python3', args: [join(WORK, 'server.py')], url: 'http://127.0.0.1:3000',
    probe: ['python3', ['-c', 'import flask, requests']], needs: 'flask requests' },
  { lang: 'JavaScript', cmd: 'node', args: [join(WORK, 'server.mjs')], url: 'http://127.0.0.1:3000' },
  { lang: 'PHP', cmd: 'php', args: ['-S', '127.0.0.1:3000', join(WORK, 'index.php')], url: 'http://127.0.0.1:3000' },
  { lang: 'Ruby', cmd: 'ruby', args: [join(WORK, 'server.rb')], url: 'http://127.0.0.1:3000',
    probe: ['ruby', ['-e', 'require "sinatra"']], needs: 'sinatra' },
  { lang: 'Go', cmd: 'go', args: ['run', join(WORK, 'main.go')], url: 'http://127.0.0.1:3000' },
];

const have = (cmd) => {
  try { execFileSync('bash', ['-lc', `command -v ${cmd}`], { stdio: 'pipe' }); return true; }
  catch { return false; }
};

const hasDeps = (probe) => {
  if (!probe) return true;
  try { execFileSync(probe[0], probe[1], { stdio: 'pipe' }); return true; }
  catch { return false; }
};

for (const b of BACKENDS) {
  console.log(`\n${b.lang} backend — real HTTP against the snippet's own server`);
  if (!have(b.cmd)) { console.log(`  [SKIP] ${b.cmd} not installed`); continue; }
  if (!hasDeps(b.probe)) { console.log(`  [SKIP] ${b.cmd} installed but ${b.needs} missing`); continue; }

  if (!(await portIsFree(b.url))) {
    check(`${b.lang} server starts and answers`, false,
      `port 3000 is already held by another process — refusing to test against it`);
    continue;
  }

  // `detached` puts the server in its own process group. A snippet that spawns
  // children (or a `go run`, which builds then execs) does not necessarily die
  // with a plain kill, and a survivor poisons every backend tested after it.
  const proc = spawn(b.cmd, b.args, { cwd: WORK, stdio: 'pipe', detached: true });
  const kill = () => { try { process.kill(-proc.pid, 'SIGKILL'); } catch { /* already gone */ } };
  let log = '';
  proc.stdout.on('data', (d) => { log += d; });
  proc.stderr.on('data', (d) => { log += d; });

  const up = await waitForServer(b.url);
  check(`${b.lang} server starts and answers`, up, log.slice(-600));
  if (!up) { kill(); continue; }

  // The page every tab claims to serve: it must be the shared checkout page,
  // not just any 200. The id is the one the page's own script depends on.
  const get = await fetch(b.url);
  const body = await get.text();
  check('serves the shared checkout page at /', get.status === 200 && body.includes('id="payButton"'),
    `status=${get.status} bytes=${body.length}`);

  // The amount is shopper-controlled, so a non-integer must never come back as
  // a created payment. Python and C# validate it locally and answer 400; the
  // others forward it and surface the upstream validation error verbatim.
  // Both are correct -- what must never happen is a 2xx that looks like a
  // successful charge.
  const bad = await fetch(`${b.url}/api/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: "abc", email: "x@example.com" }),
  });
  const badBody = await bad.text();
  const rejected = bad.status >= 400
    || /invalid_amount|invalid_json|int_parsing|unable to parse/.test(badBody);
  check('never reports success for a non-integer amount', rejected,
    `status=${bad.status} body=${badBody.slice(0, 200)}`);

  // The browser calls this from a different origin, so the CORS headers are
  // load-bearing: without them the checkout page cannot reach the backend at
  // all, which reads as "the server isn't running".
  const pre = await fetch(`${b.url}/api/create-payment`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://konduyt.dev', 'Access-Control-Request-Method': 'POST' },
  });
  const acao = pre.headers.get('access-control-allow-origin');
  check('answers CORS preflight for the browser', pre.status === 204 && acao === '*',
    `status=${pre.status} allow-origin=${acao}`);

  kill();
  await sleep(500);
}

console.log('\nNot started here: C# (no .NET SDK), Rust (tiny_http build is slow), '
  + 'Java/Kotlin (Android), Swift (iOS).');

console.log(`\n${failures === 0 ? 'ALL RUNTIME CHECKS PASSED' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);