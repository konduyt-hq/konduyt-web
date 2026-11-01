// Guard the Growth "sending enabled" control.
//
// The checkbox could be ticked but not un-ticked. Two causes:
//   1. it saved the WHOLE email object with PUT /settings/email, which REPLACES
//      the stored config -- a copy missing a one-time activation marker re-armed
//      the auto-enable on the next worker tick;
//   2. it never reloaded state, so the controlled checkbox showed a stale value.
// The control now goes through the dedicated POST /growth/email/sending and
// reloads. It lives in the Growth header (the Settings page was removed). This
// test fails if either regression comes back.
//
// Run: node scripts/test-sending-toggle.mjs
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

console.log('Sending enabled control');
console.log('-----------------------');

const growth = read('app/dashboard/GrowthTab.js');

const control = growth.match(/function GmailControl\(\{ api[\s\S]*?\n\}/);
const body = control ? control[0] : '';

// The checkbox drives the dedicated endpoint, not a whole-object PUT.
check('the checkbox calls setSending',
  /checked=\{!!email\.sending_enabled\}[\s\S]{0,120}onChange=\{\(e\) => setSending\(e\.target\.checked\)\}/.test(body));
check('setSending posts to /email/sending',
  /api\('\/email\/sending',\s*\{\s*method:\s*'POST'/.test(body));
check('setSending sends the enabled flag',
  /body:\s*JSON\.stringify\(\{\s*enabled\s*\}\)/.test(body));
check('setSending reloads state so the box is not stale',
  /async function setSending[\s\S]{0,400}await load\(\)/.test(body));
check('the checkbox is disabled while the change is in flight',
  /disabled=\{busy === 'sending'\}/.test(body));
check('a failed toggle surfaces an error',
  /async function setSending[\s\S]{0,500}onError && onError\(e\.message\)/.test(body));

// The old broken pattern must not come back.
check('the checkbox no longer PUTs the whole email object',
  !/sending_enabled:\s*e\.target\.checked\s*\}\)/.test(growth));

console.log('');
console.log(`  ${checks - failures}/${checks} passed`);
if (failures) {
  console.log(`\n  ${failures} sending-control regression(s) -- the checkbox is broken again.`);
}
process.exit(failures === 0 ? 0 : 1);
