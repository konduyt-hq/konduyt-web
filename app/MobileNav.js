'use client';

import { useState } from 'react';

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
        </div>
      )}
    </div>
  );
}
