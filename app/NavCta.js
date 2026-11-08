'use client';

import { useState, useEffect } from 'react';

const TOKEN_KEY = 'kdu_token';

// `next` optionally names a destination to carry through the auth round trip.
// Konduyt is one product again, so nothing passes it now and the default
// behaviour (the Developers console) is what everyone gets; it is kept as the
// generic seam signup and the OAuth return already understand.
export default function NavCta({ next = null, signedInLabel = 'Go to console' }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      // Migrate any legacy sessionStorage token to localStorage.
      const legacy = sessionStorage.getItem(TOKEN_KEY);
      if (legacy && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, legacy);
      if (legacy) sessionStorage.removeItem(TOKEN_KEY);
      setSignedIn(!!localStorage.getItem(TOKEN_KEY));
    } catch (e) {}
  }, []);

  const href = signedIn
    ? (next || '/dashboard/')
    : (next ? `/signup/?next=${encodeURIComponent(next)}` : '/signup/');
  const label = signedIn ? signedInLabel : 'Start for free';

  return (
    <a href={href} className="btn-start" style={{ textDecoration: 'none', display: 'inline-block' }}>
      {label}
    </a>
  );
}
