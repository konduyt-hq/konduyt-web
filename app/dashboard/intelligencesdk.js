// A real, standalone testing SDK -- one self-contained HTML file, HTML +
// CSS + JS together, no build step. This is the FRONTEND half of a full
// project: the backend half is whichever of the 12 languages is picked --
// pick one, and its code implements the exact endpoints this file calls.
//
// The payment intelligence popup is NOT hand-rolled here -- it comes from
// loading the real, production konduyt.js SDK (the same script every real
// Konduyt integration uses) and calling the real Konduyt.checkout()
// function, with convertToLocal: true so it shows the real detected
// country, the real converted price in the shopper's real local
// currency, and the real locally-eligible methods ranked by their real
// fees -- exactly what appears on konduyt.dev/demo/ when you click Pay.
//
// All four real payment scenarios are here, each wired to its matching
// backend endpoint (see the 12 language tabs below for what implements
// them): one-time, recurring, split, and pay-as-you-go. The amount is a
// real input the shopper types into -- never hardcoded -- and creating
// the actual charge always happens through YOUR OWN backend
// (checkout()'s onSuccess callback triggers that), never by this file
// holding a secret key.
//
// {{API}} and {{PUBLISHABLE_KEY}} are substituted at render time, the
// same pattern as every other snippet.

