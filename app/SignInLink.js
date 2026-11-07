'use client';

import { useState, useEffect } from 'react';

const TOKEN_KEY = 'kdu_token';

// Mirrors NavCta.js's own signed-in check exactly (same key, same
// localStorage/sessionStorage migration) -- kept as a small, separate
// component rather than merged into NavCta, since NavCta already has
// its own single responsibility (the CTA button) and page.js renders
// these as two distinct nav items, not one combined element.
//
// `next` optionally names the product this link belongs to, so a creator who
// signs in from the Creators page returns to the creator workspace rather than
// the Developers console. Absent (the default), behaviour is unchanged.
export default function SignInLink({ next = null }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      const legacy = sessionStorage.getItem(TOKEN_KEY);
      if (legacy && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, legacy);
      if (legacy) sessionStorage.removeItem(TOKEN_KEY);
      setSignedIn(!!localStorage.getItem(TOKEN_KEY));
    } catch (e) {}
  }, []);

  // Real fix, not just a spacing one: showing "Sign in" right next to
  // "Go to console" was a genuine redundancy for anyone already signed
  // in -- confusing on its own, and on mobile it was also eating width
  // a crowded nav didn't have to spare.
  if (signedIn) return null;

  const href = next ? `/signin/?next=${encodeURIComponent(next)}` : '/signin/';

  // "topbar-signin" class exists solely so CSS can hide this specific
  // instance at the tightest phone widths (see globals.css) once
  // MobileNav's own dropdown copy takes over there -- the two are never
  // both visible at once, by width, not by JS coordination.
  return <a href={href} className="signin topbar-signin">Sign in</a>;
}
