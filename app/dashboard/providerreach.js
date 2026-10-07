// How a connected provider actually reaches a market.
//
// The dashboard has one check that matters for "can this project take money
// here": does a connected provider have VERIFIED capability for this country's
// own LOCAL payment methods? That check is correct, but the message built on
// it was not — with PayPal connected it still read "no connected provider
// covers Kenya", which is confusing, because PayPal is a real provider the
// developer did connect.
//
// The distinction that was missing: a provider reaches a country either
//
//   LOCAL   — it is catalogued for that country and carries its local rails
//             (Flutterwave/Paystack in Kenya: cards, M-Pesa, bank transfer), or
//   GLOBAL  — it is a global method with no country-specific rails behind it
//             (PayPal, a wallet: the same account, catalogued "Global").
//
// Both are real. They are not the same, and a global method does not fill a
// local-method gap. This module classifies from data the dashboard already
// holds — the catalog entry's countries and its capability categories — never
// from a hardcoded provider list, so a new global provider classifies itself.

export const LOCAL = 'local';
export const GLOBAL_REACH = 'global';

const GLOBAL_PLACEHOLDER = 'Global';

export function isGlobalPlaceholder(country) {
  return (country?.name || country?.code || '') === GLOBAL_PLACEHOLDER;
}

// One provider catalog entry (as returned by /connectors or /connectors/top)
// against one country code. Returns LOCAL, GLOBAL_REACH, or null when the
// provider is catalogued only for other countries and offers no global method
// — i.e. genuinely absent from this market.
export function providerReach(provider, countryCode) {
  const countries = provider?.countries || [];
  const inCountry = !!countryCode && countries.some((c) => c?.code === countryCode);
  if (inCountry) return LOCAL;
  const globalPlaceholder = countries.some(isGlobalPlaceholder);
  const hasWallet = (provider?.capabilities || []).some((c) => c?.category === 'wallets');
  if (globalPlaceholder || hasWallet) return GLOBAL_REACH;
  return null;
}

// Classify a set of catalog entries at once. `byId` lets a caller look a
// single provider up without re-scanning the list.
export function classifyProviders(list, countryCode) {
  const local = [];
  const globalReach = [];
  const absent = [];
  const byId = {};
  for (const p of list || []) {
    const reach = providerReach(p, countryCode);
    byId[p.id] = reach;
    if (reach === LOCAL) local.push(p);
    else if (reach === GLOBAL_REACH) globalReach.push(p);
    else absent.push(p);
  }
  return { local, globalReach, absent, byId };
}

// The connected accounts, resolved to their catalog entries and classified.
export function connectedReach(accounts, catalog, countryCode) {
  const entries = (accounts || [])
    .map((a) => (catalog || []).find((p) => p.id === a.provider_id))
    .filter(Boolean);
  return classifyProviders(entries, countryCode);
}

// "PayPal", "PayPal and Wise", "A, B, and C" — reads as a sentence, no Oxford
// comma guesswork left to the caller.
export function joinNames(names) {
  const n = (names || []).filter(Boolean);
  if (n.length === 0) return '';
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n.slice(0, -1).join(', ')}, and ${n[n.length - 1]}`;
}
