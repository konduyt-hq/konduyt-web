// Extracts the dashboard's own snippets (app/dashboard/langsnippets.js) so they
// can be compared with the landing page's tabs in app/DevPanel.js.
//
// The two files have different shapes on purpose: a landing-page tab is one
// runnable server (`code`) plus an optional browser snippet (`frontendCode`),
// while a dashboard language is a list of titled `sections` (dependency, one
// time purchase, recurring, failover, cross-border, wire-it-up). This dumps
// both to .snippets-dashboard/ keyed by language and section title.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.snippets-dashboard');
const SRC = join(ROOT, 'app/dashboard/langsnippets.js');

const SECRET = 'kdu_test_secret_4f8Kd92MnQ7pXvR3sT6wY1bC5eH0jL8n';
const API = 'https://konduyt-api.onrender.com';
const PUBLISHABLE = 'kdu_test_pub_9aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0u';

// Reads a backtick template literal starting at `start`, respecting escapes.
function readTemplateLiteral(s, start) {
  let i = s.indexOf('`', start);
  if (i === -1) return null;
  const begin = i + 1;
  i++;
  while (i < s.length) {
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === '`') break;
    i++;
  }
  return { literal: s.slice(begin, i), end: i };
}

const evaluate = (literal) => new Function('return `' + literal + '`')();

const src = readFileSync(SRC, 'utf8');
const langs = [];
const start = src.indexOf('export const LANG_SNIPPETS');
const region = src.slice(start);

// Each language block begins with `id: '<x>'` and ends where the next begins.
const idRe = /\n  \{\s*\n\s*id: '([a-z]+)'/g;
const starts = [...region.matchAll(idRe)].map((m) => ({ id: m[1], at: m.index }));
for (let n = 0; n < starts.length; n++) {
  const from = starts[n].at;
  const to = n + 1 < starts.length ? starts[n + 1].at : region.length;
  const block = region.slice(from, to);
  const sections = [];
  const secRe = /\{ title: ('([^']*)'|"([^"]*)"), code:\s*/g;
  for (const m of block.matchAll(secRe)) {
    const lit = readTemplateLiteral(block, m.index + m[0].length);
    if (!lit) continue;
    sections.push({ title: m[2] ?? m[3], code: evaluate(lit.literal) });
  }
  langs.push({ id: starts[n].id, sections });
}

const substitute = (s) => s
  .replaceAll('{{SECRET}}', SECRET)
  .replaceAll('{{API}}', API)
  .replaceAll('{{PUBLISHABLE_KEY}}', PUBLISHABLE);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const manifest = [];
for (const lang of langs) {
  lang.sections.forEach((sec, i) => {
    const slug = sec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const name = `${lang.id}__${String(i).padStart(2, '0')}__${slug}.txt`;
    writeFileSync(join(OUT, name), substitute(sec.code));
    manifest.push({ id: lang.id, title: sec.title, file: name });
  });
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`extracted ${manifest.length} dashboard snippets into ${OUT}`);
