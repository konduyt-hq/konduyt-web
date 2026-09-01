// A real, standalone demo -- one self-contained HTML file, HTML + CSS + JS
// together, no build step, no dependency. Two independent parts:
//
// 1. The intelligence preview (fixed price + shopper-entered price tables):
//    genuinely standalone, no backend or key needed at all -- real per-
//    method fee formulas, real geo detection, real live FX conversion via
//    two public APIs. Same approach konduyt.dev/demo/ itself uses.
//
// 2. A real "Buy now" section: amountInput/emailInput/buyButton/resultDiv
//    are real ids, and the button really does POST to
//    /api/create-payment on http://localhost:3000 -- the exact route every
//    backend language tab (JS, Python, PHP, Go, ...) implements or shows
//    how to mount. Open this file next to a running backend from any of
//    those tabs and the button actually works end to end.

export const INTELLIGENCE_TESTING_SDK = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Konduyt — Payment Intelligence Demo</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
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
  .sub { color: #6b6b6b; font-size: 13px; margin-bottom: 4px; line-height: 1.5; }
  .fx-note { font-size: 11.5px; color: #8a8a92; margin-bottom: 18px; }
  .amount-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .amount-row input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { text-align: left; font-size: 11px; color: #6b6b6b; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 8px 4px; border-bottom: 1px solid #e5e5e5; }
  td { padding: 10px 4px; font-size: 13.5px; border-bottom: 1px solid #f0f0f0; }
  tr.best td { font-weight: 700; }
  .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
    background: #0a0a0a; color: #fff; padding: 3px 7px; border-radius: 5px; margin-left: 6px; }
  .saving { font-size: 12.5px; color: #6b6b6b; margin-top: 6px; }
  .saving strong { color: #0a0a0a; }
  .buy-section { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5; }
  .buy-row { display: flex; gap: 8px; margin-bottom: 10px; }
  .buy-row input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
  }
  #buyButton {
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
  #buyButton:disabled { opacity: 0.5; cursor: default; }
  #resultDiv { margin-top: 12px; font-size: 12.5px; color: #6b6b6b; word-break: break-all; }
</style>
</head>
<body>
  <h1>Payment intelligence</h1>
  <p class="sub">Same payment, every rail Konduyt can route it through — ranked cheapest-first by real fees.</p>
  <p class="fx-note" id="fxNote">Detecting your location…</p>

  <h2>Fixed price (e.g. a product)</h2>
  <div id="fixedTable"></div>

  <h2>Shopper-entered price (e.g. a donation)</h2>
  <div class="amount-row">
    <input id="customAmount" type="number" value="1000" placeholder="Amount" />
  </div>
  <div id="customTable"></div>

  <div class="buy-section">
    <h2>Buy now — a real charge</h2>
    <p class="sub">
      Calls YOUR OWN backend at <code>http://localhost:3000/api/create-payment</code> --
      run any one of the 12 backend language tabs first, then click Buy.
      Konduyt is never called directly from this page; there is no key here at all.
    </p>
    <div class="buy-row">
      <input id="amountInput" type="number" value="5000" placeholder="Amount" />
      <input id="emailInput" type="email" value="customer@example.com" placeholder="Email" />
    </div>
    <button id="buyButton" type="button">Buy now</button>
    <div id="resultDiv"></div>
  </div>

  <script>
    // Real per-method fee formulas -- each provider's own real, published
    // pricing, not fabricated. The rest use their real percentage rates.
    // Same rails and formulas as konduyt.dev/demo/ itself.
    //
    // M-Pesa: this is a customer paying a MERCHANT (a Buy Goods/Till
    // payment) -- what Konduyt actually routes -- so it uses Safaricom's
    // real "Lipa na M-Pesa Buy Goods" MERCHANT charge (0.55%, capped at a
    // flat KES 200 above KES 36,363; free under KES 501), not the
    // person-to-person "M-Pesa Charges" table. Both tables are real and
    // both are published by Safaricom on the same page -- they're just
    // for two different real transactions. This file previously used the
    // P2P table by mistake, which meant it disagreed with Konduyt's own
    // real, sourced backend data (rp_pricing_rules) for the exact same
    // scenario -- fixed to match.
    function mpesaTariffMinor(kesMinor) {
      var kes = kesMinor / 100;
      if (kes <= 500) return 0;
      var fee = Math.round(kesMinor * 0.0055);
      var capMinor = 200 * 100;
      return fee > capMinor ? capMinor : fee;
    }
    var RAILS = [
      { id: 'mpesa', name: 'M-Pesa', feeKesMinor: function (b) { return mpesaTariffMinor(b); } },
      { id: 'pesalink', name: 'PesaLink', feeKesMinor: function (b) { return Math.round(b * 0.005); } },
      { id: 'card', name: 'Card', feeKesMinor: function (b) { return Math.round(b * 0.029); } },
      { id: 'applepay', name: 'Apple Pay', feeKesMinor: function (b) { return Math.round(b * 0.029); } },
      { id: 'paypal', name: 'PayPal', feeKesMinor: function (b) { return Math.round(b * 0.0349); } }
    ];

    var currency = 'KES';
    var rate = 1;
    var country = null;
    var fxLive = false;

    function fmt(amountMinor, ccy) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy }).format(amountMinor / 100);
      } catch (e) {
        return ccy + ' ' + (amountMinor / 100).toFixed(2);
      }
    }

    function renderTable(containerId, baseKesMinor) {
      var ranked = RAILS.map(function (rail) {
        var feeKes = rail.feeKesMinor(baseKesMinor);
        var feeMinor = Math.round(feeKes * rate);
        var effPct = Math.round((feeKes / baseKesMinor) * 1000) / 10;
        return { id: rail.id, name: rail.name, feeMinor: feeMinor, effPct: effPct };
      }).sort(function (a, b) { return a.feeMinor - b.feeMinor; });

      var cheapest = ranked[0], dearest = ranked[ranked.length - 1];
      var displayAmount = Math.round(baseKesMinor * rate);

      var html = '<table><tr><th>Pay with</th><th>Fee</th><th></th></tr>';
      for (var i = 0; i < ranked.length; i++) {
        var r = ranked[i];
        var isBest = r.id === cheapest.id;
        html += '<tr' + (isBest ? ' class="best"' : '') + '>' +
          '<td>' + r.name + (isBest ? '<span class="badge">Best value</span>' : '') + '</td>' +
          '<td>' + fmt(r.feeMinor, currency) + ' <span style="color:#8a8a92">(' + r.effPct + '%)</span></td>' +
          '<td></td></tr>';
      }
      html += '</table>';
      html += '<div class="saving">On ' + fmt(displayAmount, currency) + ': you keep <strong>' +
        fmt(dearest.feeMinor - cheapest.feeMinor, currency) + ' more</strong> using ' + cheapest.name +
        ' instead of ' + dearest.name + '.</div>';
      document.getElementById(containerId).innerHTML = html;
    }

    function renderAll() {
      renderTable('fixedTable', 420000); // KES 4,200.00 fixed reference price
      var custom = Math.round(parseFloat(document.getElementById('customAmount').value || '0') * 100);
      renderTable('customTable', custom > 0 ? custom : 100);

      var note = fxLive && currency !== 'KES'
        ? 'Costs shown in ' + currency + (country ? ' for ' + country : '') + ', converted live from KES.'
        : 'Showing native KES (live conversion unavailable for your location).';
      document.getElementById('fxNote').textContent = note;
    }

    // Real geo + real live FX -- same two simple public APIs
    // konduyt.dev/demo/ itself uses, so this works standalone with no
    // Konduyt account, key, or backend needed at all.
    fetch('https://ipapi.co/json/')
      .then(function (r) { return r.json(); })
      .then(function (geo) {
        var cur = geo && geo.currency ? geo.currency : 'KES';
        country = geo && geo.country_name ? geo.country_name : null;
        if (cur === 'KES') { currency = 'KES'; rate = 1; fxLive = true; renderAll(); return; }
        return fetch('https://open.er-api.com/v6/latest/KES')
          .then(function (r) { return r.json(); })
          .then(function (fx) {
            var r2 = fx && fx.rates && fx.rates[cur];
            if (r2) { currency = cur; rate = r2; fxLive = true; }
            renderAll();
          });
      })
      .catch(function () { renderAll(); });

    document.getElementById('customAmount').addEventListener('input', renderAll);
    renderAll(); // render once immediately with KES, before geo/FX resolves

    // Real Buy button -- calls YOUR OWN backend, never Konduyt directly.
    // Same pattern as every other backend language tab: the frontend never
    // holds a secret key, only your server does.
    document.getElementById('buyButton').addEventListener('click', function () {
      var button = document.getElementById('buyButton');
      var resultDiv = document.getElementById('resultDiv');
      var amount = document.getElementById('amountInput').value;
      var email = document.getElementById('emailInput').value;

      button.disabled = true;
      button.textContent = 'Processing…';
      resultDiv.textContent = '';

      fetch('http://localhost:3000/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), email: email })
      })
        .then(function (r) { return r.json(); })
        .then(function (payment) {
          resultDiv.textContent = JSON.stringify(payment);
        })
        .catch(function () {
          resultDiv.textContent = 'Could not reach your backend at localhost:3000 -- is it running?';
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Buy now';
        });
    });
  </script>
</body>
</html>`;
