# konduyt-web

Frontend for [Konduyt](https://konduyt.dev) — payment orchestration infrastructure.

One integration connects a business to every payment provider and method it
needs — Stripe, PayPal, M-Pesa, Flutterwave, Paystack, and more — instead of
building and maintaining a separate integration for each. This repo is the
site and dashboard: the marketing pages, docs, and the developer dashboard
for connecting providers, managing keys, and viewing payments.

## Three products, one identity

The public root (`/`) is a product-selection page with three options, all
under one Konduyt account and one authentication system:

| Option | Destination | State |
| --- | --- | --- |
| Konduyt for Developers & Businesses | `/developers/` | Existing platform (the original payment product) |
| Konduyt for Creators | `/creators/` | In development; early-access request |
| Konduyt Payroll | — | Coming soon; deliberately not a link |

The payment product was **moved** to `/developers/`, not rewritten: its page,
content and links are the same as the old site root. The three options share
the existing signup (`/signup/`), login (`/signin/`) and dashboard
(`/dashboard/`) — nothing in the restructure touches authentication. The
Creators page is its own entry point and does not send visitors to the
developer dashboard, which belongs to a different product.

- **Live site:** [konduyt.dev](https://konduyt.dev)
- **Docs:** [konduyt.dev/docs](https://konduyt.dev/docs)
- **Stack:** Next.js, Cloudflare Pages
- **Backend:** [konduyt-api](https://github.com/konduyt-hq/konduyt-api)
- **Node.js / TypeScript SDK:** [konduyt-node](https://github.com/konduyt-hq/konduyt-node)
