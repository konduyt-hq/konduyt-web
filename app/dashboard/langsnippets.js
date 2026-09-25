// Code snippets for creating a payment through Konduyt, per language.
//
// SHOW, DON'T TELL: each snippet reads the secret key from an ENVIRONMENT
// VARIABLE (KONDUYT_SECRET_KEY) the way that language does it — never pasted
// inline. Where to actually SET that variable is covered once, in the shared
// "Where does my secret key go?" panel above these snippets (your hosting
// platform's environment variables -- Render, Vercel, Railway, and so on --
// not a .env file), rather than repeated per-language here. Platform
// languages (Android/iOS) call the developer's OWN backend, never Konduyt
// directly -- there is no safe way to hold a secret key on a device.
// {{API}} is replaced at render time with the API base URL.
//
// Deliberately just the one scenario -- the thing the large majority of
// merchants actually need on day one:
//   - One-time purchase -- POST /v1/payments. Shows BOTH ways an amount
//     can come from: a shopper typing it in (a donation), and a fixed
//     price you already know (a product) -- the same amount variable
//     either way, just where it comes from differs.
// Recurring subscriptions (/v1/payment_sessions), split payments
// (/v1/marketplace_payments) and usage-based billing are real, separate
// Konduyt capabilities -- just not shown here, to keep the first thing a
// developer reads as small as possible.
//
// Everything else (wiring the Buy button, failover/rerouting, cross-border
// eligibility) is a separate, real concern of its own -- not about the
// scenario above -- so it stays as its own section.

