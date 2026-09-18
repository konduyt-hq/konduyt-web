// Extract every real code snippet from app/DevPanel.js (and the frontend/XML
// files from app/dashboard/frontendfiles.js) into files on disk, with the
// {{SECRET}}/{{API}}/{{PUBLISHABLE_KEY}} placeholders substituted, so each one
// can be compiled or parsed by its real toolchain.
//
// The literals are template literals with escapes, so they are evaluated with
// `new Function('return ' + literal)` rather than regex-unescaped by hand --
// that is what the user actually sees on the page.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.snippets');

const API = 'https://konduyt-api.onrender.com';
const SECRET = 'kdu_test_secret_4f8Kd92MnQ7pXvR3sT6wY1bC5eH0jL8n';
const PUBLISHABLE = 'kdu_test_pub_9aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0u';

// Scan from `start`, return the raw literal text starting at the first backtick
// and ending at its unescaped closing backtick (escapes preserved verbatim).
function readTemplateLiteral(src, start) {
  const open = src.indexOf('`', start);
  if (open === -1) return null;
  let i = open + 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') return { literal: src.slice(open, i + 1), end: i + 1 };
    i += 1;
  }
  return null;
}

function evaluate(literal) {
  return new Function('return ' + literal)();
}

// Every `code: ` literal that follows each `id: '<lang>'` inside LANGUAGES.
function extractTabs(src) {
  const langsStart = src.indexOf('const LANGUAGES = [');
  const langsEnd = src.indexOf('\nexport default function DevPanel', langsStart);
  const region = src.slice(langsStart, langsEnd);
  const tabs = [];
  const idRe = /id: '([a-z]+)'/g;
  let m;
  while ((m = idRe.exec(region))) {
    const id = m[1];
    const blockStart = m.index;
    const next = region.slice(blockStart + 10).search(/id: '[a-z]+'/);
    const blockEnd = next === -1 ? region.length : blockStart + 10 + next;
    const block = region.slice(blockStart, blockEnd);
    const tab = { id };
    for (const field of ['code', 'frontendCode', 'deps']) {
      const fi = block.indexOf(`${field}: `);
      if (fi === -1) continue;
      const lit = readTemplateLiteral(block, fi);
      if (!lit) continue;
      tab[field] = field === 'deps' ? evaluate(lit.literal) : evaluate(lit.literal);
    }
    const fn = block.match(/filename: '([^']+)'/);
    if (fn) tab.filename = fn[1];
    tabs.push(tab);
  }
  return tabs;
}

const substitute = (s) => s
  .replaceAll('{{SECRET}}', SECRET)
  .replaceAll('{{API}}', API)
  .replaceAll('{{PUBLISHABLE_KEY}}', PUBLISHABLE);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const devpanel = readFileSync(join(ROOT, 'app/DevPanel.js'), 'utf8');
const tabs = extractTabs(devpanel);

const manifest = [];
for (const tab of tabs) {
  for (const field of ['code', 'frontendCode']) {
    if (!tab[field]) continue;
    const name = field === 'code' ? tab.filename : `${tab.id}-frontend.${ext(tab)}`;
    const path = join(OUT, name);
    writeFileSync(path, substitute(tab[field]));
    manifest.push({ id: tab.id, field, file: name });
  }
}

function ext(tab) {
  if (tab.id === 'java') return 'java';
  if (tab.id === 'kotlin') return 'kt';
  if (tab.id === 'swift') return 'swift';
  return 'html';
}

// The Android/iOS UI-definition files are separate exports, and the coupling
// between their ids and the Java/Kotlin/Swift tabs is the thing worth checking.
const frontendfiles = readFileSync(join(ROOT, 'app/dashboard/frontendfiles.js'), 'utf8');
for (const [constName, file] of [
  ['ANDROID_LAYOUT_XML', 'activity_main.xml'],
  ['IOS_STORYBOARD_XML', 'Main.storyboard'],
]) {
  const i = frontendfiles.indexOf(`export const ${constName}`);
  const lit = readTemplateLiteral(frontendfiles, i);
  writeFileSync(join(OUT, file), substitute(evaluate(lit.literal)));
  manifest.push({ id: constName, field: 'xml', file });
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`extracted ${manifest.length} snippets into ${OUT}`);
for (const m of manifest) console.log(`  ${m.id.padEnd(12)} ${m.file}`);