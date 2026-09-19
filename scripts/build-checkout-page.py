"""Generate the shared checkout page module from the working HTML/JS tab.

Starting from the page that already works (INTELLIGENCE_TESTING_SDK) means
the popup every backend snippet serves is the same markup and logic, not a
retyped near-copy that drifts.

The page used to carry its own embedded country -> local-methods table, which
meant a second frontend database that had to be regenerated and kept in step
with the API's. It now reads the country catalogue from the API's own
local_methods (the same array every other surface uses), so there is one
source of truth and nothing to regenerate. Only the same-origin rewrites and
the template-literal escaping differ from the SDK.

Run with --check to verify the generated files match this script without
writing them.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(os.path.dirname(HERE), "app", "dashboard")
PUBLIC = os.path.join(os.path.dirname(HERE), "public")

CHECK = "--check" in sys.argv

src = open(os.path.join(WEB, "intelligencesdk.js"), encoding="utf-8").read()
page = re.search(r"export const INTELLIGENCE_TESTING_SDK = `([\s\S]*)`;\s*$", src).group(1)

# The reference price is server-decided, so the same page works for every
# visit instead of a hardcoded KES 5,000.
page = page.replace("KES 5,000.00", "Your cart")

# Serve the backend same-origin now, so the absolute dev URL is wrong.
page = page.replace(
    "fetch('http://localhost:3000/api/create-payment'",
    "fetch('/api/create-payment'")
page = page.replace(
    "Could not reach your backend at localhost:3000 -- is it running?",
    "Could not reach the server that served this page.")

assert "localhost:3000" not in page
assert "LOCAL_METHODS" not in page, (
    "the country catalogue must come from the API's local_methods, not an "
    "embedded table")
assert "renderMethods(mergeIntelligenceMethods" in page, (
    "the page must merge local_methods with the ranked options")
assert ">>> konduyt-intelligence-methods (generated) >>>" in page, (
    "run node scripts/sync-intelligence-methods.mjs first")

# Guard the JS-template-literal delimiters.
assert "`" not in page, "backtick would break the JS template literal"
assert "${" not in page, "dollar-brace would break the JS template literal"

header = '''// The single checkout page every backend snippet serves at "/".
//
// Generated from the working HTML/CSS/JS tab so all twelve language servers
// render the identical popup -- one definition, not twelve drifting copies.
// It lists every real local payment method for the selected country, read
// from the intelligence endpoint's own local_methods (the country's complete
// catalogue, including methods Konduyt cannot execute yet) and overlays the
// ranked, priced options Konduyt can actually route. No country table is
// embedded here: the API is the one source of truth.
//
// Regenerate with scripts/build-checkout-page.py rather than editing by hand.
export const SHARED_CHECKOUT_HTML = `'''

targets = [
    (os.path.join(WEB, "checkoutpage.js"), header + page + "`;\n"),
    # The same page is shipped as a plain .html file for the backend snippets
    # to serve, where it is read verbatim rather than evaluated as a JS
    # template literal. Writing both here keeps them from drifting; the only
    # difference is the backslash escaping the template literal needs.
    (os.path.join(PUBLIC, "checkout-page.html"), page.replace("\\\\", "\\")),
]

stale = []
for path, content in targets:
    existing = open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if existing == content:
        print("up to date", path)
        continue
    if CHECK:
        stale.append(path)
        continue
    open(path, "w", encoding="utf-8").write(content)
    print("wrote", path)

if stale:
    for path in stale:
        print("ERROR stale:", path, "-- run scripts/build-checkout-page.py", file=sys.stderr)
    sys.exit(1)
