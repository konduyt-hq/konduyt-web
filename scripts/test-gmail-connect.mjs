// Guard the Gmail connect surface and the OAuth return deep link.
//
// Priority #1 is "Connect Gmail is visible and clickable". Two regressions
// broke that: the button was hidden when the API reported oauth_configured
// false, and the OAuth callback redirected to /dashboard/growth/settings,
// which is not a route (the Growth tab renders inside /dashboard). This test
// fails loudly if either comes back.
//
// Run: node scripts/test-gmail-connect.mjs
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

console.log('Gmail connect surface');
console.log('---------------------');

const growth = read('app/dashboard/GrowthTab.js');
const page = read('app/dashboard/page.js');

// Connect Gmail is always rendered when the channel is not connected. The
// oauth_configured flag may change the tooltip, never whether the button shows.
check('Connect Gmail button is rendered',
  /Connect Gmail/.test(growth));
check('Connect Gmail is not gated behind oauth_configured',
  !/oauth_configured\s*&&[\s\S]{0,120}Connect Gmail/.test(growth));
check('the oauth_configured flag only changes the title/tooltip',
  /title=\{channelsMeta\.oauth_configured \?/.test(growth));
check('Connect Gmail is clickable (onClick wired to connectEmail)',
  /onClick=\{connectEmail\}/.test(growth));
check('connectEmail hits the real OAuth start endpoint',
  /api\('\/email\/oauth\/start'\)/.test(growth));
check('connectEmail navigates to the returned authorize URL',
  /window\.location\.href = r\.authorize_url/.test(growth));

// The OAuth return lands on a real route with the right tab/view selected.
check('GrowthTab reads the ?growth= view deep link',
  /new URLSearchParams\(window\.location\.search\)\.get\('growth'\)/.test(growth));
check('GrowthTab validates the requested view against VIEWS',
  /VIEWS\.some\(\(\[id\]\) => id === v\)/.test(growth));
check('page.js reads the ?tab= deep link',
  /new URLSearchParams\(window\.location\.search\)\.get\('tab'\)/.test(page));
check('page.js validates the requested tab',
  /includes\(t\)[\s\S]{0,20}\? t : 'quickstart'/.test(page));
check('the analytics tab is a valid deep-link target',
  /'analytics'[^\]]*\]\.includes\(t\)/.test(page));
check('the billing tab is a valid deep-link target',
  /'billing'[^\]]*\]\.includes\(t\)/.test(page));

// The old broken redirect target must not come back.
check('no redirect to the nonexistent /dashboard/growth/settings route',
  !/dashboard\/growth\/settings/.test(growth));

console.log('---------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
