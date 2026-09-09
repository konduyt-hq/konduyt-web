'use client';

import { useState, useEffect } from 'react';

const TOKEN_KEY = 'kdu_token';

// The nav links this mirrors -- kept in sync manually with the real
// desktop .nav-links in app/page.js, since they're deliberately two
// separate markup blocks (one hidden above 980px via CSS, one hidden
// below it) rather than one reflowing list, to keep the desktop nav
// exactly as it already is.
const LINKS = [
  { href: '/docs/', label: 'Docs' },
  { href: '/pricing/', label: 'Pricing' },
  { href: 'https://github.com/konduyt-hq', label: 'GitHub', external: true },
  { href: '/labs/', label: 'Labs' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      const legacy = sessionStorage.getItem(TOKEN_KEY);
      if (legacy && !localStorage.getItem(TOKEN_KEY)) localStorage.setItem(TOKEN_KEY, legacy);
      if (legacy) sessionStorage.removeItem(TOKEN_KEY);
      setSignedIn(!!localStorage.getItem(TOKEN_KEY));
    } catch (e) {}
  }, []);

  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        )}
      </button>

      {open && (
        <div className="mobile-nav-panel">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="mobile-nav-link"
              target={l.external ? '_blank' : undefined}
              rel={l.external ? 'noreferrer' : undefined}
              onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          {/* Duplicate of app/SignInLink.js's own logic (not shared as a
              hook to keep this component self-contained) -- shown here
              too, hidden via CSS ONLY at the tightest phone widths
              (.mobile-nav-signin has display:none above 480px, see
              globals.css), so the top-bar "Sign in" stays the one and
              only visible copy everywhere it already fits. */}
          {!signedIn && (
            <a href="/signin/" className="mobile-nav-link mobile-nav-signin"
              onClick={() => setOpen(false)}>
              Sign in
            </a>
          )}
        </div>
      )}
    </div>
  );
}
