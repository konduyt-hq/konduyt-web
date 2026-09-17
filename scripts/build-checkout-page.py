"""Generate the shared checkout page module from the working HTML/JS tab.

Starting from the page that already works (INTELLIGENCE_TESTING_SDK) means
the popup every backend snippet serves is the same markup and logic, not a
retyped near-copy that drifts.
"""
import re
import json
import glob

WEB = "/workspace/repos/konduyt-web/app/dashboard"

page = open(f"{WEB}/intelligencesdk.js", encoding="utf-8").read()
page = re.search(r"export const INTELLIGENCE_TESTING_SDK = `([\s\S]*)`;\s*$", page).group(1)

methods = json.loads(
    open(f"{WEB}/localmethods.js", encoding="utf-8").read()
    .split("export const LOCAL_METHODS = ")[1].split(";\n")[0])

# The reference price is server-decided, so the same page works for every
# visit instead of a hardcoded KES 5,000.
page = page.replace("KES 5,000.00", "Your cart")

# Serve the backend same-origin now, so the absolute dev URL is wrong.
page = page.replace(
    "fetch('http://localhost:3000/api/create-payment'",
    "fetch('/api/create-payment'")
page = page.replace(
    "fetch('http://localhost:3000/api/create-subscription'",
    "fetch('/api/create-subscription'")
page = page.replace(
    "Could not reach your backend at localhost:3000 -- is it running?",
    "Could not reach the server that served this page.")

# Ranked options come from the live API, which only answers for 8 countries
# today. The popup must list every real local method per country, so the
# full table is embedded and merged with whatever ranking came back.
page = page.replace(
    "renderRails(options);",
    "renderMethods(options, iso);")

# "Best value" must mark a method with a real price. Once unpriced methods
# are listed, index 0 can be one of them, which would badge a rail with no
# fee as the cheapest.
page = page.replace(
    "        var isBest = i === 0;",
    "        var isBest = i === bestIndex(options);")

page = page.replace("function renderRails(options) {", """function renderMethods(options, iso) {
      // Start from every real local method this country has (embedded table),
      // then attach the live ranked fee wherever the API priced that method.
      // A method with no live price still gets listed -- it exists, and
      // hiding it would understate what the customer can actually pay with.
      var priced = {};
      for (var k = 0; k < options.length; k++) {
        priced[normKey(options[k].label)] = options[k];
      }
      var listed = (LOCAL_METHODS[iso] || []).slice();
      var rows = [];
      for (var m = 0; m < listed.length; m++) {
        rows.push(priced[normKey(listed[m])] || { label: listed[m], fee_minor: null });
      }
      // Anything the API priced but the local table didn't list: keep it.
      for (var p = 0; p < options.length; p++) {
        var seen = false;
        for (var q = 0; q < listed.length; q++) {
          if (normKey(listed[q]) === normKey(options[p].label)) { seen = true; break; }
        }
        if (!seen) rows.push(options[p]);
      }
      renderRails(rows);
    }

    function normKey(s) {
      return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function bestIndex(options) {
      // Cheapest method that actually carries a fee. Returns -1 when the API
      // priced nothing for this country, so no badge is shown at all rather
      // than badging an unpriced rail as the best value.
      var best = -1;
      for (var i = 0; i < options.length; i++) {
        if (options[i].fee_minor == null) continue;
        if (best === -1 || options[i].fee_minor < options[best].fee_minor) best = i;
      }
      return best;
    }

    function renderRails(options) {""")

# A bare lowercase "card" is a pricing CATEGORY declared in pricing_data.py,
# not a product name. Give it a readable label rather than shouting "card"
# or hiding a capability most countries genuinely have.
GENERIC_DISPLAY = {"card": "Cards", "bank": "Bank transfer"}
methods = {c: [GENERIC_DISPLAY.get(m, m) for m in v] for c, v in methods.items()}

# Embed the table. JSON is safe inside a JS array literal.
page = page.replace(
    "var AMOUNT_MINOR = 500000;",
    "var LOCAL_METHODS = " + json.dumps(methods, ensure_ascii=False) + ";\n    var AMOUNT_MINOR = 500000;")

assert "LOCAL_METHODS" in page
assert "renderMethods" in page
assert "localhost:3000" not in page

# Guard the JS-template-literal delimiters.
assert "`" not in page, "backtick would break the JS template literal"
assert "${" not in page, "dollar-brace would break the JS template literal"

header = '''// The single checkout page every backend snippet serves at "/".
//
// Generated from the working HTML/CSS/JS tab so all twelve language servers
// render the identical popup -- one definition, not twelve drifting copies.
// It lists every real local payment method for the selected country (table
// generated from konduyt-api app/routing/*.py), attaching a live ranked fee
// wherever the intelligence endpoint priced one.
//
// Regenerate with scripts/build-checkout-page.py rather than editing by hand.
export const SHARED_CHECKOUT_HTML = `'''

out = f"{WEB}/checkoutpage.js"
open(out, "w", encoding="utf-8").write(header + page + "`;\n")
print("wrote", out)
print("countries embedded:", len(methods))
print("bytes:", len(page))