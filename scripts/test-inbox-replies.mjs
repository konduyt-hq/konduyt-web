// Guard the inbound-reply surface.
//
// The whole point of the Gmail inbound work is that a reply is SEEN. Two things
// make that visible to an operator and must not silently disappear: the Growth
// surfaces that report whether the inbox is readable, and the manual "poll now"
// action. Both live on the Conversations tab (the Diagnostics surface that used
// to hold them was removed), and Analytics reports the same truth. This test
// fails if any of that is removed.
//
// Run: node scripts/test-inbox-replies.mjs
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

console.log('Inbound replies surface');
console.log('------------------------');

const growth = read('app/dashboard/GrowthTab.js');
const analytics = read('app/dashboard/AnalyticsTab.js');

const conversations = growth.match(/function Conversations\(\{ api[\s\S]*?\n\}/);
const convBody = conversations ? conversations[0] : '';

// Conversations reports read permission honestly rather than assuming, and
// names the missing scope when read is not granted.
check('Conversations surfaces inbox readability',
  /inbox\.can_read/.test(convBody));
check('Conversations names the missing read scope when read is not granted',
  /missing_scopes/.test(convBody));

// The manual poll is a real backend action, not a fake heartbeat: it POSTs to
// the poll endpoint and re-reads status.
check('poll now POSTs to the inbox poll endpoint',
  /api\('\/inbox\/poll', \{ method: 'POST' \}\)/.test(convBody));
check('poll now re-reads after polling',
  /await load\(\);/.test(convBody));

// The Gmail control shows read access as a separate grant from sending.
check('the Gmail control surfaces the inbox read capability',
  /inbox_read/.test(growth));
check('the Gmail control separates read access from sending',
  /replies readable/.test(growth) && /sending/.test(growth));

// Analytics reports the same truth in the Outreach ops area.
check('analytics renders an inbound replies section',
  /Inbound replies/.test(analytics));
check('analytics reads outreach.inbox',
  /outreach\.inbox/.test(analytics));
check('analytics reports read permission',
  /ib\.can_read/.test(analytics));

console.log('------------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
