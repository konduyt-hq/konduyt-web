// Guard the inbound-reply surface.
//
// The whole point of the Gmail inbound work is that a reply is SEEN. Two things
// make that visible to an operator and must not silently disappear: the
// diagnostics/analytics surfaces that report whether the inbox is readable, and
// the manual "poll now" action. This test fails if those are removed.
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

// The diagnostics view renders an inbound section wired to the API's inbox
// status, and it reports read permission honestly rather than assuming.
check('the inbound section is rendered in diagnostics',
  /<InboundReplies\b/.test(growth));
check('it is fed the inbox status from diagnostics',
  /inbox=\{data\.inbox\}/.test(growth));
check('it reports whether the inbox is readable',
  /conn\.can_read/.test(growth));
check('it names the missing read scope when read is not granted',
  /missing_scopes/.test(growth));

// The manual poll is a real backend action, not a fake heartbeat: it POSTs to
// the poll endpoint and re-reads status.
check('poll now POSTs to the inbox poll endpoint',
  /api\('\/inbox\/poll', \{ method: 'POST' \}\)/.test(growth));
check('poll now re-reads status afterwards',
  /setLocal\(await api\('\/inbox\/status'\)\)/.test(growth));

// The email settings show read access as a separate grant from sending.
check('settings surface the inbox read capability',
  /emailStatus\.inbox_read/.test(growth));
check('settings expose a reply-to field',
  /save\('email', \{ \.\.\.email, reply_to: e\.target\.value \}\)/.test(growth));

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
