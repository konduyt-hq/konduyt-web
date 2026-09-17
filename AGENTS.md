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
- This repo has no test suite. Verification is: `npx next build` succeeds,
  then grep the emitted `out/_next/static/chunks/app/page-*.js` for the
  expected snippet text. Snippet content is split across chunks — a string
  may live in `app/page-*.js` while another lives in `545-*.js`.

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
