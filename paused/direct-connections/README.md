# Direct Connections — PAUSED

Direct Connections is **paused**, not deleted. The code and data are kept here,
intact and recoverable, until real developer feedback gives us a reason to bring
it back.

## Why it is paused

The core product we are validating is:

> Developer → one Konduyt integration → supported payment methods/providers → checkout/payment.

Direct Connections ("add your own bank/mobile-money account and Konduyt asks
your customers to pay it directly") was a second, half-built product. Its
global bank/mobile-money directory could not execute payments almost anywhere,
so it risked showing developers methods Konduyt cannot actually run. That is
exactly the "listed is not payable" confusion we must not ship. So it is out of
the production UI until it is worth finishing.

We are **not** replacing it with another directory or a simulated connection
flow, and we are **not** spending more engineering time making it globally
executable.

## What was removed from the live product

- The dashboard's **Direct Connections tab** (`app/dashboard/page.js` no longer
  imports `DirectConnections` or registers the `direct` tab / `TAB_TITLES`
  entry).
- The **global landscape** (the former "Directory" surface) was already folded
  into the Direct Connections destination; removing the tab removes it too.
- The checkout SDK's rendering of **`direct_options`** (`public/konduyt.js`).

## What is kept here

| Path (mirrors its live location) | What it is |
| --- | --- |
| `app/dashboard/DirectConnections.js` | the connect surface |
| `app/dashboard/DirectConnectionsCountries.js` | the global landscape / directory |
| `scripts/test-direct-connections-render.mjs` | its render suite |
| `scripts/test-direct-connections-countries-render.mjs` | its landscape render suite |
| `scripts/regenerate-direct-connections-fixture.py` | rebuilds the fixture from the API modules |
| `scripts/fixtures/direct-connections.sample.json` | the pinned API payload fixture |

The backend modules (`app/direct_connections/*`) and the database tables
(`dc_*`) stay in `konduyt-api` unchanged; the API simply stops mounting the
router and stops attaching `direct_options` to checkout. Nothing is dropped.

## How to bring it back

1. Move the files back to their live paths:

   ```sh
   git mv paused/direct-connections/app/dashboard/DirectConnections.js app/dashboard/
   git mv paused/direct-connections/app/dashboard/DirectConnectionsCountries.js app/dashboard/
   git mv paused/direct-connections/scripts/test-direct-connections-render.mjs scripts/
   git mv paused/direct-connections/scripts/test-direct-connections-countries-render.mjs scripts/
   git mv paused/direct-connections/scripts/regenerate-direct-connections-fixture.py scripts/
   git mv paused/direct-connections/scripts/fixtures/direct-connections.sample.json scripts/fixtures/
   ```

2. Re-add the import, the `['direct', 'Direct Connections']` tab, the
   `TAB_TITLES.direct` entry and the `{tab === 'direct' && ...}` render block in
   `app/dashboard/page.js` (all four are needed; the render tests assert them).
3. Re-add the `test:direct-connections-render` /
   `test:direct-connections-countries` scripts to `package.json` and back into
   the `test` chain.
4. On `konduyt-api`, unset the pause flag (`DIRECT_CONNECTIONS_PAUSED = False`
   in `app/direct_connections/__init__.py`) so the router mounts, the startup
   seed runs, and checkout attaches `direct_options` again.
5. On the checkout SDK, restore the `direct_options` handling in
   `public/konduyt.js` and the corresponding cases in
   `scripts/test-production-sdk.mjs`.

`scripts/test-direct-connections-paused.mjs` (`npm run test:direct-connections-paused`)
guards the paused state: it fails if any Direct Connections surface or the
`direct_options` render path quietly returns to the production UI without this
being a deliberate, reviewed change.
