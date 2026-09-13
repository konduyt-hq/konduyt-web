// A real, standalone demo -- one self-contained HTML file, HTML + CSS + JS
// together, no build step, no dependency.
//
// Two real flows, matching a real product, not just one scenario:
//
// ONE-TIME (the top section): a simple product with ONE "Pay" button.
//   1. Click Pay -> calls the real, public /v1/demo/run (same endpoint
//      DevPanel.js's own "Test before you sign up" button uses -- no key,
//      no backend needed for this step) -- shows the real, ranked payment
//      options for this amount, cheapest first, as a real popup -- the
//      same dotted-background modal style used across the rest of this
//      product, not a plain inline table.
//   2. Pick one -> THAT calls YOUR OWN backend at
//      http://localhost:3000/api/create-payment.
//
// A real phone number (with its real country code) is collected first,
// before Pay is even clickable -- Konduyt needs this to know which
// country's real rail catalogue to rank against, the same real "country"
// field /v1/demo/run's own backend already accepts and honors.
//
// RECURRING (the section below it): a fixed subscription price with its
// own "Subscribe" button, calling YOUR OWN backend's
// /api/create-subscription -- the SAME route every backend language tab
// implements alongside create-payment. No intelligence comparison step
// here -- a subscription authorizes once, in Konduyt's own checkout, not
// per-charge.
//
// Both routes are real ids in this file (payButton, subscribeButton, and
// so on), read by name in every backend language tab's own comments --
// open this file next to a running backend from any of those tabs and
// both flows work end to end, the same way a real customer would
// actually use them.

