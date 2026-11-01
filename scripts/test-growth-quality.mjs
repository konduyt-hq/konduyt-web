// Guard the "quality first, then controlled outreach" Growth surface.
//
// The backend owns qualification, scoring, the cohort, strategy health and the
// funnel report; the Growth UI is the four tabs and never re-implements a rule.
// This test fails loudly if the surface regresses: if it re-adds a manual run,
// carries its own keyword list, or stops surfacing the review gate.
//
// Run: node scripts/test-growth-quality.mjs
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

console.log('Growth quality + controlled outreach');
console.log('------------------------------------');

const growth = read('app/dashboard/GrowthTab.js');

// The manual run flow is gone from the UI, matching the backend.
check('no "Run now" button remains', !/Run now/.test(growth));
check('no call to the removed /agents/run-all endpoint',
  !/agents\/run-all/.test(growth));
check('no runAgents helper remains', !/function runAgents/.test(growth));
check('engine copy no longer mentions a manual run',
  !/Run now still works|manual cycle/.test(growth));

// A connected Gmail account must be re-consentable in place: granting a new
// scope (inbox read) must not require the destructive Disconnect first, or the
// operator would tear down a working sending connection to fix reading. The
// control lives in the Growth header now, not a Settings page.
check('a connected Gmail account offers Reconnect without disconnecting',
  /Reconnect<\/button>/.test(growth) && /onClick=\{connect\}/.test(growth)
  && !/Disconnect first/.test(growth));

// Approvals: the human gate. The review window is read from settings and shown,
// and a human decision is never delayed by it.
check('Approvals reads the review window from settings',
  /review_window_minutes/.test(growth));
check('Approvals surfaces the human review window',
  /human review window/.test(growth) && /windowMin/.test(growth));
check('Approvals reads GET /approvals', /api\('\/approvals\?status=PENDING'\)/.test(growth));
check('Approvals decisions POST to the decision endpoint',
  /api\(`\/approvals\/\$\{id\}\/decision`/.test(growth));

// Conversations: the two-way exchange surface. Every prospect has a timeline,
// but this is the single place to read what was actually said across all of
// them. The view must be registered, rendered, and read the backend endpoint.
check('Conversations view is registered', /'conversations', 'Conversations'/.test(growth));
check('Conversations is rendered for its tab',
  /view === 'conversations' && <Conversations/.test(growth));
check('Conversations reads GET /conversations', /api\('\/conversations\?limit=/.test(growth));

// Keywords are backend-owned. The UI displays and toggles the terms the agents
// actually search with; it must not carry its own copy, or the two would drift
// and the operator would be editing a list nothing reads.
check('the keyword list comes from the backend, not a UI constant',
  /api\('\/keywords'\)/.test(growth)
  && !/const\s+(DEFAULT_|FALLBACK_)?KEYWORDS\s*=/.test(growth));
check('a keyword toggle PATCHes the backend rather than editing local state',
  /api\(`\/keywords\/\$\{k\.id\}`, \{ method: 'PATCH'/.test(growth));
check('the agent scope shown on a keyword comes from the row, not the UI',
  /k\.agent/.test(growth));

console.log('------------------------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
