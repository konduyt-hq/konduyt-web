'use client';

import { useState, useEffect } from 'react';

const TOKEN_KEY = 'kdu_token';

// Landing CTA that sits between "Test before you sign up" and "In the works".
// New visitor  -> a prominent "Sign up for free" prompt (they've just tried the
//                 test panel above, now invite them in).
// Returning    -> "Go to Console" + "Sign in" (don't push signup on someone who
//                 already has an account).
export default function LandingCta() {
  const [state, setState] = useState('loading'); // loading | new | returning

  useEffect(() => {
    try {
      const legacy = sessionStorage.getItem(TOKEN_KEY);
      if (legacy && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, legacy);
      const token = localStorage.getItem(TOKEN_KEY);
      setState(token ? 'returning' : 'new');
    } catch (e) {
      setState('new');
    }
  }, []);

  if (state === 'loading' || state === 'returning') {
    // Returning users already have "Sign in" and "Go to console" in the top nav —
    // don't repeat them in a mid-page card. Show nothing here for them.
    // (Also render nothing while loading, to avoid a flash of the new-user CTA.)
    return null;
  }

  // New visitor — invite them to sign up, after they've tried the test panel above.
  return (
    <div className="landing-cta">
      <h2 className="landing-cta-title">Ready when you are</h2>
      <p className="landing-cta-sub">You&apos;ve seen it run. Create an account and connect your first provider.</p>
      <div className="landing-cta-btns">
        <a href="/signup/" className="landing-cta-primary">Sign up for free</a>
        <a href="/signin/" className="landing-cta-secondary">Sign in</a>
      </div>
    </div>
  );
}
