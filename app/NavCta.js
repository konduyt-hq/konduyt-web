'use client';

import { useState, useEffect } from 'react';

const TOKEN_KEY = 'kdu_token';

// Renders the primary nav CTA. If the user has an active session token, it
// reads "Go to console" and links to the dashboard. Otherwise it reads
// "Start for free" and links to signup. Client-only so it can check storage.
export default function NavCta() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      setSignedIn(!!sessionStorage.getItem(TOKEN_KEY));
    } catch (e) {}
  }, []);

  const href = signedIn ? '/dashboard/' : '/signup/';
  const label = signedIn ? 'Go to console' : 'Start for free';

  return (
    <a
      href={href}
      className="btn-start"
      style={{ textDecoration: 'none', display: 'inline-block' }}
    >
      {label}
    </a>
  );
}
