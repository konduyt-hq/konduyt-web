// Guard the Sentinel Fee Proposals approval surface.
//
// Sentinel's whole safety story is that a discovered fee change does nothing
// until a human approves it, and that approval writes provider_fees ONLY —
// a routing-rule change is a SEPARATE consequence proposal, never a side
// effect. This test fails loudly if the UI stops showing the fields an approver
// needs, stops calling the real endpoints, or stops surfacing the consequence
// scope. It reads the source, so it cannot pass by accident.
//
// Run: node scripts/test-sentinel-proposals.mjs
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

console.log('Sentinel proposals approval surface');
console.log('-----------------------------------');

const tab = read('app/dashboard/SentinelTab.js');

// A Fee Proposals view exists and is reachable from the tab strip.
check('a Fee Proposals view is registered',
  /'proposals',\s*'Fee Proposals'/.test(tab));
check('the proposals view is rendered',
  /view === 'proposals' && <Proposals/.test(tab));

// It reads the real endpoints — never a hardcoded or faked list.
check('reads GET /proposals', /api\('\/proposals' \+ q\)/.test(tab));
check('reads the approval view',
  /api\(`\/proposals\/\$\{id\}\/approval-view`\)/.test(tab));
check('decides via POST /proposals/{id}/decide',
  /api\(`\/proposals\/\$\{id\}\/decide`/.test(tab));
check('publishes via POST /proposals/{id}/apply',
  /api\(`\/proposals\/\$\{id\}\/apply`/.test(tab));

// Every field the requirement names must be shown: provider, method, country,
// currency, old fee, proposed fee, source evidence, confidence, verification.
for (const field of ['Provider', 'Method', 'Country', 'Currency',
                     'Current fee', 'Proposed fee', 'Confidence',
                     'Verification', 'Source']) {
  check(`the approval surface shows ${field}`, tab.includes(`>${field}<`),
    `missing label: ${field}`);
}
// Evidence is rendered inline ("Evidence: {…}") in the scope panel.
check('the approval surface shows Evidence',
  /Evidence:\s*\{open\.evidence/.test(tab));

// A fee must render as a price, not a raw JSONB object.
check('fee values are rendered through the fee() formatter',
  /function fee\(v\)/.test(tab) && /fee\(p\.old_value\)/.test(tab)
  && /fee\(p\.proposed_value\)/.test(tab));

// The scope disclosure: the UI must state whether approval changes
// provider_fees alone or also stages a separate rp_pricing_rules consequence,
// and must show the server's scope_statement verbatim.
check('the approval view renders the server scope_statement',
  /open\.scope_statement/.test(tab));
check('the approval view discloses the rp_pricing_rules consequence',
  /rp_pricing_rules/.test(tab) && /open\.consequence/.test(tab));
check('the approval view states whether the execution engine changes',
  /affects_execution_engine/.test(tab));
check('the approval view renders the server caveat',
  /open\.caveat/.test(tab));

// Approve/reject are working actions, and publishing is a distinct, explicit
// step after approval — approving alone must not publish.
check('approve and reject actions exist',
  /decide\(p\.id, 'APPROVED'\)/.test(tab) && /decide\(p\.id, 'REJECTED'\)/.test(tab));
check('publishing is a separate action only offered after approval',
  /p\.status === 'APPROVED' &&[\s\S]{0,200}publish\(p\.id\)/.test(tab));

// Discovery view exposes the sweep and the unverified-lead rule.
check('a Discovery view is registered', /'discovery',\s*'Discovery'/.test(tab));
check('the discovery view labels market results UNVERIFIED',
  /UNVERIFIED/.test(tab));

console.log('-----------------------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
