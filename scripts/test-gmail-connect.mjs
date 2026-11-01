// Guard the Gmail connect surface and the OAuth return deep link.
//
// The Gmail connection used to live in a Settings page; that page was removed,
// so the control now sits in the Growth header. Two regressions must never come
// back: the Connect button being hidden when the API reported oauth_configured
// false, and the OAuth callback redirecting to a route that does not exist (the
// Growth tab renders inside /dashboard).
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

const control = growth.match(/function GmailControl\(\{ api[\s\S]*?\n\}/);
const body = control ? control[0] : '';

// The control is rendered in the Growth header, always, when not connected.
check('the header renders the Gmail control', /<GmailControl/.test(growth));
check('Connect Gmail is rendered', /Connect Gmail/.test(body));
check('Connect Gmail is clickable (onClick wired to connect)',
  /onClick=\{connect\}/.test(body));
check('connect hits the real OAuth start endpoint',
  /api\('\/email\/oauth\/start'\)/.test(body));
check('connect navigates to the returned authorize URL',
  /window\.location\.href = r\.authorize_url/.test(body));
check('a connected account offers Reconnect without disconnecting',
  /Reconnect<\/button>/.test(body));

// The OAuth return lands on a real route with the right tab selected. The
// outcome rides on the `gmail` parameter, which the control reads.
check('GrowthTab reads the ?growth= view deep link',
  /new URLSearchParams\(window\.location\.search\)\.get\('growth'\)/.test(growth));
check('GrowthTab validates the requested view against the four tabs',
  /PRIMARY_VIEWS\.some\(\(\[id\]\) => id === v\)/.test(growth));
check('the Gmail control reads the ?gmail= outcome',
  /get\('gmail'\)/.test(body));
check('page.js reads the ?tab= deep link',
  /new URLSearchParams\(window\.location\.search\)\.get\('tab'\)/.test(page));
check('page.js validates the requested tab',
  /includes\(t\)[\s\S]{0,20}\? t : 'quickstart'/.test(page));
check('the analytics tab is a valid deep-link target',
  /'analytics'[^\]]*\]\.includes\(t\)/.test(page));

// The old broken redirect target must not come back.
check('no redirect to the nonexistent /dashboard/growth/settings route',
  !/dashboard\/growth\/settings/.test(growth) && !/dashboard\/growth\/settings/.test(page));

// Disconnect must refresh the screen even when a call fails. The old body was
// `await api('/email/disconnect'); await api('/channels/email/disconnect'); load();`
// -- one throw skipped load(), so the stale "connected" value stayed on screen
// and Disconnect looked like a no-op.
check('disconnect refreshes the screen even if a call throws',
  /async function disconnect\(\)[\s\S]*?await load\(\);/.test(body)
  && /catch \(e\) \{ err = err \|\| e; \}/.test(body));
check('disconnect no longer chains the two calls in one try',
  !/try \{ await api\('\/email\/disconnect'[\s\S]{0,60}await api\('\/channels\/email\/disconnect'/.test(body));

console.log('---------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
