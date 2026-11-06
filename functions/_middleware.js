// Cloudflare Pages Function, not Next.js middleware — this site is a static
// export (`output: 'export'` in next.config.js), so there is no server/edge
// runtime for Next.js itself to hook into. Pages Functions run independently
// of that, in front of the static files, which is exactly what host-based
// routing needs.
//
// What this does: a visitor hits dashboard.konduyt.dev/whatever. DNS and the
// Cloudflare Pages custom-domain step get them to this deployment, but the
// actual dashboard files live under /dashboard/ in the static export (because
// this is still one Next.js app with both marketing and dashboard routes).
// This function rewrites the request so dashboard.konduyt.dev/ actually
// serves /dashboard/index.html, dashboard.konduyt.dev/settings serves
// /dashboard/settings/index.html (if that ever becomes a real route), and so
// on -- without the visitor ever seeing /dashboard in the URL.
//
// creators.konduyt.dev is handled the same way, serving the /creators/ product
// entry point, so the creator product has its own clean hostname. If the
// creator workspace is later deployed as a separate application on that host,
// this rewrite simply never runs (the request never reaches this project).
//
// Requests to konduyt.dev (the marketing site) pass through untouched.

const HOST_PREFIXES = {
  'dashboard.konduyt.dev': '/dashboard',
  'creators.konduyt.dev': '/creators',
};

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const prefix = HOST_PREFIXES[url.hostname];
  if (prefix && !url.pathname.startsWith(prefix)) {
    const rewritten = new URL(url);
    rewritten.pathname = `${prefix}${url.pathname === '/' ? '/' : url.pathname}`;
    return context.env.ASSETS.fetch(new Request(rewritten, context.request));
  }

  return context.next();
}
