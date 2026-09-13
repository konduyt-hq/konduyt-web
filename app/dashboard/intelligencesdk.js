// A real, standalone demo -- one self-contained HTML file, HTML + CSS + JS
// together, no build step, no dependency.
//
// Two real flows, matching a real product, not just one scenario:
//
// ONE-TIME (the top section): a simple product with ONE "Pay" button.
//   1. Click Pay -> calls the real, public /v1/demo/run (same endpoint
//      DevPanel.js's own "Test before you sign up" button uses -- no key,
//      no backend needed for this step) -- shows the real, ranked payment
//      options for this amount, cheapest first.
//   2. Pick one -> THAT calls YOUR OWN backend at
//      http://localhost:3000/api/create-payment.
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

  #intel { display: none; margin-top: 18px; }
  #intel.open { display: block; }
  #intel .sub { font-size: 12.5px; color: #6b6b6b; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 8px 4px; border-bottom: 1px solid #e5e5e5; }
  td { padding: 10px 4px; font-size: 13.5px; border-bottom: 1px solid #f0f0f0; }
  tr.rail { cursor: pointer; }
  tr.rail:hover td { background: #fafafa; }
  tr.best td { font-weight: 700; }
  .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
    background: #0a0a0a; color: #fff; padding: 3px 7px; border-radius: 5px; margin-left: 6px; }

  #checkout { display: none; margin-top: 18px; }
  #checkout.open { display: block; }
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
    <p class="sub">What your customer actually sees first -- just the price and Pay.</p>
    <div class="price">KES 5,000.00</div>
    <button id="payButton" type="button">Pay</button>
  </div>

  <div id="intel">
    <p class="sub">Every way this customer could pay, ranked cheapest-first. Pick one to continue.</p>
    <table><tbody id="railRows"></tbody></table>
  </div>

  <div id="checkout">
    <p class="sub">Paying with <strong id="chosenRail"></strong> -- calls YOUR OWN backend, never Konduyt directly.</p>
    <input id="emailInput" type="email" value="customer@example.com" placeholder="Email" />
    <button id="confirmButton" type="button">Confirm — Pay</button>
    <div id="resultDiv"></div>
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
    var AMOUNT_MINOR = 500000; // KES 5,000.00
    var CURRENCY = 'KES';
    var chosenProvider = null;

    document.getElementById('payButton').addEventListener('click', function () {
      var btn = document.getElementById('payButton');
      btn.disabled = true;
      btn.textContent = 'Loading…';

      // The real, public intelligence endpoint -- no key, no backend of
      // your own needed for this step. Same one DevPanel.js's own
      // "Test before you sign up" button calls.
      fetch('https://konduyt-api.onrender.com/v1/demo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: AMOUNT_MINOR, currency: CURRENCY })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var options = (data.intelligence && data.intelligence.options) || [];
          renderRails(options);
          document.getElementById('intel').classList.add('open');
        })
        .catch(function () {
          document.getElementById('intel').classList.add('open');
          document.getElementById('railRows').innerHTML =
            '<tr><td colspan="2">Could not reach the intelligence endpoint. Try again.</td></tr>';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Pay';
        });
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

      btn.disabled = true;
      btn.textContent = 'Processing…';
      resultDiv.textContent = '';

      fetch('http://localhost:3000/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: AMOUNT_MINOR, email: email, provider: chosenProvider })
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
