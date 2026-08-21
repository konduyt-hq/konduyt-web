'use client';

import { useEffect } from 'react';

// The API's DB pool deliberately keeps zero idle connections (min_size=0, see
// app/db.py on the backend) so Neon's serverless database can fully suspend
// when nobody's using it -- cheaper, but the FIRST query after a suspend pays
// a real cold-start cost. Right now that cost lands entirely on whoever clicks
// "Go to Console," stacked on top of the (also DB-touching) /me and /projects
// calls that have to run in sequence before the dashboard can render anything.
//
// This fires one cheap, fire-and-forget GET /health (which genuinely touches
// the database, unlike a pure liveness check) the moment someone lands on the
// marketing page. If they spend even a few seconds reading before clicking
// through, the database is very likely already awake by the time the
// dashboard's real chain of requests starts -- hiding the cold-start latency
// behind time that was going to pass anyway, instead of making them wait
// through it.
export default function WarmupPing() {
  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';
    fetch(`${apiBase}/health`, { cache: 'no-store' }).catch(() => {
      // Deliberately silent -- this is a best-effort optimization, not a
      // feature. If it fails, the dashboard's own real requests still work,
      // they just won't have gotten a head start.
    });
  }, []);

  return null;
}
