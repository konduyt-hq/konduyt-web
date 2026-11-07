'use client';

// One place that decides where a signed-in visitor lands, shared by signup,
// sign-in and the OAuth return.
//
// Konduyt has ONE account and three products, so "which product" is a
// destination choice, not a second account. The chosen product travels with the
// person through the auth round trip as a validated path, rather than being
// guessed after the fact -- which is what used to drop every creator into the
// Developers console.

export const PRODUCTS = {
  developers: {
    id: 'developers',
    label: 'Konduyt for Developers & Businesses',
    short: 'Developers & Businesses',
    destination: '/dashboard/',
  },
  creators: {
    id: 'creators',
    label: 'Konduyt for Creators',
    short: 'Creators',
    destination: '/creators/ideas/',
  },
};

export const DEFAULT_DESTINATION = PRODUCTS.developers.destination;

// The only paths a `next` value may resolve to. An allow-list, not a prefix
// check: an open redirect would let a crafted link send a freshly signed-in
// person anywhere, including off-site.
const ALLOWED = new Set([
  PRODUCTS.developers.destination,
  PRODUCTS.creators.destination,
  '/creators/',
]);

export function resolveDestination(next) {
  if (typeof next !== 'string' || !next) return DEFAULT_DESTINATION;
  return ALLOWED.has(next) ? next : DEFAULT_DESTINATION;
}

export function productForDestination(dest) {
  const d = resolveDestination(dest);
  return d === PRODUCTS.developers.destination ? PRODUCTS.developers : PRODUCTS.creators;
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

// Where this visit should end up: an explicit `?next=`, else the product the
// person was last heading for, else the Developers console (the historical
// default, so existing behaviour is unchanged when nothing was chosen).
export function resolveIncomingDestination(search) {
  return readNextFromUrl(search) || readPendingDestination() || DEFAULT_DESTINATION;
}
