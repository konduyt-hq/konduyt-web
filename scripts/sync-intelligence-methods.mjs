// Injects the shared payment-method logic into the two standalone surfaces
// that cannot import it: the copy-paste HTML SDK (app/dashboard/
// intelligencesdk.js) and the landing page's inline browser snippet
// (app/DevPanel.js). Both ship as self-contained code strings, so the
// algorithm has to be embedded -- but it must be the SAME algorithm, which
// is what this script guarantees.
//
// Run with --check to fail (exit 1) when a copy is stale, so drift is caught
// in tests rather than in production. Without it, rewrites the copies.
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { INTELLIGENCE_METHODS_SOURCE } from '../app/dashboard/intelligenceMethods.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

// Markers keep the injection idempotent and make the generated region
// obvious to anyone reading the shipped snippet.
export const BEGIN = '// >>> konduyt-intelligence-methods (generated) >>>';
export const END = '// <<< konduyt-intelligence-methods (generated) <<<';

const body = INTELLIGENCE_METHODS_SOURCE.replace(/^\n/, '').replace(/\n$/, '');
export const REGION = `${BEGIN}\n${body}\n${END}`;

export function inject(source, { indent }) {
  const pad = (text) => text.split('\n').map((l) => (l ? indent + l : l)).join('\n');
  const block = pad(REGION);
  const begin = source.indexOf(BEGIN);
  const end = source.indexOf(END);
  if (begin === -1 || end === -1) return null;
  // Expand to whole lines: the markers are indented inside their template
  // literal, and keeping the surrounding indentation would double it on the
  // next run.
  const lineStart = source.lastIndexOf('\n', begin) + 1;
  const lineEnd = source.indexOf('\n', end + END.length);
  const tail = lineEnd === -1 ? '' : source.slice(lineEnd);
  return source.slice(0, lineStart) + block + tail;
}

const TARGETS = [
  { file: 'app/dashboard/intelligencesdk.js', indent: '    ' },
  { file: 'app/DevPanel.js', indent: '  ' },
];

// The dashboard's Code Samples tab shows the checkout page's own click
// handler as its own section. It used to be a hand-copied near-duplicate of
// the SDK's script, which had already drifted into reading only
// `intelligence.options`. It is now extracted from the SDK, so the sample a
// developer reads is the code that actually runs.
const SCRIPT_BEGIN = '<script>';
const SCRIPT_END = '</script>';
const SNIPPET_BEGIN = '// >>> konduyt-checkout-handler (generated) >>>';
const SNIPPET_END = '// <<< konduyt-checkout-handler (generated) <<<';
const LANGS = 'app/dashboard/langsnippets.js';
const SNIPPET_TITLE = "{ title: \"checkout-page.html's own click handler\", code:";

function checkoutHandlerSection(sdk) {
  const s = sdk.indexOf(SCRIPT_BEGIN);
  const e = sdk.lastIndexOf(SCRIPT_END);
  if (s === -1 || e === -1) return null;
  let body = sdk.slice(s + SCRIPT_BEGIN.length, e);
  // The SDK's script indents every line to sit inside its <script> tag;
  // this sample starts at column 0.
  body = body.split('\n').map((l) => (l.startsWith('    ') ? l.slice(4) : l)).join('\n');
  body = body.replace(/^\n+/, '').replace(/\s+$/, '');
  if (body.includes('`') || body.includes('${')) return null;
  return body;
}

function injectLangsnippets(source, sdk) {
  const body = checkoutHandlerSection(sdk);
  if (body === null) return null;
  const begin = source.indexOf(SNIPPET_BEGIN);
  const end = source.indexOf(SNIPPET_END);
  if (begin === -1 || end === -1) return null;
  const lineStart = source.lastIndexOf('\n', begin) + 1;
  const lineEnd = source.indexOf('\n', end + SNIPPET_END.length);
  const tail = lineEnd === -1 ? '' : source.slice(lineEnd);
  const block = `${SNIPPET_BEGIN}\n${body}\n${SNIPPET_END}`;
  return source.slice(0, lineStart) + block + tail;
}

const problems = [];
for (const t of TARGETS) {
  const path = join(ROOT, t.file);
  const src = readFileSync(path, 'utf8');
  const out = inject(src, { indent: t.indent });
  if (out === null) {
    problems.push(`${t.file}: missing ${BEGIN} / ${END} markers`);
    continue;
  }
  if (out === src) {
    console.log(`${t.file}: up to date`);
    continue;
  }
  if (CHECK) {
    problems.push(`${t.file}: shared payment-method logic is stale -- run node scripts/sync-intelligence-methods.mjs`);
  } else {
    writeFileSync(path, out);
    console.log(`${t.file}: updated`);
  }
}

// Runs after the SDK has been written, so the sample is extracted from the
// current script rather than the previous one.
{
  const sdkSrc = readFileSync(join(ROOT, 'app/dashboard/intelligencesdk.js'), 'utf8');
  const langsPath = join(ROOT, LANGS);
  const langsSrc = readFileSync(langsPath, 'utf8');
  if (!langsSrc.includes(SNIPPET_TITLE)) {
    problems.push(`${LANGS}: expected section ${SNIPPET_TITLE}`);
  } else {
    const out = injectLangsnippets(langsSrc, sdkSrc);
    if (out === null) {
      problems.push(`${LANGS}: could not extract the checkout handler from the SDK`);
    } else if (out === langsSrc) {
      console.log(`${LANGS}: up to date`);
    } else if (CHECK) {
      problems.push(`${LANGS}: checkout-handler sample is stale -- run node scripts/sync-intelligence-methods.mjs`);
    } else {
      writeFileSync(langsPath, out);
      console.log(`${LANGS}: updated`);
    }
  }
}

if (problems.length) {
  for (const p of problems) console.error(`ERROR ${p}`);
  process.exit(1);
}
console.log(CHECK ? 'intelligence-methods sync: OK' : 'intelligence-methods sync: done');
