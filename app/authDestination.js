'use client';

// One place that decides where a signed-in visitor lands, shared by signup,
// sign-in and the OAuth return.
//
// Konduyt has ONE account and now ONE product: the payment platform. A creator
// product used to be a second destination here; it has been retired, so the
// Developers console is the only landing place. The helpers below keep their
// existing names and behaviour (signup, sign-in and the dashboard all still
// call them), but every destination resolves to the console.
//
// `next` is still accepted from the URL, and still never trusted: it is
// validated against an allow-list rather than used raw, so a crafted link cannot
// become an open redirect. A stale `/creators/...` value (an old bookmark, or a
// tab opened before the retirement) simply falls back to the console, which is
// where those users belong now.

export const PRODUCTS = {
  developers: {
    id: 'developers',
    label: 'Konduyt for Developers & Businesses',
    short: 'Developers & Businesses',
    destination: '/dashboard/',
  },
};

export const DEFAULT_DESTINATION = PRODUCTS.developers.destination;

// The only paths a `next` value may resolve to. An allow-list, not a prefix
// check: an open redirect would let a crafted link send a freshly signed-in
// person anywhere, including off-site. With one product this is a single entry.
const ALLOWED = new Set([PRODUCTS.developers.destination]);

export function resolveDestination(next) {
  if (typeof next !== 'string' || !next) return DEFAULT_DESTINATION;
  return ALLOWED.has(next) ? next : DEFAULT_DESTINATION;
}

export function productForDestination(dest) {
  return PRODUCTS.developers;
}

const PENDING_KEY = 'kdu_next';

export function rememberDestination(dest) {
  try { localStorage.setItem(PENDING_KEY, resolveDestination(dest)); } catch (e) {}
}

export function readPendingDestination() {
  try {
    const v = localStorage.getItem(PENDING_KEY);
    return v ? resolveDestination(v) : null;
  } catch (e) { return null; }
}

export function clearPendingDestination() {
  try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
}

// Read `?next=` from a query string, if present and allowed.
export function readNextFromUrl(search) {
  try {
    const v = new URLSearchParams(search || '').get('next');
    return v ? resolveDestination(v) : null;
  } catch (e) { return null; }
}

// Where this visit should end up: an explicit `?next=`, else the destination the
// person was last heading for, else the Developers console.
export function resolveIncomingDestination(search) {
  return readNextFromUrl(search) || readPendingDestination() || DEFAULT_DESTINATION;
}
