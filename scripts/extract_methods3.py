"""Country -> local payment methods, extracted from konduyt-api app/routing.

Validated against the 8 countries the live /v1/demo/run endpoint actually
answers for, so a silent regression in the extraction is caught here rather
than shipped into the snippet.
"""
import re
import glob
import json
import collections

ROOT = "/workspace/repos/konduyt-api/app/routing"

# tax/VAT modules reuse the ("XX", "name", rate) tuple shape for tax lines.
EXCLUDE_FILE = re.compile(r"(tax|vat|_tests)\.py$")

PAT_COUNTRY_FIRST = re.compile(
    r'[\(,]\s*"([A-Z]{2})"\s*,\s*"([^"]{2,50})"\s*,')
PAT_PROVIDER_FIRST = re.compile(
    r'add\(\s*"[a-z_0-9]+"\s*,\s*"([A-Z]{2})"\s*,\s*"([^"]{2,50})"')
PAT_RAIL_IN_COUNTRY_FILE = re.compile(
    r'\(\s*"([a-z]{2})_[a-z_0-9]+"\s*,\s*"([A-Z_0-9]{2,40})"\s*,')

# Only actual currency codes and rail-category labels are noise. Do NOT
# exclude short method names -- ACH, EPS and "card" are real methods, and an
# earlier pass that filtered all 3-letter uppercase tokens silently dropped
# ACH and EPS.
CURRENCIES = set("""USD EUR GBP KES NGN BRL INR PLN ZAR AED CAD AUD CHF JPY
CNY SEK NOK DKK MXN ARS CLP COP PEN UYU BOB PYG VES GHS TZS UGX RWF ZMW
XOF XAF EGP MAD NGN BHD SAR QAR OMR KWD JOD ILS TRY RUB UAH CZK HUF RON
BGN HRK ISK NZD SGD MYR THB IDR PHP VND KRW TWD HKD PKR BDT LKR NPR""".split())
CATEGORY_LABELS = {"MOBILE_MONEY", "CARD", "CARDS", "BANK_TRANSFER",
                   "WALLET", "CASH", "OTHER", "UNKNOWN"}
# Lowercase category tokens and bare 2-letter codes are positional artefacts
# (a stray country/currency field matched as if it were a method name).
# "bank" is a generic positional token and is redundant wherever a country
# already has real bank rails (ACH, FedNow, RTP...). "card" is NOT filtered:
# for Bahrain the live endpoint's own method is literally "CARD", so dropping
# it would delete a real method.
TYPE_TOKENS = {"bank", "wallet", "cash", "mobile_money", "bank_transfer",
               "instant_transfer", "card_scheme", "others"}


def _is_noise(name: str) -> bool:
    if name.lower() in TYPE_TOKENS:
        return True
    if re.fullmatch(r"[A-Z]{2}", name):      # bare country code, e.g. "GB"
        return True
    if name.upper() in CURRENCIES:
        return True
    return False


def build():
    methods = collections.defaultdict(set)

    for path in sorted(glob.glob(f"{ROOT}/*.py")):
        base = path.rsplit("/", 1)[-1]
        if EXCLUDE_FILE.search(base):
            continue
        src = open(path, encoding="utf-8", errors="ignore").read()

        for cc, name in (PAT_COUNTRY_FIRST.findall(src)
                         + PAT_PROVIDER_FIRST.findall(src)):
            name = name.strip()
            if not name or _is_noise(name):
                continue
            methods[cc].add(name)

        for cc, name in PAT_RAIL_IN_COUNTRY_FILE.findall(src):
            if name in CATEGORY_LABELS:
                continue
            methods[cc.upper()].add(name)

    return {c: sorted(m) for c, m in sorted(methods.items())}


# Ground truth: what the deployed API returns today for these countries.
GROUND_TRUTH = {
    "KE": ["MPESA", "PESAPAL"],
    "US": ["ACH", "DEBIT/CREDIT_CARDS", "PAYPAL"],
    "GB": ["PAY_BY_BANK"],
    "NL": ["IDEAL"],
    "ES": ["BIZUM"],
    "AT": ["EPS"],
    "PL": ["PRZELEWY24"],
    "BH": ["CARD"],
}


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


if __name__ == "__main__":
    data = build()
    print("countries:", len(data), "| total methods:",
          sum(len(v) for v in data.values()))

    print("\nValidation against live endpoint:")
    bad = 0
    for cc, expect in sorted(GROUND_TRUTH.items()):
        got = data.get(cc, [])
        missing = [e for e in expect
                   if not any(norm(e) in norm(g) or norm(g) in norm(e) for g in got)]
        if missing:
            bad += 1
            print(f"  [FAIL] {cc}: missing {missing} | have {got}")
        else:
            print(f"  [PASS] {cc}: {got}")

    for cc in ("KE", "US", "GB", "AT"):
        print(f"\n{cc}: {data.get(cc)}")

    with open("/tmp/kdt/methods.json", "w") as fh:
        json.dump(data, fh, indent=1, ensure_ascii=False)
    print("\nwrote /tmp/kdt/methods.json")
    print("VALIDATION", "FAILED" if bad else "PASSED")