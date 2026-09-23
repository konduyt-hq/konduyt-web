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
curl -sSL https://konduyt.dev/checkout-page.html | grep -c rankByCost
```

`/checkout-page.html` 308-redirects to `/checkout-page`, so follow redirects.
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