export const LANG_SNIPPETS = [
  {
    id: 'curl', label: 'cURL', icon: 'curl',
    sections: [
      { title: 'One-time purchase', code:
`# amount either comes from the shopper (a donation input) or is a price
# you already know (a product) -- same field either way:
AMOUNT=1000            # a fixed price you already know, OR
# AMOUNT=$SHOPPER_INPUT  # whatever the shopper typed into a donation field

# $KONDUYT_SECRET_KEY is set as an environment variable on your server/host --
# see "Where does my secret key go?" above, never pasted into a command directly.
#
# customer.phone is optional but recommended for mobile money -- it's what
# receives the STK push. Pass it if you already have it (from your own
# signup/account system); if you don't yet and the customer types it in,
# Konduyt remembers it after this first payment (keyed to customer.email),
# so you don't need to collect or pass it again on their next purchase.
curl -X POST {{API}}/v1/payments \\
  -H "Authorization: Bearer $KONDUYT_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"amount\\": $AMOUNT,
    \\"currency\\": \\"KES\\",
    \\"method\\": \\"mpesa\\",
    \\"customer\\": { \\"email\\": \\"customer@example.com\\", \\"phone\\": \\"0722123456\\" }
  }"` },
            { title: 'Failover + rerouting', code:
`# "method", not "provider" -- this is what triggers real failover: Konduyt
# tries every provider configured for mpesa, in order, stopping on success
# or on a genuinely unsafe/ambiguous outcome. Never guessed, never a blind
# retry.
curl -X POST {{API}}/v1/payments \\
  -H "Authorization: Bearer $KONDUYT_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 500000,
    "currency": "KES",
    "method": "mpesa"
  }'
# Returns {"id": "pay_...", ...}

# Fetch it back to see the real attempt history -- which provider(s) were
# tried, in what order, and why:
curl {{API}}/v1/payments/pay_xxx \\
  -H "Authorization: Bearer $KONDUYT_SECRET_KEY"
# routing_attempts: [{ attempt_number, provider, outcome, fallback_class }, ...]` },
      { title: 'Cross-border payment', code:
`# The only thing that varies per shopper: customer_country. Same real
# eligibility engine Konduyt.checkout() uses internally -- never a fixed
# list. Public endpoint, publishable key only -- safe to call directly,
# even from a browser.
curl "{{API}}/checkout/config?pk=$KONDUYT_PUBLISHABLE_KEY&amount=500000&currency=KES&customer_country=GB"
# Swap customer_country (GB, NG, US, ...) and the real eligible methods
# list changes -- never hardcoded to your own market.` },
    ],
  },
  {
    id: 'js', label: 'JavaScript', icon: 'js',
    sections: [
      { title: 'Dependency', code:
`npm install express   # only the route sample below needs it; the API calls use built-in fetch` },
      { title: 'One-time purchase', code:
`// Runs server-side (Node). The key is read from the environment — never
// hardcoded, never sent to the browser.
const KONDUYT_SECRET_KEY = process.env.KONDUYT_SECRET_KEY;

// phone is optional but recommended for mobile money -- it's what
// receives the STK push. Pass it if you already have it; if you don't
// and the customer types it in, Konduyt remembers it after this first
// payment (keyed to email), so you don't need to collect or pass it
// again on their next purchase.
async function createPayment({ amount, email, phone, method = "mpesa" }) {
  // A non-JSON or failed upstream response (Konduyt down, a network
  // blip, a malformed key) must never crash the route with a raw,
  // unhandled 500 -- res.json() below always gets a real object either
  // way, same as this file's own konduyt() helper already does for
  // every other language's samples.
  try {
    const res = await fetch("{{API}}/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${KONDUYT_SECRET_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency: "KES", method, customer: { email, phone } }),
    });
    return await res.json();
  } catch (e) {
    return { error: "backend_error", message: e.message };
  }
}

// amount either comes from the shopper, or is a price you already know:
const amount = Number(req.body.amount);   // whatever the shopper typed in (a donation)
// const amount = selectedItem.price;      // a fixed price you already know (a product)
const payment = await createPayment({ amount, email: req.body.email, phone: req.body.phone });
// res.redirect(payment.authorization_url);` },
      { title: "checkout-page.html's own click handler", code:
`// This is real, existing code -- not something to write. It already
// lives inside checkout-page.html's own <script> tag (Step 2 above) --
// shown here as its own piece so it's not missed while looking at
// backend code. It calls getElementById on the frontend's own real
// ids (payButton, railRows, emailInput, confirmButton, ...), and is
// what actually calls the /api/create-payment route the rest of this
// tab implements.
// >>> konduyt-checkout-handler (generated) >>>
var AMOUNT_MINOR = 500000; // KES 5,000.00 -- the REFERENCE price; the
// real, displayed currency/amount always come from the backend's own
// response (payment.currency / payment.amount), never assumed here.
var CURRENCY = 'KES'; // default only -- overwritten below with whatever the backend actually used
var chosenProvider = null;

// >>> konduyt-intelligence-methods (generated) >>>
var KDU_STATE_LIVE = 'LIVE';
var KDU_STATE_NOT_ON_KONDUYT = 'NOT_ON_KONDUYT';
var KDU_NO_METHODS = 'No payment methods found for this country.';

// Same method, written differently across the two arrays ("M-Pesa" vs
// "MPESA", "Debit/Credit Cards" vs "DEBIT/CREDIT_CARDS"). Compare on a
// normalized key so the overlay attaches to the right catalogue entry.
function kduMethodKey(label) {
  return String(label == null ? '' : label).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// The join key for one array entry. Prefer the API's stable method_id: it is
// the same string in both arrays for the same method, so the overlay cannot
// miss because a label was spelled or punctuated differently. The normalized
// label remains the fallback for older responses that carry no method_id.
function kduEntryKey(entry, fallback) {
  var id = entry && entry.method_id;
  return id ? ('id:' + id) : fallback;
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
    key = kduEntryKey(m, kduMethodKey(m.label));
    if (!key || byKey[key]) continue;
    var entry = {
      key: key,
      methodId: m.method_id || null,
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
    key = kduEntryKey(o, kduMethodKey(o.label));
    var target = key ? byKey[key] : null;
    if (!target) {
      // A ranked method the country catalogue doesn't list. Keep it: it
      // exists in this response, so hiding it would lose a real route.
      target = {
        key: key || ('opt:' + i),
        methodId: o.method_id || null,
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
// <<< konduyt-intelligence-methods (generated) <<<

var mergeIntelligenceMethods = kduMergeIntelligenceMethods;
var orderMethods = kduOrderedMethods;
var bestValueMethod = kduBestValueMethod;
var emptyStateMessage = kduEmptyStateMessage;

// The phone number (with its real country code) has to be filled in
// before Pay is even clickable -- Konduyt needs it to know which
// country's real rail catalogue to rank against.
var countryCodeEl = document.getElementById('countryCode');
var phoneInputEl = document.getElementById('phoneInput');
var payButtonEl = document.getElementById('payButton');

// Required national-number length per country, so Pay enables only once
// the number is the right length for the country selected -- not merely
// "long enough". These are the same real lengths the backend's own
// carrier detection uses (app/routing/carrier_detection.py). A country
// absent from this table falls back to a generic E.164 band rather than
// a guessed per-country length.
var NATIONAL_LENGTHS = { KE: 9, TZ: 9, GH: 9, UG: 9, RW: 9, ZM: 9, CI: 10, SN: 9, CM: 9 };
var FALLBACK_MIN_DIGITS = 6;
var MAX_DIGITS = 15; // E.164 maximum

var phoneHintEl = document.getElementById('phoneHint');

function digitsOnly(v) { return (v || '').replace(/\\D/g, ''); }

function expectedDigits() {
  var iso = countryCodeEl.selectedOptions[0].getAttribute('data-iso');
  return NATIONAL_LENGTHS[iso] || null;
}

function updatePayButtonState() {
  // Strip anything that isn't a digit, so a letter can never be typed
  // or pasted into the field.
  var expected = expectedDigits();
  phoneInputEl.maxLength = expected || MAX_DIGITS;

  // Strip non-digits, then cap to the length this country allows.
  // maxlength alone only constrains user typing/pasting, so the cap is
  // applied here too and held in one place.
  var digits = digitsOnly(phoneInputEl.value).slice(0, expected || MAX_DIGITS);
  if (digits !== phoneInputEl.value) phoneInputEl.value = digits;

  var ok = expected ? digits.length === expected
                    : (digits.length >= FALLBACK_MIN_DIGITS && digits.length <= MAX_DIGITS);
  payButtonEl.disabled = !ok;

  if (!digits.length || ok) {
    phoneHintEl.style.display = 'none';
  } else {
    phoneHintEl.style.display = 'block';
    phoneHintEl.textContent = expected
      ? 'Enter all ' + expected + ' digits of your number (' + digits.length + ' so far).'
      : 'Enter at least ' + FALLBACK_MIN_DIGITS + ' digits.';
  }
}
phoneInputEl.addEventListener('input', updatePayButtonState);
// Changing country changes the required length, so re-check.
countryCodeEl.addEventListener('change', updatePayButtonState);
updatePayButtonState();

payButtonEl.addEventListener('click', function () {
  var btn = payButtonEl;
  btn.disabled = true;
  btn.textContent = 'Loading…';

  var iso = countryCodeEl.selectedOptions[0].getAttribute('data-iso');

  // The real, public intelligence endpoint -- no key, no backend of
  // your own needed for this step. Same one DevPanel.js's own
  // "Test before you sign up" button calls. country: an explicit
  // value is honored by the real backend (mainly useful for testing,
  // per that endpoint's own docstring) -- derived here from the
  // phone number's own real country code, not guessed.
  fetch('https://konduyt-api.onrender.com/v1/demo/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: AMOUNT_MINOR, currency: 'KES', country: iso })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      // The real currency this response actually used -- e.g. USD for
      // a US number -- not assumed, read directly from what the
      // backend computed. Every fee shown below is already IN this
      // currency: the real backend converts each rail's own fee into
      // it before this response is even sent, not left to the
      // frontend to guess an exchange rate.
      CURRENCY = (data.payment && data.payment.currency) || 'KES';

      // The real, converted reference price -- e.g. KES 5,000.00
      // converted into its real USD equivalent for a US shopper, not
      // relabeled as if $5,000 were the original price.
      var subEl = document.getElementById('intelModalSub');
      if (subEl && data.payment && typeof data.payment.amount === 'number') {
        subEl.textContent = 'Every way this customer could pay, converted into ' + CURRENCY + ' (' + fmt(data.payment.amount) + ').';
      }

      var repNote = document.getElementById('repNote');
      if (data.is_representative_example) {
        // Real and honest, not hidden: Konduyt doesn't have sourced
        // rail data for every country yet (Kenya's catalogue is the
        // most complete today). When that's true for the selected
        // country, the backend says so directly
        // (is_representative_example) rather than silently showing
        // Kenya-only methods as if they were genuinely available
        // wherever the customer is.
        repNote.textContent = 'Estimate based on Kenya connected-provider rates, converted to ' + CURRENCY + '.';

        repNote.style.display = 'block';
      } else {
        repNote.style.display = 'none';
      }

      // The country's OWN catalogue is the list of ways to pay here --
      // including methods Konduyt cannot execute yet. The ranked
      // options are layered on top of it, not used instead of it;
      // reading only "options" is what made every unintegrated country
      // look like it had no payment methods at all.
      renderMethods(mergeIntelligenceMethods(data.intelligence || {}));
      document.getElementById('intelOverlay').classList.add('open');
    })
    .catch(function () {
      document.getElementById('intelOverlay').classList.add('open');
      document.getElementById('railRows').innerHTML =
        '<tr><td colspan="2">Could not reach the intelligence endpoint. Try again.</td></tr>';
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Pay';
    });
});

document.getElementById('intelClose').addEventListener('click', function () {
  document.getElementById('intelOverlay').classList.remove('open');
  document.getElementById('checkout').classList.remove('open');
});
document.getElementById('intelOverlay').addEventListener('click', function (e) {
  if (e.target === this) {
    this.classList.remove('open');
    document.getElementById('checkout').classList.remove('open');
  }
});

function renderMethods(methods) {
  var ordered = orderMethods(methods);
  var best = bestValueMethod(methods);
  var rows = '';
  for (var i = 0; i < ordered.length; i++) {
    var m = ordered[i];
    var isBest = best != null && m.key === best.key;
    // Only a method Konduyt can actually charge gets a Pay action. An
    // unsupported one is real and worth showing, but it is not payable,
    // so it is never clickable -- offering a button that cannot work
    // would be the dishonest half of the bug this fixes.
    var action = m.executable
      ? '<button type="button" class="rail-pay" data-key="' + m.key + '">Pay</button>'
      : '<span class="rail-unsupported">NOT ON KONDUYT YET</span>';
    var fee;
    if (m.estimated && m.feeLow != null && m.feeHigh != null) {
      fee = fmt(m.feeLow) + '\u2013' + fmt(m.feeHigh);
    } else if (m.feeMinor != null) {
      fee = fmt(m.feeMinor);
    } else {
      fee = '\u2014';
    }
    var feeNote = '';
    if (m.feeMinor != null && m.feeSource !== 'konduyt') {
      feeNote = '<span class="rail-fee-note">Market fee</span>';
    }
    // "estimated" describes the FEE, never the payment method, so it
    // belongs on the fee and not next to the name. A method's name is
    // its name -- qualifying it reads as though the method itself were
    // somehow provisional.
    var estNote = m.estimated ? '<span class="rail-fee-note">estimated</span>' : '';
    rows += '<tr class="rail' + (m.executable ? ' rail-executable' : ' rail-unsupported') + (isBest ? ' best' : '') + '" data-key="' + m.key + '">' +
      '<td><span class="rail-name">' + m.label + '</span>' +
      (isBest ? '<span class="badge">Best value</span>' : '') + '</td>' +
      '<td class="rail-fee">' + fee + estNote + feeNote + '</td>' +
      '<td class="rail-action">' + action + '</td></tr>';
  }

  // Nothing at all here means the country genuinely has no catalogue --
  // never the message shown while real local methods exist.
  document.getElementById('railRows').innerHTML = rows ||
    '<tr><td colspan="3">' + emptyStateMessage(methods) + '</td></tr>';

  var buttons = document.querySelectorAll('#railRows button.rail-pay');
  for (var j = 0; j < buttons.length; j++) {
    buttons[j].addEventListener('click', function (e) {
      e.stopPropagation();
      var key = this.getAttribute('data-key');
      var picked = null;
      for (var k = 0; k < ordered.length; k++) {
        if (ordered[k].key === key) { picked = ordered[k]; break; }
      }
      if (!picked || !picked.executable) return;
      chosenProvider = picked.method || picked.provider;
      document.getElementById('chosenRail').textContent = picked.label;
      document.getElementById('checkout').classList.add('open');
    });
  }
}

function fmt(minor) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY }).format(minor / 100); }
  catch (e) { return CURRENCY + ' ' + (minor / 100).toFixed(2); }
}

// The actual charge -- YOUR OWN backend, never Konduyt directly. Same
// pattern as every backend language tab: the frontend never holds a
// secret key, only your server does.
document.getElementById('confirmButton').addEventListener('click', function () {
  var btn = document.getElementById('confirmButton');
  var resultDiv = document.getElementById('resultDiv');
  var email = document.getElementById('emailInput').value;
  var phone = countryCodeEl.value + phoneInputEl.value.replace(/\\D/g, '');

  btn.disabled = true;
  btn.textContent = 'Processing…';
  resultDiv.textContent = '';

  fetch('http://localhost:3000/api/create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: AMOUNT_MINOR, email: email, phone: phone, provider: chosenProvider })
  })
    .then(function (r) { return r.json(); })
    .then(function (payment) {
      resultDiv.textContent = JSON.stringify(payment);
    })
    .catch(function () {
      resultDiv.textContent = 'Could not reach your backend at localhost:3000 -- is it running?';
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = 'Confirm — Pay';
    });
});
// <<< konduyt-checkout-handler (generated) <<<
  ` },
      { title: 'Wire it to the Buy button (checkout-page.html)', code:
`// checkout-page.html's own real markup (Step 2 above), verbatim:
//   <input id="emailInput" type="email" ... />
//   <button id="confirmButton" ...>Confirm — Pay</button>
// its click handler POSTs { amount, email } to exactly this route.
// Express shown here; any Node framework (Fastify, Koa, raw http)
// mounts the same way.
import express from "express";
const app = express();
app.use(express.json());

// checkout-page.html is served from a different origin than this server
// (a real file, or konduyt.dev itself) -- without this, the browser
// blocks every request before it ever reaches these routes,
// indistinguishable from "the server isn't running" even when it is.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.post("/api/create-payment", async (req, res) => {
  const payment = await createPayment({ amount: req.body.amount, email: req.body.email });
  res.json(payment);
});


app.listen(3000, () => console.log("Backend running on http://localhost:3000"));` },
            { title: 'Failover + rerouting', code:
`// "method", not "provider" -- this is what triggers real failover: Konduyt
// tries every provider configured for this method, in order, stopping on
// success or on a genuinely unsafe/ambiguous outcome. Never guessed, never
// a blind retry.
async function createPaymentWithFailover({ amount, email }) {
  const res = await fetch("{{API}}/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${KONDUYT_SECRET_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "KES", method: "mpesa", customer: { email } }),
  });
  const payment = await res.json();

  // Fetch it back to see the real attempt history -- which provider(s)
  // were tried, in what order, and why.
  const check = await fetch(\`{{API}}/v1/payments/\${payment.id}\`, {
    headers: { "Authorization": \`Bearer \${KONDUYT_SECRET_KEY}\` },
  });
  return check.json();
  // .routing_attempts: [{ attempt_number, provider, outcome, fallback_class }, ...]
}` },
      { title: 'Cross-border payment', code:
`// The only thing that varies per shopper: customer_country. Same real
// eligibility engine Konduyt.checkout() uses internally -- never a fixed
// list. Public endpoint, publishable key only -- safe to call directly,
// even from a browser.
const KONDUYT_PUBLISHABLE_KEY = process.env.KONDUYT_PUBLISHABLE_KEY;

async function eligibleMethodsFor(customerCountry) {
  const res = await fetch(
    \`{{API}}/checkout/config?pk=\${KONDUYT_PUBLISHABLE_KEY}&amount=500000&currency=KES&customer_country=\${customerCountry}\`
  );
  const config = await res.json();
  return config.methods; // the real eligible list for THIS shopper, never hardcoded
}` },
    ],
  },
  {
    id: 'python', label: 'Python', icon: 'python',
    sections: [
      { title: 'Dependency', code:
`pip install flask requests   # flask serves the route below; requests calls Konduyt` },
      { title: 'One-time purchase', code:
`import os
import requests

# Read the key from the environment — never hardcode it.
KONDUYT_SECRET_KEY = os.environ["KONDUYT_SECRET_KEY"]

# phone is optional but recommended for mobile money -- it's what
# receives the STK push. Pass it if you already have it; if you don't
# and the customer types it in, Konduyt remembers it after this first
# payment (keyed to email), so you don't need to collect or pass it
# again on their next purchase.
def create_payment(amount, email, phone=None, method="mpesa"):
    res = requests.post(
        "{{API}}/v1/payments",
        headers={"Authorization": f"Bearer {KONDUYT_SECRET_KEY}"},
        json={
            "amount": amount,
            "currency": "KES",
            "method": method,
            "customer": {"email": email, "phone": phone},
        },
    )
    return res.json()

# amount either comes from the shopper, or is a price you already know:
amount = int(request.form["amount"])   # whatever the shopper typed in (a donation)
# amount = selected_item.price          # a fixed price you already know (a product)
payment = create_payment(amount, request.form["email"], request.form.get("phone"))` },
      { title: 'Wire it to the Buy button (checkout-page.html)', code:
`# checkout-page.html's own real markup (Step 2 above), verbatim:
#   <input id="emailInput" type="email" ... />
#   <button id="confirmButton" ...>Confirm — Pay</button>
# its click handler POSTs { amount, email } to exactly this route.
# Flask shown
# here; FastAPI/Django mount the same route the same way.
from flask import Flask, request, jsonify
app = Flask(__name__)

# checkout-page.html is served from a different origin than this server
# (a real file, or konduyt.dev itself) -- without this, the browser
# blocks every request before it ever reaches these routes,
# indistinguishable from "the server isn't running" even when it is.
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response

@app.route("/api/create-payment", methods=["POST", "OPTIONS"])
def handle_create_payment():
    if request.method == "OPTIONS":
        return "", 204
    body = request.get_json()
    payment = create_payment(body["amount"], body["email"])
    return jsonify(payment)


if __name__ == "__main__":
    # Print first: app.run() blocks, so a print after it would never fire.
    print("Backend running on http://localhost:3000")
    app.run(port=3000)` },
            { title: 'Failover + rerouting', code:
`# "method", not "provider" -- this is what triggers real failover: Konduyt
# tries every provider configured for this method, in order, stopping on
# success or on a genuinely unsafe/ambiguous outcome. Never guessed, never
# a blind retry.
def create_payment_with_failover(amount, email):
    res = requests.post(
        "{{API}}/v1/payments",
        headers={"Authorization": f"Bearer {KONDUYT_SECRET_KEY}"},
        json={"amount": amount, "currency": "KES", "method": "mpesa",
              "customer": {"email": email}},
    )
    payment = res.json()

    # Fetch it back to see the real attempt history -- which provider(s)
    # were tried, in what order, and why.
    check = requests.get(
        f"{{API}}/v1/payments/{payment['id']}",
        headers={"Authorization": f"Bearer {KONDUYT_SECRET_KEY}"},
    )
    return check.json()
    # ["routing_attempts"]: [{"attempt_number", "provider", "outcome", "fallback_class"}, ...]` },
      { title: 'Cross-border payment', code:
`# The only thing that varies per shopper: customer_country. Same real
# eligibility engine Konduyt.checkout() uses internally -- never a fixed
# list. Public endpoint, publishable key only -- safe to call directly,
# even from a browser.
KONDUYT_PUBLISHABLE_KEY = os.environ["KONDUYT_PUBLISHABLE_KEY"]

def eligible_methods_for(customer_country):
    res = requests.get(
        "{{API}}/checkout/config",
        params={"pk": KONDUYT_PUBLISHABLE_KEY, "amount": 500000, "currency": "KES",
               "customer_country": customer_country},
    )
    return res.json()["methods"]  # the real eligible list for THIS shopper, never hardcoded` },
    ],
  },
  {
    id: 'php', label: 'PHP', icon: 'php',
    sections: [
      { title: 'One-time purchase', code:
`<?php
// Read the key from the environment — never hardcode it.
$secret = getenv("KONDUYT_SECRET_KEY");

// $phone is optional but recommended for mobile money -- it's what
// receives the STK push. Pass it if you already have it; if you don't
// and the customer types it in, Konduyt remembers it after this first
// payment (keyed to $email), so you don't need to collect or pass it
// again on their next purchase.
function create_payment($secret, $amount, $email, $phone = null, $method = "mpesa") {
    $ch = curl_init("{{API}}/v1/payments");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $secret,
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            "amount" => $amount,
            "currency" => "KES",
            "method" => $method,
            "customer" => ["email" => $email, "phone" => $phone],
        ]),
    ]);
    $payment = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $payment;
}

// amount either comes from the shopper, or is a price you already know:
$amount = (int) $_POST["amount"];       // whatever the shopper typed in (a donation)
// $amount = $selectedItem["price"];    // a fixed price you already know (a product)
$payment = create_payment($secret, $amount, $_POST["email"], $_POST["phone"] ?? null);` },
      { title: 'Wire it to the Buy button (checkout-page.html)', code:
`// ---- api/create-payment.php ----
<?php
// checkout-page.html's own real markup (Step 2 above), verbatim:
//   <input id="emailInput" type="email" ... />
//   <button id="confirmButton" ...>Confirm — Pay</button>
// its click handler POSTs { amount, email } to exactly this route.
// No framework
// needed: PHP's built-in server routes by file/path natively.
// Save as api/create-payment.php, run: php -S localhost:3000
header("Content-Type: application/json");
// checkout-page.html is served from a different origin than this server
// (a real file, or konduyt.dev itself) -- without these, the browser
// blocks every request before it ever reaches this code, indistinguishable
// from "the server isn't running" even when it is. Same three headers
// belong at the top of every file under api/, including the one below.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") { http_response_code(204); exit; }

$body = json_decode(file_get_contents("php://input"), true);
echo json_encode(create_payment($secret, (int) $body["amount"], $body["email"]));
` },
            { title: 'Failover + rerouting', code:
`<?php
// "method", not "provider" -- this is what triggers real failover: Konduyt
// tries every provider configured for this method, in order, stopping on
// success or on a genuinely unsafe/ambiguous outcome. Never guessed, never
// a blind retry.
function create_payment_with_failover($secret, $amount, $email) {
    $ch = curl_init("{{API}}/v1/payments");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $secret,
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            "amount" => $amount, "currency" => "KES", "method" => "mpesa",
            "customer" => ["email" => $email],
        ]),
    ]);
    $payment = json_decode(curl_exec($ch), true);
    curl_close($ch);

    // Fetch it back to see the real attempt history -- which provider(s)
    // were tried, in what order, and why.
    $ch2 = curl_init("{{API}}/v1/payments/" . $payment["id"]);
    curl_setopt_array($ch2, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer " . $secret],
    ]);
    $result = json_decode(curl_exec($ch2), true);
    curl_close($ch2);
    return $result;
    // ["routing_attempts"]: [["attempt_number", "provider", "outcome", "fallback_class"], ...]
}` },
      { title: 'Cross-border payment', code:
`<?php
// The only thing that varies per shopper: customer_country. Same real
// eligibility engine Konduyt.checkout() uses internally -- never a fixed
// list. Public endpoint, publishable key only -- safe to call directly,
// even from a browser.
$publishable = getenv("KONDUYT_PUBLISHABLE_KEY");

function eligible_methods_for($publishable, $customerCountry) {
    $url = "{{API}}/checkout/config?" . http_build_query([
        "pk" => $publishable, "amount" => 500000, "currency" => "KES",
        "customer_country" => $customerCountry,
    ]);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $config = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $config["methods"]; // the real eligible list for THIS shopper, never hardcoded
}` },
    ],
  },
  {
    id: 'go', label: 'Go', icon: 'go',
    sections: [
      { title: 'One-time purchase', code:
`package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
)

// Read the key from the environment — never hardcode it.
var konduytSecret = os.Getenv("KONDUYT_SECRET_KEY")

// phone is optional but recommended for mobile money -- it's what
// receives the STK push. Pass it if you already have it; if you don't
// and the customer types it in, Konduyt remembers it after this first
// payment (keyed to email), so you don't need to collect or pass it
// again on their next purchase.
func createPayment(amount int, email, phone string) (map[string]any, error) {
	body, _ := json.Marshal(map[string]any{
		"amount":   amount,
		"currency": "KES",
		"method":   "mpesa",
		"customer": map[string]string{"email": email, "phone": phone},
	})

	req, _ := http.NewRequest("POST", "{{API}}/v1/payments", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+konduytSecret)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var payment map[string]any
	json.NewDecoder(res.Body).Decode(&payment)
	return payment, nil
}

// The shopper types the amount themselves -- a donation, a tip, a
// "pay what you want" field. Comes straight from the request body,
// not something you set.
func handleDonation(w http.ResponseWriter, r *http.Request) {
	var in struct{ Amount int; Email, Phone string }
	json.NewDecoder(r.Body).Decode(&in)
	payment, _ := createPayment(in.Amount, in.Email, in.Phone) // whatever the shopper typed in
	json.NewEncoder(w).Encode(payment)
}` },
      { title: 'Wire it to the Buy button (checkout-page.html)', code:
`// checkout-page.html's own real markup (Step 2 above), verbatim:
//   <input id="emailInput" type="email" ... />
//   <button id="confirmButton" ...>Confirm — Pay</button>
// its click handler POSTs { amount, email } to exactly this route.
// net/http shown
// here (no framework needed); Gin/Echo mount the same route the same way.
func main() {
	// checkout-page.html is served from a different origin than this server
	// (a real file, or konduyt.dev itself) -- without these, the browser
	// blocks every request before it ever reaches these routes,
	// indistinguishable from "the server isn't running" even when it is.
	cors := func(w http.ResponseWriter, r *http.Request) bool {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return true
		}
		return false
	}

	http.HandleFunc("/api/create-payment", func(w http.ResponseWriter, r *http.Request) {
		if cors(w, r) {
			return
		}
		var in struct {
			Amount int    ` + "`json:\"amount\"`" + `
			Email  string ` + "`json:\"email\"`" + `
			Phone  string ` + "`json:\"phone\"`" + `
		}
		json.NewDecoder(r.Body).Decode(&in)
		payment, _ := createPayment(in.Amount, in.Email, in.Phone)
		json.NewEncoder(w).Encode(payment)
	})


	fmt.Println("Backend running on http://localhost:3000")
	http.ListenAndServe(":3000", nil)
}` },
            { title: 'Failover + rerouting', code:
`// "method", not "provider" -- this is what triggers real failover: Konduyt
// tries every provider configured for this method, in order, stopping on
// success or on a genuinely unsafe/ambiguous outcome. Never guessed, never
// a blind retry.
func createPaymentWithFailover(amount int, email string) (map[string]any, error) {
	body, _ := json.Marshal(map[string]any{
		"amount": amount, "currency": "KES", "method": "mpesa",
		"customer": map[string]string{"email": email},
	})

	req, _ := http.NewRequest("POST", "{{API}}/v1/payments", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+konduytSecret)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var payment map[string]any
	json.NewDecoder(res.Body).Decode(&payment)

	// Fetch it back to see the real attempt history -- which provider(s)
	// were tried, in what order, and why.
	req2, _ := http.NewRequest("GET", "{{API}}/v1/payments/"+payment["id"].(string), nil)
	req2.Header.Set("Authorization", "Bearer "+konduytSecret)
	res2, err := http.DefaultClient.Do(req2)
	if err != nil {
		return nil, err
	}
	defer res2.Body.Close()

	var checked map[string]any
	json.NewDecoder(res2.Body).Decode(&checked)
	return checked, nil
	// ["routing_attempts"]: [{"attempt_number", "provider", "outcome", "fallback_class"}, ...]
}` },
      { title: 'Cross-border payment', code:
`import "net/url"

// The only thing that varies per shopper: customer_country. Same real
// eligibility engine Konduyt.checkout() uses internally -- never a fixed
// list. Public endpoint, publishable key only -- safe to call directly,
// even from a browser.
var konduytPublishable = os.Getenv("KONDUYT_PUBLISHABLE_KEY")

func eligibleMethodsFor(customerCountry string) ([]any, error) {
	q := url.Values{}
	q.Set("pk", konduytPublishable)
	q.Set("amount", "500000")
	q.Set("currency", "KES")
	q.Set("customer_country", customerCountry)

	res, err := http.Get("{{API}}/checkout/config?" + q.Encode())
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var config map[string]any
	json.NewDecoder(res.Body).Decode(&config)
	return config["methods"].([]any), nil // the real eligible list for THIS shopper, never hardcoded
}` },
    ],
  },
  {
    id: 'ruby', label: 'Ruby', icon: 'ruby',
    sections: [
      { title: 'Dependency', code:
`gem install sinatra rackup puma   # Sinatra needs rackup and puma at startup, not just sinatra` },
      { title: 'One-time purchase', code:
`require "net/http"
require "json"
require "uri"

# Read the key from the environment — never hardcode it.
KONDUYT_SECRET_KEY = ENV.fetch("KONDUYT_SECRET_KEY")

# phone: is optional but recommended for mobile money -- it's what
# receives the STK push. Pass it if you already have it; if you don't
# and the customer types it in, Konduyt remembers it after this first
# payment (keyed to email:), so you don't need to collect or pass it
# again on their next purchase.
def create_payment(amount, email, phone: nil, method: "mpesa")
  uri = URI("{{API}}/v1/payments")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer #{KONDUYT_SECRET_KEY}"
  req["Content-Type"] = "application/json"
  req.body = {
    amount: amount, currency: "KES", method: method,
    customer: { email: email, phone: phone },
  }.to_json

  JSON.parse(http.request(req).body)
end

# amount either comes from the shopper, or is a price you already know:
amount = params[:amount].to_i     # whatever the shopper typed in (a donation)
# amount = selected_item.price    # a fixed price you already know (a product)
payment = create_payment(amount, params[:email], phone: params[:phone])` },
      { title: 'Wire it to the Buy button (checkout-page.html)', code:
`# checkout-page.html's own real markup (Step 2 above), verbatim:
#   <input id="emailInput" type="email" ... />
#   <button id="confirmButton" ...>Confirm — Pay</button>
# its click handler POSTs { amount, email } to exactly this route.
# Sinatra shown
# here (gem install sinatra); Rails mounts the same route the same way.
require "sinatra"
require "json"

# checkout-page.html is served from a different origin than this server
# (a real file, or konduyt.dev itself) -- without this, the browser
# blocks every request before it ever reaches these routes,
# indistinguishable from "the server isn't running" even when it is.
before do
  headers["Access-Control-Allow-Origin"] = "*"
  headers["Access-Control-Allow-Headers"] = "Content-Type"
  headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
end
options "/api/create-payment" do
  204
end
post "/api/create-payment" do
  body = JSON.parse(request.body.read)
  payment = create_payment(body["amount"], body["email"])
  content_type :json
  payment.to_json
end

# Run: ruby server.rb -- backend on http://localhost:3000` },
            { title: 'Failover + rerouting', code:
`# "method", not "provider" -- this is what triggers real failover: Konduyt
# tries every provider configured for this method, in order, stopping on
# success or on a genuinely unsafe/ambiguous outcome. Never guessed, never
# a blind retry.
def create_payment_with_failover(amount, email)
  uri = URI("{{API}}/v1/payments")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer #{KONDUYT_SECRET_KEY}"
  req["Content-Type"] = "application/json"
  req.body = { amount: amount, currency: "KES", method: "mpesa",
              customer: { email: email } }.to_json
  payment = JSON.parse(http.request(req).body)

  # Fetch it back to see the real attempt history -- which provider(s)
  # were tried, in what order, and why.
  check_uri = URI("{{API}}/v1/payments/#{payment['id']}")
  check_http = Net::HTTP.new(check_uri.host, check_uri.port)
  check_http.use_ssl = true
  check_req = Net::HTTP::Get.new(check_uri)
  check_req["Authorization"] = "Bearer #{KONDUYT_SECRET_KEY}"
  JSON.parse(check_http.request(check_req).body)
  # ["routing_attempts"]: [{"attempt_number", "provider", "outcome", "fallback_class"}, ...]
end` },
      { title: 'Cross-border payment', code:
`# The only thing that varies per shopper: customer_country. Same real
# eligibility engine Konduyt.checkout() uses internally -- never a fixed
# list. Public endpoint, publishable key only -- safe to call directly,
# even from a browser.
KONDUYT_PUBLISHABLE_KEY = ENV.fetch("KONDUYT_PUBLISHABLE_KEY")

def eligible_methods_for(customer_country)
  uri = URI("{{API}}/checkout/config")
  uri.query = URI.encode_www_form(
    pk: KONDUYT_PUBLISHABLE_KEY, amount: 500000, currency: "KES",
    customer_country: customer_country
  )
  config = JSON.parse(Net::HTTP.get(uri))
  config["methods"] # the real eligible list for THIS shopper, never hardcoded
end` },
    ],
  },
  {
    id: 'rust', label: 'Rust', icon: 'rust',
    sections: [
      { title: 'Dependency (Cargo.toml)', code:
`[dependencies]
reqwest = { version = "0.12", features = ["json", "blocking"] }
serde_json = "1"
tiny_http = "0.12"   # only the route sample below needs it` },
      { title: 'One-time purchase', code:
`use serde_json::json;
use std::env;

// phone is optional but recommended for mobile money -- it's what
// receives the STK push. Pass it if you already have it; if you don't
// and the customer types it in, Konduyt remembers it after this first
// payment (keyed to email), so you don't need to collect or pass it
// again on their next purchase.
fn create_payment(amount: u64, email: &str, phone: &str) -> Result<serde_json::Value, reqwest::Error> {
    // Read the key from the environment — never hardcode it.
    let secret = env::var("KONDUYT_SECRET_KEY").expect("KONDUYT_SECRET_KEY not set");
    let client = reqwest::blocking::Client::new();
    client
        .post("{{API}}/v1/payments")
        .bearer_auth(secret)
        .json(&json!({
            "amount": amount,
            "currency": "KES",
            "method": "mpesa",
            "customer": { "email": email, "phone": phone }
        }))
        .send()?
        .json()
}

// The shopper types the amount themselves -- a donation, a tip, a
// "pay what you want" field. Comes straight from the request body,
// not something you set.
fn handle_donation(body: &serde_json::Value) -> Result<serde_json::Value, reqwest::Error> {
    let amount = body["amount"].as_u64().unwrap_or(0); // whatever the shopper typed in
    let email = body["email"].as_str().unwrap_or("");
    let phone = body["phone"].as_str().unwrap_or("");
    create_payment(amount, email, phone)
}` },
      { title: 'Wire it to the Buy button (checkout-page.html)', code:
`// checkout-page.html's own real markup (Step 2 above), verbatim:
//   <input id="emailInput" type="email" ... />
//   <button id="confirmButton" ...>Confirm — Pay</button>
// its click handler POSTs { amount, email } to exactly this route.
// tiny_http shown
// here (cargo add tiny_http); Actix/Axum mount the same route the same way.
use tiny_http::{Server, Response, Method, Header};
use std::io::Read;

fn main() {
    let server = Server::http("0.0.0.0:3000").unwrap();
    println!("Backend running on http://localhost:3000");

    // checkout-page.html is served from a different origin than this
    // server (a real file, or konduyt.dev itself) -- without these, the
    // browser blocks every request before it ever reaches this code,
    // indistinguishable from "the server isn't running" even when it is.
    let cors_headers = || vec![
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"POST, OPTIONS"[..]).unwrap(),
    ];

    for mut request in server.incoming_requests() {
        if request.method() == &Method::Options {
            let mut response = Response::from_string("").with_status_code(204);
            for h in cors_headers() { response.add_header(h); }
            request.respond(response).ok();
            continue;
        }
        if request.method() != &Method::Post {
            let mut response = Response::from_string("").with_status_code(404);
            for h in cors_headers() { response.add_header(h); }
            request.respond(response).ok();
            continue;
        }

        let mut body_str = String::new();
        request.as_reader().read_to_string(&mut body_str).ok();
        let body: serde_json::Value = serde_json::from_str(&body_str).unwrap_or(json!({}));

        let amount = body["amount"].as_u64().unwrap_or(0);
        let email = body["email"].as_str().unwrap_or("");
        let phone = body["phone"].as_str().unwrap_or("");
        let result_json = create_payment(amount, email, phone).unwrap().to_string();
        let mut response = Response::from_string(result_json);
        for h in cors_headers() { response.add_header(h); }
        request.respond(response).ok();
    }
}` },
            { title: 'Failover + rerouting', code:
`// "method", not "provider" -- this is what triggers real failover: Konduyt
// tries every provider configured for this method, in order, stopping on
// success or on a genuinely unsafe/ambiguous outcome. Never guessed, never
// a blind retry.
fn create_payment_with_failover(amount: u64, email: &str) -> Result<serde_json::Value, reqwest::Error> {
    let secret = env::var("KONDUYT_SECRET_KEY").expect("KONDUYT_SECRET_KEY not set");
    let client = reqwest::blocking::Client::new();
    let payment: serde_json::Value = client
        .post("{{API}}/v1/payments")
        .bearer_auth(&secret)
        .json(&json!({
            "amount": amount, "currency": "KES", "method": "mpesa",
            "customer": { "email": email }
        }))
        .send()?
        .json()?;

    // Fetch it back to see the real attempt history -- which provider(s)
    // were tried, in what order, and why.
    client
        .get(format!("{{API}}/v1/payments/{}", payment["id"].as_str().unwrap()))
        .bearer_auth(&secret)
        .send()?
        .json()
    // ["routing_attempts"]: [{"attempt_number", "provider", "outcome", "fallback_class"}, ...]
}` },
      { title: 'Cross-border payment', code:
`// The only thing that varies per shopper: customer_country. Same real
// eligibility engine Konduyt.checkout() uses internally -- never a fixed
// list. Public endpoint, publishable key only -- safe to call directly,
// even from a browser.
fn eligible_methods_for(customer_country: &str) -> Result<serde_json::Value, reqwest::Error> {
    let publishable = env::var("KONDUYT_PUBLISHABLE_KEY").expect("KONDUYT_PUBLISHABLE_KEY not set");
    let client = reqwest::blocking::Client::new();
    let config: serde_json::Value = client
        .get("{{API}}/checkout/config")
        .query(&[("pk", publishable.as_str()), ("amount", "500000"),
                ("currency", "KES"), ("customer_country", customer_country)])
        .send()?
        .json()?;
    Ok(config["methods"].clone()) // the real eligible list for THIS shopper, never hardcoded
}` },
    ],
  },
  {
    id: 'csharp', label: 'C#', icon: 'csharp',
    sections: [
      { title: 'One-time purchase', code:
`using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

// Read the key from the environment — never hardcode it.
string secret = Environment.GetEnvironmentVariable("KONDUYT_SECRET_KEY");

// phone is optional but recommended for mobile money -- it's what
// receives the STK push. Pass it if you already have it; if you don't
// and the customer types it in, Konduyt remembers it after this first
// payment (keyed to email), so you don't need to collect or pass it
// again on their next purchase.
async Task<string> CreatePayment(int amount, string email, string phone = null, string method = "mpesa") {
    var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", secret);

    var body = new StringContent(JsonSerializer.Serialize(new {
        amount, currency = "KES", method, customer = new { email, phone }
    }), Encoding.UTF8, "application/json");

    var res = await client.PostAsync("{{API}}/v1/payments", body);
    return await res.Content.ReadAsStringAsync();
}

// The shopper types the amount themselves -- a donation, a tip, a
// "pay what you want" field. Comes straight from the request body,
// not something you set.
async Task<string> HandleDonation(JsonElement body) {
    int amount = body.GetProperty("amount").GetInt32(); // whatever the shopper typed in
    string email = body.GetProperty("email").GetString();
    string phone = body.TryGetProperty("phone", out var p) ? p.GetString() : null;
    return await CreatePayment(amount, email, phone);
}` },
      { title: 'Wire it to the Buy button (checkout-page.html)', code:
`// checkout-page.html's own real markup (Step 2 above), verbatim:
//   <input id="emailInput" type="email" ... />
//   <button id="confirmButton" ...>Confirm — Pay</button>
// its click handler POSTs { amount, email } to exactly this route.
// ASP.NET Core
// minimal API shown here (dotnet new web); MVC controllers mount the
// same route the same way.
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// checkout-page.html is served from a different origin than this server
// (a real file, or konduyt.dev itself) -- without this, the browser
// blocks every request before it ever reaches these routes,
// indistinguishable from "the server isn't running" even when it is.
app.Use(async (context, next) => {
    context.Response.Headers.Append("Access-Control-Allow-Origin", "*");
    context.Response.Headers.Append("Access-Control-Allow-Headers", "Content-Type");
    context.Response.Headers.Append("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (context.Request.Method == "OPTIONS") { context.Response.StatusCode = 204; return; }
    await next();
});

app.MapPost("/api/create-payment", async (HttpRequest req) => {
    var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body);
    var amount = body.GetProperty("amount").GetInt32();
    var email = body.GetProperty("email").GetString();
    var payment = await CreatePayment(amount, email);
    return Results.Content(payment, "application/json");
});


app.Urls.Add("http://localhost:3000");
app.Run();` },
            { title: 'Failover + rerouting', code:
`// "method", not "provider" -- this is what triggers real failover: Konduyt
// tries every provider configured for this method, in order, stopping on
// success or on a genuinely unsafe/ambiguous outcome. Never guessed, never
// a blind retry.
async Task<string> CreatePaymentWithFailover(int amount, string email) {
    var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", secret);

    var body = new StringContent(JsonSerializer.Serialize(new {
        amount, currency = "KES", method = "mpesa", customer = new { email }
    }), Encoding.UTF8, "application/json");

    var res = await client.PostAsync("{{API}}/v1/payments", body);
    var payment = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
    var id = payment.RootElement.GetProperty("id").GetString();

    // Fetch it back to see the real attempt history -- which provider(s)
    // were tried, in what order, and why.
    var check = await client.GetAsync($"{{API}}/v1/payments/{id}");
    return await check.Content.ReadAsStringAsync();
    // "routing_attempts": [{ "attempt_number", "provider", "outcome", "fallback_class" }, ...]
}` },
      { title: 'Cross-border payment', code:
`// The only thing that varies per shopper: customer_country. Same real
// eligibility engine Konduyt.checkout() uses internally -- never a fixed
// list. Public endpoint, publishable key only -- safe to call directly,
// even from a browser.
string publishable = Environment.GetEnvironmentVariable("KONDUYT_PUBLISHABLE_KEY");

async Task<string> EligibleMethodsFor(string customerCountry) {
    var client = new HttpClient();
    var url = $"{{API}}/checkout/config?pk={publishable}&amount=500000&currency=KES" +
              $"&customer_country={customerCountry}";
    var res = await client.GetAsync(url);
    return await res.Content.ReadAsStringAsync(); // "methods": the real eligible list, never hardcoded
}` },
    ],
  },
  {
    id: 'java', label: 'Java (Android Studio)', icon: 'java', platform: 'Android',
    sections: [
      { title: 'Dependency (app/build.gradle)', code:
`dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}

// AndroidManifest.xml — allow internet
// <uses-permission android:name="android.permission.INTERNET" />` },
      { title: 'MainActivity.java — wired to activity_main.xml (Step 2 above)', code:
`// app/src/main/java/.../MainActivity.java
//
// The secret key must live on YOUR server, never inside the Android app --
// anything shipped in the APK can be extracted, including a value injected
// via BuildConfig at build time. There is no safe way to hold
// KONDUYT_SECRET_KEY on-device. This Activity calls YOUR OWN backend
// endpoint below; that backend (in Node, Python, or whatever you run --
// see the other language tabs here for what it does with this) holds
// KONDUYT_SECRET_KEY and is the only thing that ever calls Konduyt directly.
package com.example.konduytdemo;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import okhttp3.*;
import java.io.IOException;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {
    // Your own backend, from the Android emulator -- not Konduyt directly.
    private static final String BACKEND = "http://10.0.2.2:3000";

    private EditText amountInput;
    private EditText emailInput;
    private EditText phoneInput;
    private TextView resultText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main); // Step 2's real activity_main.xml

        // These ids come straight from activity_main.xml above --
        // change one there and this line breaks, on purpose.
        amountInput = findViewById(R.id.amountInput);
        emailInput = findViewById(R.id.emailInput);
        phoneInput = findViewById(R.id.phoneInput);
        resultText = findViewById(R.id.resultText);

        Button buyButton = findViewById(R.id.buyButton);
        buyButton.setOnClickListener(v -> {
            // amount either comes from the shopper (typed into amountInput,
            // a donation), or is a fixed price you already know (a product)
            // -- same field either way.
            int amount = Integer.parseInt(amountInput.getText().toString());
            String email = emailInput.getText().toString();
            // phoneInput is optional but recommended for mobile money -- it's
            // what receives the STK push. If left blank and the customer has
            // paid before with this email, your backend/Konduyt fills in the
            // number saved from their last payment automatically. The XML
            // already restricts the field to digits; the length check below
            // is what makes a short number impossible to submit.
            String phone = phoneInput.getText().toString();
            if (!phone.isEmpty() && (phone.length() < 6 || phone.length() > 15)) {
                resultText.setText("Enter the full phone number (digits only).");
                return;
            }
            createPayment(amount, email, phone);
        });
    }

    void createPayment(int amount, String email, String phone) {
        OkHttpClient client = new OkHttpClient();
        Executors.newSingleThreadExecutor().execute(() -> {
            String json = "{"
                + "\\"amount\\": " + amount + ","
                + "\\"email\\": \\"" + email + "\\","
                + "\\"phone\\": \\"" + phone + "\\""
                + "}";

            // Your own backend, not Konduyt -- POST /api/create-payment,
            // the exact route every backend language tab implements.
            Request request = new Request.Builder()
                .url(BACKEND + "/api/create-payment")
                .post(RequestBody.create(json, MediaType.parse("application/json")))
                .build();

            try (Response response = client.newCall(request).execute()) {
                String payment = response.body().string();
                // your backend returns whatever Konduyt gave it -- update
                // resultText on the main thread, or open authorization_url
                // in a Chrome Custom Tab
                runOnUiThread(() -> resultText.setText(payment));
            } catch (IOException e) {
                runOnUiThread(() -> resultText.setText("Could not reach your backend -- is it running?"));
            }
        });
    }
}` },
            { title: 'Failover + rerouting — call YOUR backend', code:
`// Your backend passes "method", not "provider" -- that's what triggers
// real failover: Konduyt tries every provider configured for that method,
// in order, stopping on success or a genuinely unsafe/ambiguous outcome.
// Your app never talks to Konduyt directly, same as every other call here.
void createPaymentWithFailover(int amount, String email) throws IOException {
    OkHttpClient client = new OkHttpClient();
    String json = "{\\"amount\\": " + amount + ", \\"email\\": \\"" + email + "\\"}";

    Request request = new Request.Builder()
        .url(BACKEND + "/api/create-payment-failover")
        .post(RequestBody.create(json, MediaType.parse("application/json")))
        .build();

    try (Response response = client.newCall(request).execute()) {
        String result = response.body().string();
        // your backend returns the real routing_attempts it fetched back
        // from Konduyt -- which provider(s) were tried, in what order, why
    }
}` },
      { title: 'Cross-border payment — call YOUR backend', code:
`// The only thing that varies per shopper: their country. Your backend
// proxies to Konduyt's real eligibility engine (the same one
// Konduyt.checkout() uses internally) with your publishable key -- never
// a fixed method list baked into the app.
void eligibleMethodsFor(String customerCountry) throws IOException {
    OkHttpClient client = new OkHttpClient();

    Request request = new Request.Builder()
        .url(BACKEND + "/api/eligible-methods?country=" + customerCountry)
        .build();

    try (Response response = client.newCall(request).execute()) {
        String methods = response.body().string();
        // the real eligible list for THIS shopper, never hardcoded
    }
}` },
    ],
  },
  {
    id: 'kotlin', label: 'Kotlin (Android Studio)', icon: 'kotlin', platform: 'Android',
    sections: [
      { title: 'Dependency (app/build.gradle.kts)', code:
`dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}

// AndroidManifest.xml
// <uses-permission android:name="android.permission.INTERNET" />` },
      { title: 'MainActivity.kt — wired to activity_main.xml (Step 2 above)', code:
`// app/src/main/java/.../MainActivity.kt
//
// The secret key must live on YOUR server, never inside the Android app --
// anything shipped in the APK can be extracted, including a value injected
// via BuildConfig at build time. There is no safe way to hold
// KONDUYT_SECRET_KEY on-device. This Activity calls YOUR OWN backend
// endpoint below; that backend holds KONDUYT_SECRET_KEY (see the other
// language tabs here for what it does with this) and is the only thing
// that ever calls Konduyt directly.
package com.example.konduytdemo

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

class MainActivity : AppCompatActivity() {
    // Your own backend, from the Android emulator -- not Konduyt directly.
    private val backend = "http://10.0.2.2:3000"

    private lateinit var amountInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var resultText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main) // Step 2's real activity_main.xml

        // These ids come straight from activity_main.xml above --
        // change one there and this line breaks, on purpose.
        amountInput = findViewById(R.id.amountInput)
        emailInput = findViewById(R.id.emailInput)
        phoneInput = findViewById(R.id.phoneInput)
        resultText = findViewById(R.id.resultText)

        findViewById<Button>(R.id.buyButton).setOnClickListener {
            // amount either comes from the shopper (typed into amountInput,
            // a donation), or is a fixed price you already know (a product)
            // -- same field either way.
            val amount = amountInput.text.toString().toInt()
            val email = emailInput.text.toString()
            // phoneInput is optional but recommended for mobile money -- it's
            // what receives the STK push. If left blank and the customer has
            // paid before with this email, your backend/Konduyt fills in the
            // number saved from their last payment automatically. The XML
            // already restricts the field to digits; the length check below
            // is what makes a short number impossible to submit.
            val phone = phoneInput.text.toString()
            if (phone.isNotEmpty() && phone.length !in 6..15) {
                resultText.text = "Enter the full phone number (digits only)."
                return@setOnClickListener
            }
            createPayment(amount, email, phone)
        }
    }

    fun createPayment(amount: Int, email: String, phone: String) {
        CoroutineScope(Dispatchers.IO).launch {
            val client = OkHttpClient()
            val json = "application/json".toMediaType()
            val payload = """{ "amount": $amount, "email": "$email", "phone": "$phone" }"""

            // Your own backend, not Konduyt -- POST /api/create-payment,
            // the exact route every backend language tab implements.
            val request = Request.Builder()
                .url("$backend/api/create-payment")
                .post(payload.toRequestBody(json))
                .build()

            try {
                client.newCall(request).execute().use { res ->
                    val payment = res.body?.string()
                    withContext(Dispatchers.Main) { resultText.text = payment }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { resultText.text = "Could not reach your backend -- is it running?" }
            }
        }
    }
}` },
            { title: 'Failover + rerouting — call YOUR backend', code:
`// Your backend passes "method", not "provider" -- that's what triggers
// real failover: Konduyt tries every provider configured for that method,
// in order, stopping on success or a genuinely unsafe/ambiguous outcome.
// Your app never talks to Konduyt directly, same as every other call here.
fun createPaymentWithFailover(amount: Int, email: String) {
    val client = OkHttpClient()
    val json = """{ "amount": $amount, "email": "$email" }""".trimIndent()

    val request = Request.Builder()
        .url("$backend/api/create-payment-failover")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    client.newCall(request).execute().use { response ->
        val result = response.body?.string()
        // your backend returns the real routing_attempts it fetched back
        // from Konduyt -- which provider(s) were tried, in what order, why
    }
}` },
      { title: 'Cross-border payment — call YOUR backend', code:
`// The only thing that varies per shopper: their country. Your backend
// proxies to Konduyt's real eligibility engine (the same one
// Konduyt.checkout() uses internally) with your publishable key -- never
// a fixed method list baked into the app.
fun eligibleMethodsFor(customerCountry: String) {
    val client = OkHttpClient()
    val request = Request.Builder()
        .url("$backend/api/eligible-methods?country=$customerCountry")
        .build()

    client.newCall(request).execute().use { response ->
        val methods = response.body?.string()
        // the real eligible list for THIS shopper, never hardcoded
    }
}` },
    ],
  },
  {
    id: 'swift', label: 'Swift', icon: 'swift', platform: 'iOS',
    sections: [
      { title: 'ViewController.swift — wired to Main.storyboard (Step 2 above)', code:
`// ViewController.swift
//
// The secret key must live on YOUR server, never inside the iOS app --
// anything shipped in the binary can be extracted, including a value
// injected via Info.plist at build time. There is no safe way to hold
// KONDUYT_SECRET_KEY on-device. This ViewController calls YOUR OWN backend
// endpoint below; that backend holds KONDUYT_SECRET_KEY (see the other
// language tabs here for what it does with this) and is the only thing
// that ever calls Konduyt directly.
//
// customClass="ViewController" in Main.storyboard is what makes iOS
// instantiate THIS class for that scene -- the @IBOutlet/@IBAction names
// below must match the storyboard's ids/selector exactly, or the app
// crashes at launch with an unrecognized-selector error.
import UIKit

class ViewController: UIViewController {
    // These match Main.storyboard's ids exactly -- amountField, emailField,
    // resultLabel. Connect each in Interface Builder by ctrl-dragging from
    // the storyboard element to these properties.
    @IBOutlet weak var amountField: UITextField!
    @IBOutlet weak var emailField: UITextField!
    @IBOutlet weak var phoneField: UITextField!
    @IBOutlet weak var resultLabel: UILabel!

    // Your own backend, from the iOS Simulator -- not Konduyt directly.
    let backend = "http://localhost:3000"

    // Matches the storyboard's action selector "createPaymentTapped:"
    // exactly, connected to buyButton's Touch Up Inside event.
    @IBAction func createPaymentTapped(_ sender: Any) {
        // amount either comes from the shopper (typed into amountField, a
        // donation), or is a fixed price you already know (a product) --
        // same field either way.
        let amount = Int(amountField.text ?? "") ?? 0
        let email = emailField.text ?? ""
        // phoneField is optional but recommended for mobile money -- it's
        // what receives the STK push. If left blank and the customer has
        // paid before with this email, your backend/Konduyt fills in the
        // number saved from their last payment automatically. Digits are
        // filtered here as well as in the storyboard so a paste can't slip a
        // "+" or a space through, and a short number cannot be submitted.
        let phone = (phoneField.text ?? "").filter(\\.isNumber)
        if !phone.isEmpty && !(6...15).contains(phone.count) {
            resultLabel.text = "Enter the full phone number (digits only)."
            return
        }
        Task { await createPayment(amount: amount, email: email, phone: phone) }
    }

    func createPayment(amount: Int, email: String, phone: String) async {
        // Your own backend, not Konduyt -- POST /api/create-payment,
        // the exact route every backend language tab implements.
        var request = URLRequest(url: URL(string: "\\(backend)/api/create-payment")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["amount": amount, "email": email, "phone": phone])

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            // your backend returns whatever Konduyt gave it
            resultLabel.text = String(data: data, encoding: .utf8) ?? ""
        } catch {
            resultLabel.text = "Could not reach your backend -- is it running?"
        }
    }
}
// e.g. try await createPayment(amount: selectedItem.price, email: email, phone: phone)` },
            { title: 'Failover + rerouting — call YOUR backend', code:
`// Your backend passes "method", not "provider" -- that's what triggers
// real failover: Konduyt tries every provider configured for that method,
// in order, stopping on success or a genuinely unsafe/ambiguous outcome.
// Your app never talks to Konduyt directly, same as every other call here.
func createPaymentWithFailover(amount: Int, email: String) async throws -> [String: Any] {
    var request = URLRequest(url: URL(string: "\\(backend)/api/create-payment-failover")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = ["amount": amount, "email": email]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, _) = try await URLSession.shared.data(for: request)
    // your backend returns the real routing_attempts it fetched back from
    // Konduyt -- which provider(s) were tried, in what order, why
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}` },
      { title: 'Cross-border payment — call YOUR backend', code:
`// The only thing that varies per shopper: their country. Your backend
// proxies to Konduyt's real eligibility engine (the same one
// Konduyt.checkout() uses internally) with your publishable key -- never
// a fixed method list baked into the app.
func eligibleMethods(customerCountry: String) async throws -> [String: Any] {
    let request = URLRequest(url: URL(string: "\\(backend)/api/eligible-methods?country=\\(customerCountry)")!)
    let (data, _) = try await URLSession.shared.data(for: request)
    // the real eligible list for THIS shopper, never hardcoded
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}` },
    ],
  },
  {
    id: 'cpp', label: 'C++', icon: 'cpp',
    sections: [
      { title: 'Dependency', code:
`# Using libcurl (install via your package manager)
sudo apt-get install libcurl4-openssl-dev   # Debian/Ubuntu` },
      { title: 'One-time purchase', code:
`#include <curl/curl.h>
#include <cstdlib>
#include <string>

// phone is optional but recommended for mobile money -- it's what
// receives the STK push. Pass it if you already have it; if you don't
// and the customer types it in, Konduyt remembers it after this first
// payment (keyed to email), so you don't need to collect or pass it
// again on their next purchase.
void create_payment(long amount, const std::string& email, const std::string& phone = "") {
    // Read the key from the environment — never hardcode it.
    const char* secret = std::getenv("KONDUYT_SECRET_KEY");
    if (!secret) return;

    // amount either comes from the shopper, or is a price you already
    // know -- pass whichever one applies as the amount parameter above.
    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string body =
        "{\\"amount\\": " + std::to_string(amount) +
        ", \\"currency\\": \\"KES\\", \\"method\\": \\"mpesa\\","
        " \\"customer\\": { \\"email\\": \\"" + email + "\\", \\"phone\\": \\"" + phone + "\\" } }";

    std::string auth = "Authorization: Bearer " + std::string(secret);
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, auth.c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, "{{API}}/v1/payments");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}` },
      { title: 'Wire it to the Buy button (checkout-page.html)', code:
`// checkout-page.html's own real markup (Step 2 above), verbatim:
//   <input id="emailInput" type="email" ... />
//   <button id="confirmButton" ...>Confirm — Pay</button>
// its click handler POSTs { amount, email } to exactly this route.
// cpp-httplib
// shown here (a single header, no framework needed).
#include <httplib.h>
#include <string>

int main() {
    httplib::Server svr;

    // checkout-page.html is served from a different origin than this
    // server (a real file, or konduyt.dev itself) -- without this, the
    // browser blocks every request before it ever reaches these routes,
    // indistinguishable from "the server isn't running" even when it is.
    svr.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.set_header("Access-Control-Allow-Methods", "POST, OPTIONS");
        if (req.method == "OPTIONS") { res.status = 204; return httplib::Server::HandlerResponse::Handled; }
        return httplib::Server::HandlerResponse::Unhandled;
    });

    svr.Post("/api/create-payment", [](const httplib::Request& req, httplib::Response& res) {
        // Parsing req.body's real "amount"/"email" fields is left to a
        // JSON library of your choice -- create_payment above takes them.
        long amount = 5000; // parse from req.body in a real integration
        std::string email = "customer@example.com";
        create_payment(amount, email);
        res.set_content("{\\"status\\": \\"submitted\\"}", "application/json");
    });


    printf("Backend running on http://localhost:3000\\n");
    svr.listen("0.0.0.0", 3000);
}` },
            { title: 'Failover + rerouting', code:
`#include <curl/curl.h>
#include <cstdlib>
#include <string>

// "method", not "provider" -- this is what triggers real failover: Konduyt
// tries every provider configured for this method, in order, stopping on
// success or on a genuinely unsafe/ambiguous outcome. Never guessed, never
// a blind retry.
void create_payment_with_failover(long amount, const std::string& email) {
    const char* secret = std::getenv("KONDUYT_SECRET_KEY");
    if (!secret) return;

    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string body =
        "{\\"amount\\": " + std::to_string(amount) +
        ", \\"currency\\": \\"KES\\", \\"method\\": \\"mpesa\\","
        " \\"customer\\": { \\"email\\": \\"" + email + "\\" } }";

    std::string auth = "Authorization: Bearer " + std::string(secret);
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, auth.c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, "{{API}}/v1/payments");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    // ... set CURLOPT_WRITEFUNCTION to capture the response, parse "id" ...
    curl_easy_perform(curl);

    // A second GET to {{API}}/v1/payments/{id} (same auth header, no body)
    // returns the real routing_attempts history: which provider(s) were
    // tried, in what order, and why -- for display.

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}` },
      { title: 'Cross-border payment', code:
`#include <curl/curl.h>
#include <cstdlib>
#include <string>

// The only thing that varies per shopper: customer_country. Same real
// eligibility engine Konduyt.checkout() uses internally -- never a fixed
// list. Public endpoint, publishable key only -- safe to call directly,
// even from a browser.
void eligible_methods_for(const std::string& customerCountry) {
    const char* publishable = std::getenv("KONDUYT_PUBLISHABLE_KEY");
    if (!publishable) return;

    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string url = std::string("{{API}}/checkout/config?pk=") + publishable +
        "&amount=500000&currency=KES&customer_country=" + customerCountry;

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    // ... set CURLOPT_WRITEFUNCTION to capture the response into a
    // variable, then parse the real "methods" array -- never hardcoded ...
    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
}` },
    ],
  },
];
