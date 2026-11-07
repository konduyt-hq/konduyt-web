'use client';

import { useState, useEffect, useRef } from 'react';

// The one-platform product switcher.
//
// Konduyt has a single identity and three products, but each product's own pages
// used to link only to themselves, so moving between them meant going back to the
// landing page. This is the one control that makes the products read as parts of a
// single platform: it is rendered identically on the landing page and on each
// product surface, and it never sends anyone to a product that does not exist --
// Payroll is listed and marked, not linked.

const ITEMS = [
  { id: 'developers', label: 'Developers & Businesses', href: '/developers/', match: ['/developers'] },
  { id: 'creators', label: 'Creators', href: '/creators/', match: ['/creators'] },
  { id: 'payroll', label: 'Payroll', href: null, soon: true },
];

export default function ProductSwitcher() {
  const [open, setOpen] = useState(false);
  const [here, setHere] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    try {
      const path = window.location.pathname;
      const found = ITEMS.find((i) => i.match && i.match.some((m) => path.startsWith(m)));
      setHere(found ? found.id : null);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = ITEMS.find((i) => i.id === here);

  return (
    <div className="product-switcher" ref={boxRef}>
      <button
        type="button"
        className="product-switcher-btn"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="product-switcher-label">{current ? current.label : 'All products'}</span>
        <span className="product-switcher-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="product-switcher-menu" role="menu">
          {ITEMS.map((i) =>
            i.href ? (
              <a
                key={i.id}
                href={i.href}
                role="menuitem"
                className={`product-switcher-item${i.id === here ? ' is-current' : ''}`}
              >
                <span className="product-switcher-item-label">{i.label}</span>
                {i.id === here && <span className="product-switcher-item-note">Current</span>}
              </a>
            ) : (
              <span
                key={i.id}
                className="product-switcher-item product-switcher-item-soon"
                aria-disabled="true"
              >
                <span className="product-switcher-item-label">{i.label}</span>
                <span className="product-switcher-item-note">Coming soon</span>
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
