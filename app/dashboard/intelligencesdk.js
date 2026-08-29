// A real, standalone testing SDK -- one self-contained HTML file, HTML +
// CSS + JS together, no build step, no dependency. Copy it, save it as
// intelligence.html, open it directly in a browser: it calls Konduyt's
// real /checkout/config endpoint with your own publishable key and
// renders the actual payment intelligence layer -- ranked methods, real
// fees, real settlement times, cheapest highlighted -- exactly what a real
// shopper's checkout would be built on, not a mockup.
//
// Deliberately separate from the per-language payment-creation snippets in
// langsnippets.js -- those show CREATING a payment; this shows Konduyt's
// own routing intelligence for a given amount, standalone. {{API}} and
// {{PUBLISHABLE_KEY}} are substituted at render time, the same pattern as
// every other snippet.

export const INTELLIGENCE_TESTING_SDK = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Konduyt Payment Intelligence — Test</title>
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
  .sub { color: #6b6b6b; font-size: 13px; margin-bottom: 24px; }
  .controls { display: flex; gap: 10px; margin-bottom: 24px; }
  .controls input {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
  }
  .controls button {
    background: #0a0a0a;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
  .controls button:disabled { opacity: 0.5; cursor: default; }
  .method {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #e5e5e5;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 8px;
  }
  .method.best { border-color: #0a0a0a; background: #fafafa; }
  .method-name { font-weight: 700; font-size: 14px; }
  .method-badge {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #0a0a0a;
    color: #fff;
    padding: 3px 7px;
    border-radius: 5px;
    margin-left: 8px;
  }
  .method-fee { font-size: 13px; color: #6b6b6b; text-align: right; }
  .empty, .error { color: #6b6b6b; font-size: 13px; padding: 20px 0; text-align: center; }
  .error { color: #a23b2f; }
</style>
</head>
<body>
  <h1>Payment intelligence</h1>
  <p class="sub">Real, live fee/routing data from your own connected providers — not a mockup.</p>

  <div class="controls">
    <input id="amount" type="number" value="5000" placeholder="Amount" />
    <button id="run">Check methods</button>
  </div>

  <div id="results"></div>

  <script>
    var API = '{{API}}';
    var PUBLISHABLE_KEY = '{{PUBLISHABLE_KEY}}';

    function checkMethods() {
      var amountInput = document.getElementById('amount');
      var button = document.getElementById('run');
      var results = document.getElementById('results');

      var amount = Math.round(parseFloat(amountInput.value || '0') * 100);
      if (!amount || amount <= 0) {
        results.innerHTML = '<div class="error">Enter a real amount first.</div>';
        return;
      }

      button.disabled = true;
      results.innerHTML = '<div class="empty">Loading real methods\u2026</div>';

      var url = API + '/checkout/config?pk=' + PUBLISHABLE_KEY + '&amount=' + amount + '&currency=KES';

      fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.methods || data.methods.length === 0) {
            results.innerHTML = '<div class="empty">No payment methods available yet \u2014 connect a provider in Payment Providers.</div>';
            return;
          }

          var cheapest = data.methods[0];
          for (var i = 1; i < data.methods.length; i++) {
            var a = data.methods[i].fee_percent == null ? Infinity : data.methods[i].fee_percent;
            var b = cheapest.fee_percent == null ? Infinity : cheapest.fee_percent;
            if (a < b) cheapest = data.methods[i];
          }

          var html = '';
          for (var j = 0; j < data.methods.length; j++) {
            var m = data.methods[j];
            var isBest = m.id === cheapest.id;
            var feeText = m.fee_percent != null ? (m.fee_percent + '% fee') : 'fee varies';
            html += '<div class="method' + (isBest ? ' best' : '') + '">' +
              '<span class="method-name">' + m.name + (isBest ? '<span class="method-badge">Cheapest</span>' : '') + '</span>' +
              '<span class="method-fee">' + feeText + '</span>' +
              '</div>';
          }
          results.innerHTML = html;
        })
        .catch(function () {
          results.innerHTML = '<div class="error">Could not reach Konduyt. Check your publishable key and try again.</div>';
        })
        .finally(function () {
          button.disabled = false;
        });
    }

    document.getElementById('run').addEventListener('click', checkMethods);
    checkMethods(); // run once on load
  </script>
</body>
</html>`;