export const INTELLIGENCE_TESTING_SDK = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Konduyt — Frontend (HTML + CSS)</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://konduyt.dev/konduyt.js"></script>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 480px;
    margin: 60px auto;
    padding: 0 20px;
    color: #0a0a0a;
  }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin: 28px 0 10px; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.04em; }
  .sub { color: #6b6b6b; font-size: 13px; margin-bottom: 24px; line-height: 1.5; }
  .amount-row { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .amount-row label { font-size: 13px; color: #6b6b6b; }
  .amount-row input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
  }
  .scenario {
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 10px;
  }
  .scenario p { font-size: 12.5px; color: #6b6b6b; margin: 0 0 10px; line-height: 1.5; }
  .scenario button {
    background: #0a0a0a;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 16px;
    font-size: 13.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
  .scenario button:disabled { opacity: 0.5; cursor: default; }
  .result { font-size: 12.5px; margin-top: 10px; color: #6b6b6b; word-break: break-all; }
  .error { color: #a23b2f; font-size: 12.5px; }
</style>
</head>
<body>
  <h1>Payment intelligence</h1>
  <p class="sub">
    Real, live fee/routing data from your own connected providers, shown by the real Konduyt SDK
    (loaded above, not reimplemented here) — not a mockup.
  </p>

  <div class="amount-row">
    <label for="amount">Reference price (KES)</label>
    <input id="amount" type="number" value="4200" placeholder="Amount" />
  </div>

  <h2>One-time payment</h2>
  <div class="scenario">
    <p>Shows the real payment intelligence popup — your visitor's real detected country, the price
      converted to their real local currency, and their real locally-eligible methods ranked by fee.</p>
    <button id="payBtn">Pay now</button>
    <div id="payResult" class="result"></div>
  </div>

  <h2>Recurring subscription</h2>
  <div class="scenario">
    <p>A fixed subscription price. Your backend creates a real session; the popup then shows the
      same real intelligence for that fixed amount.</p>
    <button id="subBtn">Subscribe</button>
    <div id="subResult" class="result"></div>
  </div>

  <h2>Split payment</h2>
  <div class="scenario">
    <p>One checkout, proceeds split across sellers. Calls your backend directly — this is a
      marketplace settlement, not a shopper checkout popup.</p>
    <button id="splitBtn">Create split payment</button>
    <div id="splitResult" class="result"></div>
  </div>

  <h2>Pay-as-you-go</h2>
  <div class="scenario">
    <p>Amount computed from real usage your backend already tracks, not typed in or fixed.</p>
    <button id="usageBtn">Pay usage bill</button>
    <div id="usageResult" class="result"></div>
  </div>

  <script>
    // PUBLISHABLE KEY -- safe to put directly in frontend code like this.
    // It can only open a checkout / ask what a shopper can pay with, never
    // move money or create a charge on its own.
    var PUBLISHABLE_KEY = '{{PUBLISHABLE_KEY}}';

    function setBusy(id, busy) { document.getElementById(id).disabled = busy; }

    // One-time: the real payment intelligence popup, from the real SDK,
    // with convertToLocal so it's genuinely geo/currency-aware -- not
    // hand-rolled fetch/DOM logic reimplementing what the SDK already does.
    document.getElementById('payBtn').addEventListener('click', function () {
      var amount = Math.round(parseFloat(document.getElementById('amount').value || '0') * 100);
      var resultEl = document.getElementById('payResult');
      if (!amount || amount <= 0) { resultEl.textContent = 'Enter a real amount first.'; return; }
      resultEl.textContent = '';

      Konduyt.checkout({
        publishableKey: PUBLISHABLE_KEY,
        amount: amount,
        currency: 'KES',
        convertToLocal: true,
        onSuccess: function (result) {
          // The popup's job ends at method selection -- creating the real
          // charge happens on YOUR OWN backend, never with a key in this
          // file. This is exactly what the 'One-time payment' section in
          // each of the 12 language tabs below implements.
          setBusy('payBtn', true);
          fetch('/api/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, email: 'customer@example.com' }),
          })
            .then(function (res) { return res.json(); })
            .then(function (data) { resultEl.textContent = JSON.stringify(data); })
            .catch(function () { resultEl.textContent = 'Could not reach /api/create-payment -- is your backend running?'; })
            .finally(function () { setBusy('payBtn', false); });
        },
        onClose: function () {},
      });
    });

    // Recurring: your backend creates the real session first (fixed
    // subscription price, your backend's own secret key), then the real
    // SDK shows the same real intelligence popup for that session.
    document.getElementById('subBtn').addEventListener('click', function () {
      var button = document.getElementById('subBtn');
      var resultEl = document.getElementById('subResult');
      setBusy('subBtn', true);
      resultEl.textContent = 'Creating subscription session\u2026';

      fetch('/api/create-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          resultEl.textContent = '';
          if (!data.id) { resultEl.textContent = 'Backend did not return a session id: ' + JSON.stringify(data); return; }
          Konduyt.checkout({ sessionId: data.id });
        })
        .catch(function () { resultEl.textContent = 'Could not reach /api/create-subscription -- is your backend running?'; })
        .finally(function () { setBusy('subBtn', false); });
    });

    // Split payment: a marketplace settlement, not a shopper checkout --
    // calls your backend directly and shows the real result.
    document.getElementById('splitBtn').addEventListener('click', function () {
      var button = document.getElementById('splitBtn');
      var resultEl = document.getElementById('splitResult');
      setBusy('splitBtn', true);
      resultEl.textContent = 'Creating split payment\u2026';

      fetch('/api/create-split-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(function (res) { return res.json(); })
        .then(function (data) { resultEl.textContent = JSON.stringify(data); })
        .catch(function () { resultEl.textContent = 'Could not reach /api/create-split-payment -- is your backend running?'; })
        .finally(function () { setBusy('splitBtn', false); });
    });

    // Pay-as-you-go: your backend computes the real bill from usage it
    // already tracks, creates a real session, then the same real SDK
    // popup shows intelligence for that computed amount.
    document.getElementById('usageBtn').addEventListener('click', function () {
      var button = document.getElementById('usageBtn');
      var resultEl = document.getElementById('usageResult');
      setBusy('usageBtn', true);
      resultEl.textContent = 'Creating usage-bill session\u2026';

      fetch('/api/create-usage-bill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          resultEl.textContent = '';
          if (!data.id) { resultEl.textContent = 'Backend did not return a session id: ' + JSON.stringify(data); return; }
          Konduyt.checkout({ sessionId: data.id });
        })
        .catch(function () { resultEl.textContent = 'Could not reach /api/create-usage-bill -- is your backend running?'; })
        .finally(function () { setBusy('usageBtn', false); });
    });
  </script>
</body>
</html>`;
