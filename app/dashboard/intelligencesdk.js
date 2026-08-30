// A real, standalone demo -- one self-contained HTML file, HTML + CSS + JS
// together, no build step, no dependency, no backend needed at all. Same
// approach as konduyt.dev/demo/ itself: real per-method fee formulas
// (matching each provider's real published pricing), real geo detection
// and real live FX conversion via two simple public APIs -- nothing tied
// to a publishable key, a project, or Konduyt's own backend. This is
// purely "here's what the intelligence layer shows a shopper", reliably,
// for anyone who opens this file.
//
// Two scenarios, both real: a FIXED price (like a product you already
// know the price of) and a price the SHOPPER TYPES IN (like a donation).
// Same intelligence table either way -- just where the amount comes from
// differs.
//
// Connecting to REAL payment providers and creating a REAL charge is a
// different, separate thing -- that's what the 12 backend language tabs
// below implement, using your own real publishable/secret keys. This file
// is only the intelligence preview, same as konduyt.dev/demo/ is.

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

  <script>
    // Real per-method fee formulas -- each provider's own real, published
    // pricing, not fabricated. M-Pesa uses its real flat tariff bands
    // (not a percentage); the rest use their real percentage rates. Same
    // rails and formulas as konduyt.dev/demo/ itself.
    function mpesaTariffMinor(kesMinor) {
      var kes = kesMinor / 100;
      var bands = [
        [100, 0], [500, 7], [1000, 13], [1500, 23], [2500, 33], [3500, 53],
        [5000, 57], [7500, 78], [10000, 90], [15000, 100], [20000, 105],
        [35000, 108], [50000, 108], [150000, 108]
      ];
      for (var i = 0; i < bands.length; i++) if (kes <= bands[i][0]) return bands[i][1] * 100;
      return 108 * 100;
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
  </script>
</body>
</html>`;
