// Payment-method semantics for every surface that shows a country's ways to
// pay: the landing page (DevPanel.js), the standalone HTML SDK, the
// dashboard's code samples and the generated checkout page.
//
// THE RULE THIS FILE EXISTS TO ENFORCE
//
// A country's payment methods are its OWN local catalogue, not the subset
// Konduyt has connected. The API returns both, and they answer two
// different questions:
//
//   intelligence.local_methods -- what payment methods exist in this
//       country, including ones Konduyt cannot execute yet. AUTHORITATIVE.
//   intelligence.options       -- which of those Konduyt can currently
//       execute and rank. An OVERLAY on the catalogue, never its source.
//
// Reading only `options` makes every country Konduyt hasn't integrated
// appear to have no way to pay at all. So: the catalogue is the base, the
// ranked option is layered on top where the same method appears in both,
// and a method is NEVER dropped for having no provider.
//
// The function bodies below are injected verbatim into the standalone HTML
// SDK (see scripts/sync-intelligence-methods.mjs). Keep them ES5 and avoid
// backticks and "${" so they can be embedded safely in a template literal.
export const INTELLIGENCE_METHODS_SOURCE = `
var KDU_STATE_LIVE = 'LIVE';
var KDU_STATE_NOT_ON_KONDUYT = 'NOT_ON_KONDUYT';
var KDU_NO_METHODS = 'No payment methods found for this country.';

// Same method, written differently across the two arrays ("M-Pesa" vs
// "MPESA", "Debit/Credit Cards" vs "DEBIT/CREDIT_CARDS"). Compare on a
// normalized key so the overlay attaches to the right catalogue entry.
function kduMethodKey(label) {
  return String(label == null ? '' : label).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function kduIsExecutable(m) {
  return !!(m && m.onKonduyt);
}

// Merge into one canonical entry per payment method.
//
// local_methods is the base because it is the complete country catalogue.
// options overlays it: a method Konduyt can execute carries its routed
// provider and price; one it cannot keeps the market figure and says so.
// Options that match no catalogue entry are still appended -- they are real
// ranked methods and dropping them would hide an executable route.
function kduMergeIntelligenceMethods(intelligence, opts) {
  intelligence = intelligence || {};
  opts = opts || {};
  var locals = intelligence.local_methods || [];
  var options = intelligence.options || [];

  var byKey = {};
  var merged = [];
  var i, key;

  for (i = 0; i < locals.length; i++) {
    var m = locals[i] || {};
    key = kduMethodKey(m.label);
    if (!key || byKey[key]) continue;
    var entry = {
      key: key,
      label: m.label,
      method: (opts.methodFromLabel && opts.methodFromLabel[m.label]) || null,
      methodType: m.method_type || null,
      provider: m.provider || null,
      onKonduyt: m.on_konduyt === true,
      feeMinor: m.fee_minor,
      feeSource: m.fee_source || null,
      feePercent: null,
      estimated: m.is_estimated === true,
      feeLow: null,
      feeHigh: null,
      source: m.source || null,
      recommended: false,
      option: null,
    };
    entry.executable = kduIsExecutable(entry);
    entry.state = entry.executable ? KDU_STATE_LIVE : KDU_STATE_NOT_ON_KONDUYT;
    byKey[key] = entry;
    merged.push(entry);
  }

  for (i = 0; i < options.length; i++) {
    var o = options[i] || {};
    key = kduMethodKey(o.label);
    var target = key ? byKey[key] : null;
    if (!target) {
      // A ranked method the country catalogue doesn't list. Keep it: it
      // exists in this response, so hiding it would lose a real route.
      target = {
        key: key || ('opt:' + i),
        label: o.label,
        method: o.method || null,
        methodType: null,
        provider: null,
        onKonduyt: false,
        feeMinor: null,
        feeSource: null,
        feePercent: null,
        estimated: false,
        feeLow: null,
        feeHigh: null,
        source: null,
        recommended: false,
        option: null,
      };
      if (key) byKey[key] = target;
      merged.push(target);
    }
    if (o.method) target.method = o.method;
    if (o.provider) target.provider = o.provider;
    target.onKonduyt = o.on_konduyt === true;
    target.executable = kduIsExecutable(target);
    target.state = target.executable ? KDU_STATE_LIVE : KDU_STATE_NOT_ON_KONDUYT;
    // The option's own price wins when it has one: it is the routed,
    // fee-source-labelled figure. Only fall back to the catalogue price when
    // the option carries none, and never turn "unknown" into zero.
    if (o.fee_minor != null) {
      target.feeMinor = o.fee_minor;
      target.feeSource = o.fee_source || (target.executable ? 'konduyt' : 'market');
      target.feePercent = o.fee_percent_effective != null ? o.fee_percent_effective : null;
    }
    if (o.estimated != null) target.estimated = o.estimated === true;
    if (o.fee_minor_low != null) target.feeLow = o.fee_minor_low;
    if (o.fee_minor_high != null) target.feeHigh = o.fee_minor_high;
    if (o.source) target.source = o.source;
    target.recommended = o.recommended === true;
    target.option = o;
  }

  for (i = 0; i < merged.length; i++) {
    merged[i].executable = kduIsExecutable(merged[i]);
    merged[i].state = merged[i].executable ? KDU_STATE_LIVE : KDU_STATE_NOT_ON_KONDUYT;
  }
  return merged;
}

// Cheapest first, unknown prices last. "value" reads the price to sort on,
// so the same comparator serves both groups.
function kduSortByCost(list, value) {
  return list.slice().sort(function (a, b) {
    var av = value(a), bv = value(b);
    var ae = av == null, be = bv == null;
    if (ae !== be) return ae ? 1 : -1;
    if (!ae && av !== bv) return av - bv;
    return 0;
  });
}

function kduFeeOf(m) {
  return m ? m.feeMinor : null;
}

// Executable methods are ranked among themselves. Unsupported methods are
// never mixed into that ranking -- a market fee the merchant cannot charge
// must not outrank a route they can.
function kduRankExecutableMethods(methods) {
  var out = [];
  for (var i = 0; i < methods.length; i++) {
    if (kduIsExecutable(methods[i])) out.push(methods[i]);
  }
  return kduSortByCost(out, kduFeeOf);
}

function kduRankUnsupportedMethods(methods) {
  var out = [];
  for (var i = 0; i < methods.length; i++) {
    if (!kduIsExecutable(methods[i])) out.push(methods[i]);
  }
  return kduSortByCost(out, kduFeeOf);
}

// Best value means the cheapest route the merchant can actually charge --
// never the cheapest method in the country's whole market. The API's own
// "recommended" flag is used when present; otherwise the cheapest priced
// executable method. Unsupported methods are never eligible.
function kduBestValueMethod(methods) {
  var exec = kduRankExecutableMethods(methods);
  if (!exec.length) return null;
  for (var i = 0; i < exec.length; i++) {
    if (exec[i].recommended && exec[i].feeMinor != null) return exec[i];
  }
  for (var j = 0; j < exec.length; j++) {
    if (exec[j].feeMinor != null) return exec[j];
  }
  return null;
}

// Full display order: executable first (ranked), unsupported after. The two
// groups stay distinct so the UI can make the difference obvious, and it
// never claims a country has no methods while its catalogue is populated.
function kduOrderedMethods(methods) {
  return kduRankExecutableMethods(methods).concat(kduRankUnsupportedMethods(methods));
}

// Empty only when BOTH arrays are empty. "Nothing ranked" is not "nothing
// exists" -- a country full of local methods Konduyt can't route yet has
// plenty to show, and saying otherwise is the bug this file fixes.
function kduHasAnyMethod(methods) {
  return !!(methods && methods.length);
}

function kduEmptyStateMessage(methods) {
  return kduHasAnyMethod(methods) ? '' : KDU_NO_METHODS;
}

function kduFeeLabel(m) {
  if (!m || m.feeMinor == null) return null;
  return m.feeSource === 'konduyt' ? 'fee' : 'Market fee';
}
`;

