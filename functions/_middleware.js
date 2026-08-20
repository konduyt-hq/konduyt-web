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
// Requests to konduyt.dev (the marketing site) pass through untouched.

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === 'dashboard.konduyt.dev' && !url.pathname.startsWith('/dashboard')) {
    const rewritten = new URL(url);
    rewritten.pathname = `/dashboard${url.pathname === '/' ? '/' : url.pathname}`;
    return context.env.ASSETS.fetch(new Request(rewritten, context.request));
  }

  return context.next();
}
