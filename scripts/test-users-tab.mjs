// Guard the Users tab.
//
// The Users tab must be minimal and honest: it reads the ONE user endpoint the
// API actually exposes (GET /admin/analytics/users) and offers NO management
// controls, because no user-management endpoint exists. This test fails if the
// tab stops reading the real endpoint, stops showing the essential fields, or
// grows a control that would call an endpoint that is not there.
//
// Run: node scripts/test-users-tab.mjs
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

console.log('Users tab');
console.log('---------');

const tab = read('app/dashboard/UsersTab.js');
const page = read('app/dashboard/page.js');

// Reachable: imported, registered and rendered under an admin-only tab.
check('page.js imports UsersTab', /import UsersTab from '\.\/UsersTab'/.test(page));
check('page.js renders UsersTab under the admin users tab',
  /tab === 'users' && isAdmin[\s\S]{0,300}<UsersTab/.test(page));
check('the users tab id is accepted by the tab resolver',
  /'sentinel', 'fee-monitor', 'users'\]/.test(page));
check('a topbar control opens the Users tab',
  /onClick=\{\(\) => setTab\('users'\)\}/.test(page));
check('the tab has a document title', /users: 'Konduyt Users'/.test(page));

// Reads the real, read-only endpoint — never a faked list.
check('reads GET /admin/analytics/users',
  /fetch\(`\$\{apiBase\}\/admin\/analytics\/users`/.test(tab));
check('sends auth headers', /headers: authHeaders\(\)/.test(tab));

// Essential user information is shown.
for (const field of ['Name', 'Email', 'Status', 'Last seen', 'Signed up',
                     'Sessions', 'Avg session']) {
  check(`shows ${field}`, tab.includes(`>${field}<`) || tab.includes(`>${field}</`),
    `missing column: ${field}`);
}
check('renders presence from online_now', /online_now/.test(tab));

// No invented controls: the only handler is `load`. The disclaimer prose
// necessarily NAMES the actions that do not exist, so instead of banning the
// words we assert no control is wired to them: no onClick/button references
// them, and there is exactly one interactive control (Refresh -> load).
const handlers = (tab.match(/onClick=\{([^}]*)\}/g) || []).join(' ');
check('states the API is read-only for users',
  /Read-only/.test(tab) && /no user-management actions/.test(tab));
check('no control handler references a role change',
  !/\brole\b/i.test(handlers));
check('no control handler references suspend/deactivate/invite',
  !/suspend|deactivat|invite/i.test(handlers));
check('no control handler references a delete',
  !/\bdelete\b/i.test(handlers));
check('issues no write request (only GET)',
  !/method:\s*'(POST|PATCH|PUT|DELETE)'/.test(tab));
check('the only interactive control is Refresh',
  (tab.match(/onClick=/g) || []).length === 1 && /onClick=\{load\}/.test(tab));
check('a load failure is distinguished from "no users"',
  /it does not mean there are no\s*\n?\s*users/.test(tab.replace(/\s+/g, ' ')));

console.log('---------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
