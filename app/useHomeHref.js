'use client';

import { useState, useEffect } from 'react';

// Returns the right "home" destination: the dashboard when signed in, else the
// landing page. Use for logo / "Back to Konduyt" / "Home" links so signed-in
// users are never bounced out to the marketing page.
export function useHomeHref() {
  const [href, setHref] = useState('/');
  useEffect(() => {
    try {
      if (localStorage.getItem('kdu_token')) setHref('/dashboard/');
    } catch (e) {}
  }, []);
  return href;
}
