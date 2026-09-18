// Compares the landing page's code samples (app/DevPanel.js) with the
// dashboard's (app/dashboard/langsnippets.js).
//
// The two surfaces are meant to differ in a few known ways, so those are
// normalized away before comparing:
//   - the landing page is a self-contained runnable server with the universal
//     demo secret baked in; the dashboard reads the key from the environment
//   - the landing page calls /v1/payments/test; the dashboard calls the real
//     /v1/payments
//   - the dashboard splits each language into titled sections
// Anything left after normalizing is a divergence worth looking at: shared
// logic that drifted between the two copies.
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANDING = join(ROOT, '.snippets');
const DASH = join(ROOT, '.snippets-dashboard');

// Comments and blank lines carry prose, not behavior -- the two surfaces
// explain themselves differently on purpose. Compare only executable lines.
// Split first, normalize per line: normalizing the whole file first would
// collapse every newline into a space and reduce it to a single line.
function codeLines(s) {
  return s.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^(#|\/\/|\*|\/\*|--|<!--)/.test(l))
    .map(normalize);
}

// Collapse the differences that are intentional, so what remains is drift.
function normalize(s) {
  return s
    .replace(/kdu_test_secret_[A-Za-z0-9]+/g, 'SECRET')
    .replace(/kdu_test_pub_[A-Za-z0-9]+/g, 'PUBKEY')
    .replace(/os\.environ\[[^\]]*\]/g, 'SECRET')
    .replace(/process\.env\.[A-Z_]+/g, 'SECRET')
    .replace(/System\.getenv\([^)]*\)/g, 'SECRET')
    .replace(/ENV\[[^\]]*\]/g, 'SECRET')
    .replace(/getenv\([^)]*\)/g, 'SECRET')
    .replace(/std::env::var\([^)]*\)/g, 'SECRET')
    .replace(/Environment\.GetEnvironmentVariable\([^)]*\)/g, 'SECRET')
    .replace(/\/v1\/payments\/test/g, '/v1/payments')
    .replace(/\s+/g, ' ')
    .trim();
}

const landingFiles = readdirSync(LANDING).filter((f) => f !== 'manifest.json');
const dashFiles = readdirSync(DASH).filter((f) => f !== 'manifest.json');

// Language identity is not always the filename, so map by extension/name.
const langOf = (f) => {
  const n = f.toLowerCase();
  if (n.endsWith('.py')) return 'python';
  if (n.endsWith('.rb')) return 'ruby';
  if (n.endsWith('.php')) return 'php';
  if (n.endsWith('.go')) return 'go';
  if (n.endsWith('.rs')) return 'rust';
  if (n.endsWith('.cs')) return 'csharp';
  if (n.endsWith('.cpp')) return 'cpp';
  if (n.endsWith('.java')) return 'java';
  if (n.endsWith('.kt')) return 'kotlin';
  if (n.endsWith('.swift')) return 'swift';
  if (n.endsWith('.mjs') || n.endsWith('.sh')) return 'js';
  return 'other';
};

const landingByLang = new Map();
for (const f of landingFiles) {
  const lang = langOf(f);
  if (!landingByLang.has(lang)) landingByLang.set(lang, []);
  landingByLang.get(lang).push({ file: f, text: readFileSync(join(LANDING, f), 'utf8') });
}

const dashByLang = new Map();
for (const f of dashFiles) {
  const lang = f.split('__')[0];
  if (!dashByLang.has(lang)) dashByLang.set(lang, []);
  dashByLang.get(lang).push({ file: f, text: readFileSync(join(DASH, f), 'utf8') });
}

// For each landing page, find the dashboard section whose normalized body
// overlaps it most -- that is its counterpart.
function bestMatch(landText, candidates) {
  const a = new Set(codeLines(landText));
  let best = null;
  for (const c of candidates) {
    const b = new Set(codeLines(c.text));
    if (!b.size) continue;
    let shared = 0;
    for (const l of b) if (a.has(l)) shared++;
    const score = shared / b.size;
    if (!best || score > best.score) best = { ...c, score, shared, size: b.size };
  }
  return best;
}

console.log('Landing page vs dashboard — shared executable lines\n');
const report = [];
for (const [lang, files] of [...landingByLang].sort()) {
  const cands = dashByLang.get(lang) || [];
  for (const lf of files) {
    const m = bestMatch(lf.text, cands);
    report.push({
      lang, landing: lf.file,
      counterpart: m ? m.file : '(none)',
      score: m ? m.score : 0,
      shared: m ? m.shared : 0, total: m ? m.size : 0,
    });
    console.log(
      `${lang.padEnd(8)} ${lf.file.padEnd(28)} -> ` +
      `${(m ? m.file : '(none)').padEnd(46)} ` +
      `${m ? `${m.shared}/${m.size} = ${(m.score * 100).toFixed(0)}%` : 'no counterpart'}`);
  }
}

const weak = report.filter((r) => r.score < 0.5);
console.log(`\n${report.length} landing snippets compared; ${weak.length} with <50% shared lines.`);
