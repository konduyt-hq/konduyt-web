'use client';

import { useState, useEffect } from 'react';

const TOKEN_KEY = 'kdu_token';

export default function NavCta() {
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

  const href = signedIn ? '/dashboard/' : '/signup/';
  const label = signedIn ? 'Go to console' : 'Start for free';

  return (
    <a href={href} className="btn-start" style={{ textDecoration: 'none', display: 'inline-block' }}>
      {label}
    </a>
  );
}
