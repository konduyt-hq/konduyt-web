// Guard the LaunchBuck recognition badge in the public site footer.
//
// The badge is LaunchBuck's supplied embed, not a home-made recreation: the
// exact image URL, link target, `rel`, `alt`, width and height must survive.
// This is a source-level check because the landing page is a server component;
// the value is that a later edit cannot quietly drop the badge, retarget it, or
// swap the artwork for a look-alike.
//
// Run: node scripts/test-footer-badge.mjs
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOME = readFileSync(join(ROOT, 'app/page.js'), 'utf8');
const CSS = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');

let failures = 0;
let checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

// Isolate the footer so a badge added elsewhere on the page cannot satisfy the
// check, and a footer edit that removes it cannot hide behind one.
const footerMatch = HOME.match(/<footer className="site-footer">[\s\S]*?<\/footer>/);
const footer = footerMatch ? footerMatch[0] : '';
check('the landing page has the site footer', footer.length > 0);

check('the footer links to the LaunchBuck profile exactly',
  footer.includes('href="https://launchbuck.com/p/konduyt"'),
  'expected href="https://launchbuck.com/p/konduyt"');
check('the footer uses LaunchBuck\'s supplied badge image exactly',
  footer.includes('src="https://launchbuck.com/badges/card-light.png"'),
  'expected src="https://launchbuck.com/badges/card-light.png"');
check('the badge keeps the supplied alt text',
  footer.includes('alt="Konduyt — Featured on LaunchBuck"'));
check('the badge keeps width 190 and height 58',
  /width="190"/.test(footer) && /height="58"/.test(footer));
check('the badge opens in a new tab safely',
  /target="_blank"/.test(footer) && /rel="noopener noreferrer"/.test(footer));
check('the badge is wrapped in a link, so it stays clickable',
  /<a href="https:\/\/launchbuck\.com\/p\/konduyt"[^>]*>\s*<img[^>]*card-light\.png/.test(footer),
  'image is not inside the profile link');
check('the badge is grouped by a dedicated footer-badge class',
  /className="footer-badge"/.test(footer));
check('the footer-badge class is styled',
  /\.footer-badge\{[^}]*\}/.test(CSS), 'no .footer-badge rule in globals.css');
check('the badge image does not stretch the column',
  /\.footer-badge img\{[^}]*display:block[^}]*\}/.test(CSS),
  'expected .footer-badge img { display:block }');

console.log('----------------------------------------------------------------');
console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