export const INTELLIGENCE_TESTING_SDK = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Konduyt — Sample Checkout</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 420px;
    margin: 60px auto;
    padding: 0 20px;
    color: #0a0a0a;
  }
  .product { border: 1px solid #e5e5e5; border-radius: 14px; padding: 24px; }
  .product h1 { font-size: 18px; margin: 0 0 4px; }
  .product .sub { color: #6b6b6b; font-size: 13px; margin: 0 0 20px; }
  .price { font-size: 26px; font-weight: 700; margin-bottom: 18px; }

  .phone-row { display: flex; gap: 8px; margin-bottom: 16px; }
  #countryCode {
    width: 92px;
    padding: 10px 8px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
  }
  #phoneInput {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
  }
  .phone-hint { font-size: 11.5px; color: #6b6b6b; margin: -10px 0 16px; }

  #payButton {
    width: 100%;
    padding: 13px;
    border: none;
    border-radius: 9px;
    background: #0a0a0a;
    color: #fff;
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
  }
  #payButton:disabled { opacity: 0.5; cursor: default; }

  /* Real Konduyt popup styling -- the same dotted-background modal used
     across the rest of this product, not a plain inline table. */
  .intel-modal-overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(10,10,10,.55);
    align-items: center; justify-content: center;
    z-index: 100; padding: 20px;
  }
  .intel-modal-overlay.open { display: flex; }
  .intel-modal {
    position: relative;
    background-color: #fff;
    background-image: radial-gradient(rgba(0,0,0,0.13) 1px, transparent 1px);
    background-size: 16px 16px; background-position: 0 0;
    border-radius: 16px; max-width: 420px; width: 100%; padding: 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
  }
  .intel-modal-close {
    position: absolute; top: 16px; right: 16px;
    background: none; border: none; font-size: 16px; color: #6b6b6b; cursor: pointer;
  }
  .intel-modal-title { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
  .intel-modal-sub { font-size: 12.5px; line-height: 1.5; color: #6b6b6b; margin-bottom: 6px; }
  .intel-modal-shopper-note {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    color: #16794a; margin-bottom: 10px;
  }
  .intel-modal-rep-note {
    font-size: 11.5px; line-height: 1.5; color: #8a6d1a; background: #fdf6e3;
    border: 1px solid #f0e2b0; border-radius: 9px; padding: 10px 12px; margin-bottom: 14px;
  }
  .intel-modal-table { border: 1px solid #e7e7e7; border-radius: 11px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  tr.rail { cursor: pointer; }
  tr.rail:hover td { background: #fafafa; }
  tr.best td { font-weight: 700; }
  td { padding: 11px 13px; font-size: 13.5px; border-bottom: 1px solid #e7e7e7; }
  tr:last-child td { border-bottom: none; }
  .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
    background: #0a0a0a; color: #fff; padding: 3px 7px; border-radius: 5px; margin-left: 6px; }

  #checkout { display: none; margin-top: 18px; }
  #checkout.open { display: block; }
  #checkout .sub { font-size: 12.5px; color: #6b6b6b; margin: 0 0 12px; }
  #checkout input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    margin-bottom: 10px;
  }
  #confirmButton {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #0a0a0a;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  #resultDiv { margin-top: 12px; font-size: 12.5px; color: #6b6b6b; word-break: break-all; }

  .divider { border: none; border-top: 1px solid #e5e5e5; margin: 32px 0; }
  #subscribeButton {
    width: 100%;
    padding: 13px;
    border: 1px solid #0a0a0a;
    border-radius: 9px;
    background: #fff;
    color: #0a0a0a;
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
  }
  #subscribeButton:disabled { opacity: 0.5; cursor: default; }
  #subResultDiv { margin-top: 12px; font-size: 12.5px; color: #6b6b6b; word-break: break-all; }
</style>
</head>
<body>

  <div class="product">
    <h1>Sample product</h1>
    <p class="sub">What your customer actually sees first -- price, phone number, and Pay.</p>
    <div class="price">KES 5,000.00</div>

    <div class="phone-row">
      <select id="countryCode">
        <option value="254" data-iso="KE" selected>🇰🇪 Kenya +254</option>
        <option value="234" data-iso="NG">🇳🇬 Nigeria +234</option>
        <option value="233" data-iso="GH">🇬🇭 Ghana +233</option>
        <option value="27" data-iso="ZA">🇿🇦 South Africa +27</option>
        <option value="255" data-iso="TZ">🇹🇿 Tanzania +255</option>
        <option value="256" data-iso="UG">🇺🇬 Uganda +256</option>
        <option value="250" data-iso="RW">🇷🇼 Rwanda +250</option>
        <option value="251" data-iso="ET">🇪🇹 Ethiopia +251</option>
        <option value="20" data-iso="EG">🇪🇬 Egypt +20</option>
        <option value="212" data-iso="MA">🇲🇦 Morocco +212</option>
        <option value="225" data-iso="CI">🇨🇮 Côte d'Ivoire +225</option>
        <option value="221" data-iso="SN">🇸🇳 Senegal +221</option>
        <option value="237" data-iso="CM">🇨🇲 Cameroon +237</option>
        <option value="260" data-iso="ZM">🇿🇲 Zambia +260</option>
        <option value="263" data-iso="ZW">🇿🇼 Zimbabwe +263</option>
        <option value="1" data-iso="US">🇺🇸 United States +1</option>
        <option value="44" data-iso="GB">🇬🇧 United Kingdom +44</option>
        <option value="91" data-iso="IN">🇮🇳 India +91</option>
        <option value="971" data-iso="AE">🇦🇪 United Arab Emirates +971</option>
        <option value="61" data-iso="AU">🇦🇺 Australia +61</option>
      </select>
      <input id="phoneInput" type="tel" placeholder="722 123 456" />
    </div>
    <p class="phone-hint">Konduyt uses the country code to know which country's real rail catalogue to rank -- this is how a real checkout works too, not a demo-only step.</p>

    <button id="payButton" type="button" disabled>Pay</button>
  </div>

  <div class="intel-modal-overlay" id="intelOverlay">
    <div class="intel-modal">
      <button class="intel-modal-close" type="button" id="intelClose">✕</button>
      <div class="intel-modal-title">Payment intelligence</div>
      <p class="intel-modal-sub">Every way this customer could pay, ranked cheapest-first. Pick one to continue.</p>
      <p class="intel-modal-shopper-note">This is what the customer sees</p>
      <div class="intel-modal-rep-note" id="repNote" style="display:none;"></div>
      <div class="intel-modal-table">
        <table><tbody id="railRows"></tbody></table>
      </div>

      <div id="checkout">
        <p class="sub">Paying with <strong id="chosenRail"></strong> -- calls YOUR OWN backend, never Konduyt directly.</p>
        <input id="emailInput" type="email" value="customer@example.com" placeholder="Email" />
        <button id="confirmButton" type="button">Confirm — Pay</button>
        <div id="resultDiv"></div>
      </div>
    </div>
  </div>

  <hr class="divider" />

  <div class="product">
    <h1>Sample subscription</h1>
    <p class="sub">A fixed recurring price -- e.g. a Pro Plan. No comparison step: the customer authorizes once, in Konduyt's own checkout, and every later charge reuses that authorization automatically.</p>
    <div class="price">KES 1,000.00 / month</div>
    <button id="subscribeButton" type="button">Subscribe</button>
    <div id="subResultDiv"></div>
  </div>

  <script>
    var AMOUNT_MINOR = 500000; // KES 5,000.00 -- the REFERENCE price; the
    // real, displayed currency/amount always come from the backend's own
    // response (payment.currency / payment.amount), never assumed here.
    var CURRENCY = 'KES'; // default only -- overwritten below with whatever the backend actually used
    var chosenProvider = null;

    // The phone number (with its real country code) has to be filled in
    // before Pay is even clickable -- Konduyt needs it to know which
    // country's real rail catalogue to rank against.
    var countryCodeEl = document.getElementById('countryCode');
    var phoneInputEl = document.getElementById('phoneInput');
    var payButtonEl = document.getElementById('payButton');

    function updatePayButtonState() {
      payButtonEl.disabled = phoneInputEl.value.trim().length < 6;
    }
    phoneInputEl.addEventListener('input', updatePayButtonState);

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

          var repNote = document.getElementById('repNote');
          if (data.is_representative_example) {
            // Real and honest, not hidden: Konduyt doesn't have sourced
            // rail data for every country yet (Kenya's catalogue is the
            // most complete today). When that's true for the selected
            // country, the backend says so directly
            // (is_representative_example) rather than silently showing
            // Kenya-only methods as if they were genuinely available
            // wherever the customer is.
            var countryName = iso;
            var opt = countryCodeEl.selectedOptions[0];
            if (opt) countryName = opt.textContent.replace(/^\\S+\\s+/, '').replace(/\\s+\\+\\d+$/, '').trim() || iso;
            repNote.textContent = 'Konduyt doesn\\'t have sourced payment-provider data for ' + countryName + ' yet, so this shows Kenya\\'s real, connected-provider pricing as a representative example, converted into ' + CURRENCY + ' for display.';
            repNote.style.display = 'block';
          } else {
            repNote.style.display = 'none';
          }

          var options = (data.intelligence && data.intelligence.options) || [];
          renderRails(options);
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

    function renderRails(options) {
      var rows = '';
      for (var i = 0; i < options.length; i++) {
        var o = options[i];
        var isBest = i === 0;
        rows += '<tr class="rail' + (isBest ? ' best' : '') + '" data-provider="' + o.provider + '" data-label="' + o.label + '">' +
          '<td>' + o.label + (isBest ? '<span class="badge">Best value</span>' : '') + '</td>' +
          '<td>' + (o.fee_minor != null ? fmt(o.fee_minor) : '—') + '</td></tr>';
      }
      document.getElementById('railRows').innerHTML = rows ||
        '<tr><td colspan="2">No ranked options for this amount right now.</td></tr>';

      var trs = document.querySelectorAll('#railRows tr.rail');
      for (var j = 0; j < trs.length; j++) {
        trs[j].addEventListener('click', function () {
          chosenProvider = this.getAttribute('data-provider');
          document.getElementById('chosenRail').textContent = this.getAttribute('data-label');
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

    // A fixed recurring price -- calls YOUR OWN backend's
    // /api/create-subscription route, the same one every backend language
    // tab implements alongside /api/create-payment. No intelligence
    // comparison step here on purpose: a subscription authorizes once, in
    // Konduyt's own checkout widget, not per-charge -- there's no per-
    // transaction rail to rank yet. A real integration would take the
    // session id this returns and open it with Konduyt.checkout({ sessionId }).
    document.getElementById('subscribeButton').addEventListener('click', function () {
      var btn = document.getElementById('subscribeButton');
      var resultDiv = document.getElementById('subResultDiv');

      btn.disabled = true;
      btn.textContent = 'Processing…';
      resultDiv.textContent = '';

      fetch('http://localhost:3000/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(function (r) { return r.json(); })
        .then(function (session) {
          resultDiv.textContent = JSON.stringify(session) + ' -- open with Konduyt.checkout({ sessionId }).';
        })
        .catch(function () {
          resultDiv.textContent = 'Could not reach your backend at localhost:3000 -- is it running?';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Subscribe';
        });
    });
  </script>
</body>
</html>`;
