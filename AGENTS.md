# AGENTS.md — konduyt-web

Working notes for agents in this repo.

## Deploy topology

Two separate services, two separate repos. One deploy does not cover both, and
a commit hash is only meaningful once you know which repo it belongs to.

| Surface | Host | Repo | Config |
| --- | --- | --- | --- |
| `konduyt.dev` (this repo) | Cloudflare Pages | `konduyt-hq/konduyt-web` | dashboard-managed |
| `konduyt-api.onrender.com` | Render | `konduyt-hq/konduyt-api` | `render.yaml` in that repo |

A Render commit hash refers to `konduyt-api`, **not** this repo. Before
diagnosing a "stale deploy", check which service is being looked at, and
compare `git rev-list --count origin/main..HEAD` in each repo separately.

Both deploys are dashboard-configured with auto-deploy on `main` (there is no
`.github/` or `wrangler.toml` here), so a push is the whole deploy trigger.

### Verifying a deploy actually landed

The served HTML is a Next.js shell, so page content lives in JS chunks and a
plain `curl` of a route will not show source markers. Verify against an
artifact served as static text instead:

```
curl -sSL https://konduyt.dev/checkout-page.html | grep -c kduSortByCost
```

`/checkout-page.html` 308-redirects to `/checkout-page`, so follow redirects.
The ranking helper was renamed `rankByCost` -> `kduSortByCost` (2026-09-19,
commit `224d081`); grep for the new name, an old marker silently returns 0 on a
healthy deploy.

For the API, exercise a feature added by the newest commit rather than trusting
the dashboard hash -- e.g. POST `/v1/demo/run` with `customer.phone` and check
for the `carrier` block.

## Build & verify

- Next.js 14 App Router with `output: 'export'` (static export). `next start`
  does **not** work; to preview a build use `python3 -m http.server -d out`
  after `npx next build`.
- `npm install` is required before `npx next build` (node_modules is not
  committed).
- Syntax-check a single file with `node --check app/DevPanel.js`.
- Test suite (no framework; plain Node scripts, `npm install` first):
  - `npm run test:snippets` — extracts every published sample from
    `app/DevPanel.js` into `.snippets/` (gitignored, regenerated each run) and
    compiles it with the real toolchain. Also checks cross-file coupling: the
    Android layout ids against the Java/Kotlin code, the storyboard outlets and
    actions against the Swift code, and every `getElementById` in the frontend
    snippets against the ids their target page declares. Malformed
    `activity_main.xml` / `Main.storyboard` are caught here.
  - `npm run test:snippet-runtime` — starts each backend sample for real and
    serves requests over HTTP: the page at `/`, a bad amount must not come
    back as a successful payment, and CORS preflight must be answered.
  - `npm run test:checkout` — drives `public/checkout-page.html` through jsdom.
  - Verification is still: `npx next build` succeeds, then grep the emitted
    `out/_next/static/chunks/app/page-*.js` for expected snippet text. Snippet
    content is split across chunks — a string may live in `app/page-*.js`
    while another lives in `545-*.js`.
- Toolchains the suites call when present: `libcurl4-openssl-dev` (the C++ sample
  `#include <curl/curl.h>`), `libcpp-httplib-dev` (the C++ sample
  `#include <httplib.h>`; on Debian the header lands in the multiarch dir, which
  `g++` already searches once installed), `flask` + `requests` (Python runtime
  server), `php`, `ruby`, `go`, `xmllint`, plus the Android/.NET/Swift SDKs which
  stay skipped. Install what you can to get real coverage.
- **A missing dependency is a SKIP, never a FAIL.** Both suites check the
  *dependency*, not just the binary: `test:snippet-runtime` probes each
  backend's own imports (`import flask, requests`, `require "sinatra"`) and
  `test:snippets` recognizes a missing system header. A bare machine therefore
  reports `ALL ... PASSED (n skipped)` with the reason named, instead of
  implying the sample is broken. When adding a check that needs a tool or
  package, add the same probe — do not let the environment read as a defect.
  Match the missing-dependency diagnostic specifically, so a genuine syntax or
  symbol error in a sample still fails.
