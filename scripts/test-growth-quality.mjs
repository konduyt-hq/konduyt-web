// Guard the "quality first, then controlled outreach" Growth surface.
//
// The backend moved to a transparent qualification score, a bounded cohort, a
// strategy-health loop, and a real funnel report -- and removed the manual
// "Run now" flow. This test fails loudly if the dashboard regresses: if it
// re-adds a manual run, re-implements a rule the backend owns, or stops
// surfacing the new review surfaces.
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

console.log('Growth quality + controlled cohort');
console.log('---------------------------------');

const growth = read('app/dashboard/GrowthTab.js');

// The manual run flow is gone from the UI, matching the backend.
check('no "Run now" button remains', !/Run now/.test(growth));
check('no call to the removed /agents/run-all endpoint',
  !/agents\/run-all/.test(growth));
check('no runAgents helper remains', !/function runAgents/.test(growth));

// The three new views exist and are reachable.
check('Cohort view is registered', /'cohort', 'Cohort'/.test(growth));
check('Strategy health view is registered', /'strategy', 'Strategy health'/.test(growth));
check('Experiment view is registered', /'experiment', 'Experiment'/.test(growth));
check('CohortView is rendered for the cohort tab',
  /view === 'cohort' && <CohortView/.test(growth));
check('StrategyHealth is rendered for the strategy tab',
  /view === 'strategy' && <StrategyHealth/.test(growth));
check('Experiment is rendered for the experiment tab',
  /view === 'experiment' && <Experiment/.test(growth));

// Every view reads the backend; none fabricates numbers.
check('CohortView reads GET /cohort', /api\('\/cohort'\)/.test(growth));
check('Cohort preview is a dry run', /cohort\/select', \{ dry_run: true \}/.test(growth));
check('Cohort selection hits the real select endpoint',
  /api\(path, \{ method: 'POST'/.test(growth) && /post\('\/cohort\/select'/.test(growth));
check('StrategyHealth reads GET /strategy/health', /api\('\/strategy\/health'\)/.test(growth));
check('StrategyHealth re-evaluates via POST /strategy/evaluate',
  /api\('\/strategy\/evaluate', \{ method: 'POST' \}\)/.test(growth));
check('Experiment reads the real report endpoint', /api\('\/strategy\/report'\)/.test(growth));

// The score is shown with its reasons and factors, not just a number.
check('the cohort table shows the qualification score',
  /qualification_score/.test(growth));
check('the cohort detail shows the score factors',
  /qualification_factors/.test(growth));
check('the cohort detail shows the recommended message for review',
  /recommended_body/.test(growth));
check('the experiment shows the drop between funnel stages',
  /drop_from_previous/.test(growth));

// Strategy health renders the explicit verdict and its allocation weight.
check('strategy health shows the health state', /health_state/.test(growth));
check('strategy health shows the allocation weight', /allocation_weight/.test(growth));
check('strategy health shows the false-positive rate', /false_positive_rate/.test(growth));

// Copy must not promise a manual cycle.
check('engine copy no longer mentions a manual run',
  !/Run now still works|manual cycle/.test(growth));
check('the cohort copy states selecting sends nothing',
  /never sends anything|never emails anyone|Nothing was sent/.test(growth));

console.log('---------------------------------');
console.log(`  ${checks - failures}/${checks} passed`);
process.exit(failures ? 1 : 0);
