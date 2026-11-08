# konduyt-web

Frontend for [Konduyt](https://konduyt.dev) — payment orchestration infrastructure.

One integration connects a business to every payment provider and method it
needs — Stripe, PayPal, M-Pesa, Flutterwave, Paystack, and more — instead of
building and maintaining a separate integration for each. This repo is the
site and dashboard: the marketing pages, docs, and the developer dashboard
for connecting providers, managing keys, and viewing payments.

## One product: Konduyt Payments

Konduyt Payments is the only active product. The public root (`/`) is the
payment landing page itself — the hero, the supported-providers rail and the
interactive code panel — backed by the existing signup (`/signup/`), login
(`/signin/`) and dashboard (`/dashboard/`), all under one Konduyt account and
one authentication system.

CreatorOS (Konduyt for Creators) has been retired and Payroll is parked, so
neither is offered anywhere in the public experience. A legacy `/developers/`
link redirects to the root, and the retired `creators.konduyt.dev` host
redirects to the main site.

- **Live site:** [konduyt.dev](https://konduyt.dev)
- **Docs:** [konduyt.dev/docs](https://konduyt.dev/docs)
- **Stack:** Next.js, Cloudflare Pages
- **Backend:** [konduyt-api](https://github.com/konduyt-hq/konduyt-api)
- **Node.js / TypeScript SDK:** [konduyt-node](https://github.com/konduyt-hq/konduyt-node)
