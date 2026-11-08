// Cloudflare Pages Function, not Next.js middleware — this site is a static
// export (`output: 'export'` in next.config.js), so there is no server/edge
// runtime for Next.js itself to hook into. Pages Functions run independently
// of that, in front of the static files, which is exactly what host-based
// routing needs.
//
// Two jobs:
//
// 1. Host-based routing. A visitor hits dashboard.konduyt.dev/whatever. DNS and
//    the Cloudflare Pages custom-domain step get them to this deployment, but
//    the actual dashboard files live under /dashboard/ in the static export
//    (because this is still one Next.js app with both marketing and dashboard
//    routes). This function rewrites the request so dashboard.konduyt.dev/
//    actually serves /dashboard/index.html, dashboard.konduyt.dev/settings
//    serves /dashboard/settings/index.html (if that ever becomes a real route),
//    and so on -- without the visitor ever seeing /dashboard in the URL.
//
// 2. Legacy product paths. Konduyt Payments is the only product again, so the
//    site root IS the payment product. The three-product restructure had moved
//    that page to /developers/ and put a selection page at /; /developers/ now
//    redirects to / so the one product has one canonical URL and no old link
//    breaks. The retired creators host redirects to the main site rather than
//    serving a product that is no longer offered.
//
// Requests to konduyt.dev (the marketing site) pass through untouched, apart
// from the /developers/ redirect above.

const HOST_PREFIXES = {
  'dashboard.konduyt.dev': '/dashboard',
};

// Hosts that no longer serve a product of their own. They redirect to the main
// site rather than 404 or serve a retired page.
const RETIRED_HOSTS = {
  'creators.konduyt.dev': 'https://konduyt.dev/',
};

// Paths the restructure introduced that are no longer the product's own URL.
// Redirected (not rewritten) so the address bar reflects the canonical page.
const RETIRED_PATHS = new Set(['/developers', '/developers/']);

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const retiredHost = RETIRED_HOSTS[url.hostname];
  if (retiredHost) {
    return Response.redirect(retiredHost, 302);
  }

  if (RETIRED_PATHS.has(url.pathname)) {
    const target = new URL('/', url);
    return Response.redirect(target.toString(), 302);
  }

  const prefix = HOST_PREFIXES[url.hostname];
  if (prefix && !url.pathname.startsWith(prefix)) {
    const rewritten = new URL(url);
    rewritten.pathname = `${prefix}${url.pathname === '/' ? '/' : url.pathname}`;
    return context.env.ASSETS.fetch(new Request(rewritten, context.request));
  }

  return context.next();
}
