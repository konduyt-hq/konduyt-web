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
// ...and shows the results, so a lead is visible as a lead (not a proposal).
check('the discovery view renders recent results',
  /Recent results/.test(tab) && /UNVERIFIED lead/.test(tab));

// --- States: a failed request must never read as "nothing pending". ---
check('the proposals load error is shown, not swallowed',
  /Could not load proposals/.test(tab));
check('a failed load is explicitly distinguished from "no proposals"',
  /it does not mean there are\s*\n?\s*no pending proposals/.test(tab.replace(/\s+/g, ' ')));
check('a stale (last-good) list is labelled as possibly out of date',
  /may be out of date/.test(tab) && /latest refresh failed/.test(tab));
check('a loading state is shown before data arrives',
  /Loading proposals…/.test(tab));
check('the discovery view also separates error from empty',
  /Could not load discovery state/.test(tab));

// --- Publish is gated on approval and cannot double-apply. ---
check('publish is only offered for an APPROVED proposal',
  /p\.status === 'APPROVED' &&[\s\S]{0,220}Publish to catalogue/.test(tab));
check('a duplicate submit is blocked by an in-flight guard',
  /if \(inflight\.current\) return;/.test(tab));
check('a re-apply is reported honestly as already published',
  /already_applied/.test(tab) && /no change made/.test(tab));

// --- Failures show the server's real outcome. ---
check('approve/reject/publish failures surface the server message',
  /Could not publish/.test(tab) && /Could not \$\{decision === 'APPROVED'/.test(tab));
check('the API error extractor unwraps an object detail (no [object Object])',
  /function apiErrorMessage\(/.test(tab) && /typeof d === 'object'/.test(tab));

// --- The four states are distinguished. ---
for (const label of ['PENDING', 'APPROVED', 'APPLIED', 'REJECTED']) {
  check(`the legend names the ${label} state`, tab.includes(`>${label}</span>`));
}
check('APPLIED has its own pill, distinct from APPROVED',
  /sentinel-pill-applied/.test(tab) && /propStatusClass\('APPLIED'\)/.test(tab));

// --- No implication that a fee update also changes customer_fees/rules. ---
check('the surface states customer_fees is never changed',
  /never changes <code>customer_fees<\/code>/.test(tab));
check('the surface states rp_pricing_rules is never changed',
  /never changes <code>rp_pricing_rules<\/code>/.test(tab));

console.log('-----------------------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