const impl = (() => {
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    INTELLIGENCE_METHODS_SOURCE +
    '\nreturn { kduMethodKey: kduMethodKey,' +
    ' kduMergeIntelligenceMethods: kduMergeIntelligenceMethods,' +
    ' kduRankExecutableMethods: kduRankExecutableMethods,' +
    ' kduRankUnsupportedMethods: kduRankUnsupportedMethods,' +
    ' kduBestValueMethod: kduBestValueMethod,' +
    ' kduOrderedMethods: kduOrderedMethods,' +
    ' kduEmptyStateMessage: kduEmptyStateMessage,' +
    ' kduHasAnyMethod: kduHasAnyMethod,' +
    ' kduFeeLabel: kduFeeLabel,' +
    ' KDU_STATE_LIVE: KDU_STATE_LIVE,' +
    ' KDU_STATE_NOT_ON_KONDUYT: KDU_STATE_NOT_ON_KONDUYT,' +
    ' KDU_NO_METHODS: KDU_NO_METHODS };'
  );
  return factory();
})();

export const methodKey = impl.kduMethodKey;
export const mergeIntelligenceMethods = impl.kduMergeIntelligenceMethods;
export const rankExecutableMethods = impl.kduRankExecutableMethods;
export const rankUnsupportedMethods = impl.kduRankUnsupportedMethods;
export const bestValueMethod = impl.kduBestValueMethod;
export const orderedMethods = impl.kduOrderedMethods;
export const emptyStateMessage = impl.kduEmptyStateMessage;
export const hasAnyMethod = impl.kduHasAnyMethod;
export const feeLabel = impl.kduFeeLabel;
export const STATE_LIVE = impl.KDU_STATE_LIVE;
export const STATE_NOT_ON_KONDUYT = impl.KDU_STATE_NOT_ON_KONDUYT;
export const NO_METHODS_MESSAGE = impl.KDU_NO_METHODS;