- **`test:intelligence-sdk` reads the live API, not local code.** It defaults
  `KONDUYT_API` to the deployed `konduyt-api.onrender.com` and feeds that
  response to locally-built jsdom markup. So a pass or fail there can mean the
  *deploy* is stale rather than the local change being wrong. Set
  `KONDUYT_API=http://127.0.0.1:<port>` against a local uvicorn to test local
  code; run it both ways before concluding anything. Two merges have already
  disagreed this way: a check passed pre-merge only because the deploy still
  returned the old, wrong payload.
- **Assert a caption over the subset it applies to.** Non-executable rows carry
  one of two captions: ordinary unroutable rows say `NOT ON KONDUYT YET`, while
  representative (example) rows say `EXAMPLE` with an `Example from <country>`
  badge. Asserting one caption across *every* `.rail-unsupported` row
  contradicts the other caption, and the contradiction stays hidden until a
  country actually returns representative data. Filter on `.rail-example` and
  assert each caption over its own group.

## Landing-page code snippets

- `app/DevPanel.js` holds the 11 language tabs (JS, cURL, Python, PHP, Go,
  Ruby, Rust, C#, C++, Java, Kotlin, Swift). Each tab is an object with
  `id`, `label`, `filename`, `deps`, and a backtick `code` template literal.
  Placeholders `{{SECRET}}` and `{{API}}` are substituted at render time.
- `app/dashboard/frontendfiles.js` holds `ANDROID_LAYOUT_XML` (must stay in
  sync with the `R.id.*` names the Java/Kotlin tabs read) and
  `IOS_STORYBOARD_XML` (must stay in sync with the Swift tab's `@IBOutlet` /
  `@IBAction` names). `app/dashboard/langsnippets.js` is the dashboard's own
  copy of similar snippets.
- Because the snippets are template literals, `\` `${` and `\` must be
  escaped when editing them by hand. Prefer the render-and-grep workflow
  above over eyeballing.
- To render a snippet exactly as a user sees it (placeholders substituted),
  extract the tab's `code` template literal from `app/DevPanel.js` and
  `new Function('return ' + literal)()`.

## Gotchas learned while fixing snippets

- Go fails to compile on a declared-but-unused variable; snippets must
  actually use every variable they declare.
- XML comments must not contain `--`. `Phone (optional -- for mobile money)`
  inside `<!-- ... -->` makes both `activity_main.xml` and `Main.storyboard`
  malformed. Use a single em dash or rephrase.
- cpp-httplib is header-only. Homebrew's own formula test compiles with
  `-lpthread` and no `-lcpp-httplib`; Debian additionally ships a shared
  `.so`, but linking it is not required and is not portable. Document
  `g++ main.cpp -lcurl -o server`.
- The Swift tab is UIKit (`UIViewController` + `@IBOutlet`/`@IBAction`)
  because it pairs with `Main.storyboard`, not SwiftUI — the filename must
  be a view controller, not `ContentView.swift`.
- The runtime suite is only meaningful on a free port. A backend left over
  from an earlier run keeps :3000, every later backend "starts" while the
  stale one answers its requests, and the result reads as several unrelated
  languages failing the same assertion. The suite now refuses to run against
  an occupied port and kills each server's whole process group; if you see
  that failure shape, check for a stray listener before touching the snippets.
- Name the served page exactly `checkout-page.html` in snippets and prose. The
  samples used to say `checkout.html`, which does not exist anywhere in this
  repo, so a reader following the comment would look for the wrong file.

## A layout-variant class with no CSS rule fails silently

The landing popup's rows (`intel-modal-row`) are a 4-column grid left over
from when a speed column existed, so a 3-cell row needs
`intel-row-3col{grid-template-columns:...}`. Commit `224d081` added that class
to the markup and never added the rule to `globals.css` — and because the
popup's `<=520px` media query is already a plain 3-column grid, it only looked
wrong at desktop width, where a phantom fourth column ate ~150px of every row.
`intel-rail-unsupported`, `intel-rail-fee-note`, `intel-modal-head` and
`test-more-rail-action`/`-3col` were in the same state: named in JSX, absent
from CSS, so they rendered as full-size body text instead of small-caps
markers.

Two things that rule alone will not catch, both found by measuring the built
CSS in headless Chromium at several widths rather than by reading it:

- A rule that exists but never wins the cascade. The `<=520px` override of
  `.intel-modal-row` sits *before* `.intel-modal-row.intel-row-3col` in the
  file; equal specificity, so source order decides and the override lost. The
  mobile grid was dead code, and the action column stayed a fraction of the
  row. Check the winning rule, not just that a rule exists.
- A cell with no width floor. `.intel-rail-unsupported` ("Not on Konduyt yet")
  had no `white-space:nowrap`, so in a ~95px column it broke into three
  one-word lines. `intel-rail-action` now carries `nowrap` for the same reason
  the checkout page's `.rail-action` always has it.

Grep both sides before trusting a variant class — take tokens only from the
literal parts of `className`, or template expressions leak identifiers in:

```
python3 - <<'PY'
import re
js, css = open('app/DevPanel.js').read(), open('app/globals.css').read()
used = set()
for m in re.finditer(r'className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})', js):
    raw = re.sub(r'\$\{[^}]*\}', ' ', ''.join(x for x in m.groups() if x))
    used |= {t for t in re.split(r'[\s`?:\'"]+', raw) if re.fullmatch(r'[a-z][a-z0-9-]*', t)}
defined = set(re.findall(r'\.([a-zA-Z][a-zA-Z0-9_-]*)', css))
print(sorted(t for t in used if t not in defined and t != 'null'))
PY
```

Run the same check against `public/checkout-page.html` and
`app/dashboard/intelligencesdk.js`; each surface carries its own copy.

Then confirm against the built CSS (`out/_next/static/css/*.css`), because
that is what ships, and measure the real box model in headless Chromium rather
than eyeballing a screenshot:

```
chromium --headless --disable-gpu --no-sandbox --virtual-time-budget=3000 \
  --dump-dom http://localhost:12000/_probe.html
```

A probe that links the emitted stylesheet and prints `getComputedStyle(row)
.gridTemplateColumns` next to each cell's `getBoundingClientRect()` shows a
grid/cell mismatch directly.

## The landing popup lists a fixed reference transaction, not the viewer

Clicking "Run in test mode" curates the reference transaction the landing page
advertises: a KES 5,000 Kenyan payment (`handleRun` posts `country: 'KE'`,
`currency: 'KES'`, a fixed amount). It is a worked example, not a quote for
whoever is looking at the page -- so it says nothing about the viewer's own
country, and a method list that changes by visitor would misrepresent a fixed
claim. Every `local_methods` entry there is Kenya's real catalogue.

Apple Pay is a legitimate Kenya catalogue entry, but it carries no fee and no
source -- it rides the card rail rather than being separately priceable. The
popup drops fee-less non-executable entries, because a blank fee column plus
"Not on Konduyt yet" shows the reader nothing they can act on. The filter
lives at that one call site and applies only to the non-executable group, so
executable methods and the `bestValueMethod` badge are untouched. Grouping
(a currency-priced route ahead of a market figure the merchant cannot charge
yet) is covered by a test in `scripts/test-intelligence-sdk.mjs`; ordering is
never mixed across the two groups.

## Billing enforcement is a server-side fact, never a frontend assumption

Billing is REPRESENTED but not ENFORCED at launch. The API's
`app/billing.ENFORCEMENT_ENABLED` is `False`, and `GET /billing` returns it as
`enforcement_enabled` together with the `notice` to display
(`app/billing.launch_billing_state()`).

The dashboard must read that flag, not invent a limit. It previously hardcoded
`projects.length > 3 -> window.location.href = '/pricing/'` in
`app/dashboard/page.js`, so creating a 4th project bounced the developer to
`/pricing/`, whose Subscribe button then reported "Billing isn't set up yet.
Please try again shortly." — an unenforced model blocking project creation.

Rules:

- Project creation is never gated while `enforcement_enabled` is false. Only
  when the server reports it is actually enforced may the free-allowance limit
  apply.
- Default the client's `billingEnforced` to false, so an unreachable or failed
  `/billing` read can never gate a user by accident.
- Any user-visible pricing claim (Settings "Current plan", pricing copy) must
  agree with the same flag. Do not show a `$10/mo beyond the free` charge while
  billing is not operational.
- Regression coverage: `npm run test:billing-gate` asserts the redirect is
  gated on the flag in both source and the built chunk. Run it after
  `npx next build`.
- Only ACTIVE PRODUCTION (live) projects are billable. `app/billing.py`:
  `billable = max(0, active_production - free_allowance)`, and sandbox/test or
  merely-created projects never count. Never derive a charge from
  `projects.length`; read `active_production_projects` / `monthly_charge_usd`
  from `GET /billing`. Overstating a future charge is as dishonest as hiding it.
- "Not enforced yet" is not "free forever". Creating a project that will be
  billable later must say so at creation time (the `con-proj-create-notice`
  banner) -- stating both that nothing is charged today and the charge that
  applies once billing is switched on. A silent success hides a future bill.
- Keep user-facing amounts driven by the server's figures, falling back to the
  `app/billing.py` constants only when the read fails (see `num()` in
  `app/dashboard/page.js`), so the wording cannot drift from the real model.

## Popup fee data comes from konduyt-api — never re-attribute a fee here

The landing-page popup (`app/DevPanel.js`) and `/demo/` read fees from
`POST https://konduyt-api.onrender.com/v1/demo/run`; `konduyt-web` renders those
numbers verbatim and derives none of them. So a wrong fee in the popup is an API
bug, not a frontend one. Do not "fix" a fee by editing the frontend — the popup
must never invent or re-attribute a fee.

The Kenya operator-attribution bug recorded here on 2026-09-24 — every
mobile-money rail priced with M-Pesa's fee and `safaricom.co.ke` source — was
fixed on `konduyt-api` by PR #3 (`4b63b7d`, merged as `f3db05f`). One part of
it did NOT land and is still open on `konduyt-api` branch
`fix/mpesa-operator-attribution`: the consumer-tariff family of fixes, whose
tip is now `d5c69fa`. Until that branch ships, the live deploy the popup reads
can still hand back a consumer tariff as the executable fee. The executable
M-Pesa fee Konduyt routes is Paystack's merchant rate, KES 75.00 at KES 5,000
(`paystack.com/pricing`, 1.5%), not Safaricom's KES 57.00 consumer send tariff
(`daraja`, 1.14%) — that is the exact difference the popup shows when it reads
the fixed API instead of the deployed one.

Also note the distinction the popup's own copy has to keep straight: a method
being *priced* is not the same as being *executable*. Airtel Money is
`NOT_ON_KONDUYT_YET`, and this is now doubly true: no provider that implements
a connector declares it. `app/connectors/capabilities.py` lists Paystack's
Kenya capabilities as `card, bank_transfer, mpesa, apple_pay, google_pay` —
`airtel_money` is absent. Flutterwave declares `airtel_money`, but only for
`TZ`/`GH` operators, `daraja` is M-Pesa-only, and `operator_support_for`
returns `None` for every candidate in Kenya. So the rail stays
`NOT_ON_KONDUYT_YET`, its fee is genuinely unknown (the resolver reports
`fee_minor: None`, not a number), and it never gets a Pay button.

A `0` market fee is never a merchant-collection fee. Kenya's Airtel Money is
free for Airtel-to-Airtel sends, so its published consumer table yields 0;
`capability_resolver._resolve`'s market fallback used to carry that 0 through
and the popup rendered `KES 0.00 · Market fee`, which reads as "accepting this
costs the merchant nothing". The fallback now treats a 0 market reference as
"not found" and reports no fee. Pinned by
`app/demo_popup_fees_tests.py::test_a_free_consumer_tier_is_never_a_market_fee`.
