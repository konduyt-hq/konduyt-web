"""Country -> real local payment methods, from konduyt-api app/routing.

The routing modules declare country capability in several different shapes.
An extractor that understands only one of them silently reports whole
countries as having no way to pay, which reads as a product bug rather than
an extraction gap, so every shape is handled and the result is validated
against the countries the live endpoint actually answers for.

Shapes handled:
  1. ("XX", "Method name", category, ...)                tuple
  2. add("provider", "XX", "Method", ...)                provider registry
  3. "XX": [("METHOD_ID", "category", ...)]              dict-keyed (europe.py)
  4. ("xx_rail_id", "RAIL_NAME", ...)                    country-prefixed rails

Display names come from local_methods.py's own _LABELS/_ACRONYMS mapping, so
the popup shows "M-Pesa" rather than "MPESA" instead of a second naming
scheme invented here.
"""
import re
import glob
import json
import collections

ROOT = "/workspace/repos/konduyt-api/app/routing"

# tax/VAT modules reuse the ("XX", "name", rate) tuple shape for tax lines.
EXCLUDE_FILE = re.compile(r"(tax|vat|_tests)\.py$")

PAT_TUPLE = re.compile(r'[\(,]\s*"([A-Z]{2})"\s*,\s*"([^"]{2,60})"\s*,')
PAT_PROVIDER = re.compile(
    r'add\(\s*"[a-z_0-9]+"\s*,\s*"([A-Z]{2})"\s*,\s*"([^"]{2,60})"')
PAT_DICT_KEY = re.compile(
    r'"([A-Z]{2})"\s*:\s*\[([^\]]*)\]', re.S)
PAT_DICT_METHOD = re.compile(r'\(\s*"([^"]+)"\s*,\s*"([a-z_]+)"')
# africa.py shape: "TN": { "name": ..., "rails": [("E_DINAR", "bank_transfer", ...)] }
PAT_BRACE_KEY = re.compile(r'"([A-Z]{2})"\s*:\s*\{(.*?)\n\s{4}\},', re.S)
PAT_RAILS_LIST = re.compile(r'"rails"\s*:\s*\[(.*?)\]', re.S)
# Provider-only pricing rows carry no method string: add("mpesa_mz", "MZ", pct=...).
# The provider id names the method, with the country suffix stripped.
PAT_ADD_PROVIDER_ONLY = re.compile(
    r'add\(\s*"([a-z_0-9]+)"\s*,\s*"([A-Z]{2})"\s*,\s*(?!")')
# provider_verification.py records each confirmed provider as a dict whose
# country is a *list* attribute rather than a positional argument:
#   "<id>": dict(type="DIRECT_LOCAL", status="COVERAGE_VERIFIED", ...,
#                countries=["YE"], ...)
# None of the patterns above match that shape, so every country whose only
# confirmed provider lives here (YE, TM, AZ) listed no methods at all. Only
# DIRECT_LOCAL rows name something a shopper picks; GLOBAL_PSP/REGIONAL_PSP
# rows are processors and CARD_NETWORK/SETTLEMENT_NETWORK rows are
# infrastructure, so those stay out for the same reason KNOWN_PSP does.
PAT_VERIFIED_LOCAL = re.compile(
    r'"([a-z_0-9]+)":\s*dict\(\s*type="DIRECT_LOCAL"\s*,\s*'
    r'status="COVERAGE_VERIFIED"\s*,(.*?)countries=\[([^\]]*)\]', re.S)
PAT_RAIL = re.compile(r'\(\s*"([a-z]{2})_[a-z_0-9]+"\s*,\s*"([A-Z_0-9]{2,40})"\s*,')

CURRENCIES = set("""USD EUR GBP KES NGN BRL INR PLN ZAR AED CAD AUD CHF JPY
CNY SEK NOK DKK MXN ARS CLP COP PEN UYU BOB PYG VES GHS TZS UGX RWF ZMW
XOF XAF EGP MAD BHD SAR QAR OMR KWD JOD ILS TRY RUB UAH CZK HUF RON BGN
HRK ISK NZD SGD MYR THB IDR PHP VND KRW TWD HKD PKR BDT LKR NPR""".split())

# Category tokens are not product names -- they are rendered through the
# label map (bank_transfer -> "Bank Transfer") instead of being dropped, so a
# country whose only recorded capability is generic still lists it.
CATEGORIES = {"mobile_money", "card", "cards", "bank_transfer", "wallet",
              "cash", "other", "unknown", "bank", "account_to_account"}


def _label_map():
    """Parse local_methods.py's own display maps so names match the product."""
    src = open(f"{ROOT}/local_methods.py", encoding="utf-8").read()
    labels = {}
    for block in ("_LABELS", "_ACRONYMS"):
        m = re.search(block + r"\s*=\s*\{([^}]*)\}", src, re.S)
        if not m:
            continue
        for k, v in re.findall(r'"([^"]+)"\s*:\s*"([^"]*)"', m.group(1)):
            labels.setdefault(k.upper(), v)
    return labels


LABELS = _label_map()


def display(method_id: str) -> str:
    """Human name for a method id, falling back to a readable form."""
    key = method_id.upper()
    if key in LABELS:
        return LABELS[key]
    if method_id.lower() in LABELS:
        return LABELS[method_id.lower()]
    if method_id.lower() in CATEGORIES:
        return {"mobile_money": "Mobile Money", "card": "Card", "cards": "Cards",
                "bank_transfer": "Bank Transfer", "bank": "Bank Transfer",
                "wallet": "Wallet", "account_to_account": "Account to Account",
                "cash": "Cash", "other": "Other"}.get(method_id.lower(), method_id)
    # Country-prefixed ids like KE_MPESA read better as "MPESA" then labelled.
    if re.fullmatch(r"[A-Z]{2}_[A-Z0-9_]+", key):
        stripped = key[3:]
        if stripped in LABELS:
            return LABELS[stripped]
        return _readable(stripped)
    return _readable(method_id)


def _readable(raw: str) -> str:
    """Slug -> words. "E_DINAR" -> "E Dinar", "npci_upi" -> "Npci Upi"."""
    if "_" not in raw and not raw.islower():
        return raw
    return " ".join(w.upper() if len(w) <= 3 else w.capitalize()
                    for w in re.split(r"[_ ]+", raw) if w)


def sepa_scope():
    """SEPA geographical scope, read from europe.py's own list."""
    src = open(f"{ROOT}/europe.py", encoding="utf-8").read()
    m = re.search(r"SEPA_SCOPE\s*=\s*\{([^}]*)\}", src, re.S)
    return set(re.findall(r'"([A-Z]{2})"', m.group(1))) if m else set()


def default_methods():
    """Rails every country gets regardless of its own list, per europe.py:
    methods = LOCAL_METHODS.get(code, []) + _DEFAULT_METHODS."""
    src = open(f"{ROOT}/europe.py", encoding="utf-8").read()
    m = re.search(r"_DEFAULT_METHODS\s*=\s*\[([^\]]*)\]", src, re.S)
    ids = re.findall(r'\("([^"]+)"', m.group(1)) if m else []
    return [display(i) for i in ids]


# Provider-only rows name a PSP, not a product the shopper picks: "stripe" and
# "flutterwave" are processors, and listing them as local methods would put a
# vendor name in a list of what the customer can pay with.
KNOWN_PSP = {
    "stripe", "paystack", "flutterwave", "wise", "adyen", "checkout",
    "dlocal", "paypal", "braintree", "rapyd", "airwallex", "worldpay",
    "nuvei", "paysafe", "mollie", "klarna", "affirm", "mercadopago",
    "payoneer", "skrill", "revolut", "square", "block", "fiserv",
    "globalpayments", "shift4", "trustly", "truevo", "unlimint", "xendit",
    "midtrans", "2c2p", "omise", "paysera", "twocheckout",
}
SLUG_NOISE = {"regional", "intl", "local", "bank", "card", "acquirer", "psp"}

# Ids that are real and verified but are not something a shopper picks at
# checkout: "daraja" is Safaricom's developer API platform for M-Pesa, and
# M-Pesa itself is already listed for KE. Naming the integration layer in a
# list of what the customer can pay with would be wrong.
NON_METHOD_IDS = {"daraja"}

# Provider ids ending in a descriptor rather than a product name, e.g.
# "andorra_regulated_banks" -- a category of banks, not a rail.
SLUG_DESCRIPTOR_TAIL = re.compile(r"(banks|regulated|network|scheme)s?$")


def _same_product(slug: str, existing: str) -> bool:
    """Whether a provider id already appears in a country's method list.

    Compares ignoring case and punctuation, which catches the spellings that
    genuinely differ between the provider registry and the method table
    (liqpay/LiqPay, iris/IRIS, ropay/RoPay, mach/MACH, poli/POLi, modo/MODO).

    Deliberately NOT a substring test: "yape_empresa" is a merchant variant
    of Yape and "bcv_pago_movil" is a bank's Pago Movil, but "spei" is not
    Banxico's SPEI system as a whole and "pago movil" is not one bank's
    implementation of it. Those are real, distinct entries.
    """
    norm = _norm_key
    if norm(slug) == norm(existing):
        return True
    # An id that prefixes the owning institution onto a product the country
    # already lists ("banxico_spei" when "SPEI" is present) is that same
    # system, not a second one. Only the trailing segment is considered, so
    # "yape_empresa" and "bcv_pago_movil" are unaffected.
    if "_" in slug and norm(slug.rsplit("_", 1)[1]) == norm(existing):
        return True
    # A combined label the method table already carries ("Cartes Bancaires /
    # Wero") means the product is listed; adding it again would repeat it.
    return any(norm(part) == norm(slug) for part in existing.split("/"))


def _norm_key(s: str) -> str:
    """Case- and punctuation-insensitive key for comparing product names."""
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _psp_scope():
    """Provider ids the repo treats as global PSPs, from local_methods.py."""
    src = open(f"{ROOT}/local_methods.py", encoding="utf-8").read()
    return src


def _clean_slug(slug, cc):
    for suffix in ("_" + cc.lower(), cc.lower()):
        if slug.endswith(suffix):
            slug = slug[: -len(suffix)]
            break
    return slug


def build(with_generic=True):
    """country -> sorted display names.

    with_generic controls whether bare category rows (bank_transfer, wallet)
    are listed. They are real capability, so they are kept; the flag exists so
    the validator can compare like for like.
    """
    found = collections.defaultdict(set)
    # country -> provider ids confirmed in provider_verification.py, merged
    # after every file is read so duplicate detection sees the full picture.
    verified = collections.defaultdict(set)

    def add(cc, name):
        name = name.strip()
        if not name or name.upper() in CURRENCIES:
            return
        if re.fullmatch(r"[A-Z]{2}", name):      # stray country code
            return
        if name.lower() in CATEGORIES and not with_generic:
            return
        found[cc].add(display(name))

    for path in sorted(glob.glob(f"{ROOT}/*.py")):
        base = path.rsplit("/", 1)[-1]
        if EXCLUDE_FILE.search(base):
            continue
        src = open(path, encoding="utf-8", errors="ignore").read()

        for cc, name in PAT_TUPLE.findall(src) + PAT_PROVIDER.findall(src):
            add(cc, name)

        # dict-keyed regions, e.g. "CZ": [("CZ_BANK", "bank_transfer", ...)]
        for cc, body in PAT_DICT_KEY.findall(src):
            for method_id, category in PAT_DICT_METHOD.findall(body):
                add(cc, method_id)
                if with_generic:
                    add(cc, category)

        for cc, name in PAT_RAIL.findall(src):
            add(cc.upper(), name)

        # africa.py brace-keyed regions with a "rails" list.
        for cc, body in PAT_BRACE_KEY.findall(src):
            m = PAT_RAILS_LIST.search(body)
            if not m:
                continue
            for method_id, category in PAT_DICT_METHOD.findall(m.group(1)):
                add(cc, method_id)
                if with_generic:
                    add(cc, category)

        # Provider-only rows name the method via the provider id.
        for provider, cc in PAT_ADD_PROVIDER_ONLY.findall(src):
            slug = _clean_slug(provider, cc)
            if slug in SLUG_NOISE or slug in KNOWN_PSP or len(slug) < 3:
                continue
            add(cc, slug)

        # Confirmed providers recorded as countries=[...] dict rows. The id
        # names the product the shopper picks, same as the add(...) rows
        # above, so it is cleaned and labelled identically. Collected rather
        # than added here: provider_verification.py sorts before the
        # continent modules that spell the same products their own way, so
        # the duplicate check has to run once every file has been read.
        for provider, _body, ccs in PAT_VERIFIED_LOCAL.findall(src):
            for cc in re.findall(r'"([A-Z]{2})"', ccs):
                slug = _clean_slug(provider, cc)
                if slug in SLUG_NOISE or slug in KNOWN_PSP or len(slug) < 3:
                    continue
                if slug in NON_METHOD_IDS or SLUG_DESCRIPTOR_TAIL.search(slug):
                    continue
                verified[cc].add(slug)

    # Merge the verified providers now that every file has been read, so a
    # product the method table already names (MACH, IRIS, LiqPay, POLi, MODO)
    # cannot gain a second, differently-spelled row for the same country.
    for cc, slugs in verified.items():
        for slug in slugs:
            if any(_same_product(slug, m) for m in found.get(cc, ())):
                continue
            add(cc, slug)

    # Every SEPA country also carries the default rails, whether or not it has
    # its own entry -- this is the loader's own rule, not an assumption, and
    # without it ~30 countries that genuinely accept card/bank show as empty.
    defaults = default_methods()
    for cc in sepa_scope():
        if with_generic:
            found[cc].update(defaults)
        else:
            found.setdefault(cc, set())

    # Two sources can name the same product with different capitalisation
    # ("YAPE" and "Yape", "WEBPAY" and "Webpay"), which would otherwise show
    # a shopper the same rail twice. Keep the better-capitalised spelling.
    out = {}
    for cc in sorted(found):
        if not found[cc]:
            continue
        out[cc] = _dedupe(found[cc])
    return out


def _dedupe(names):
    """Collapse names differing only by case/punctuation, keeping the best.

    Iterates a sorted copy and ranks deterministically, so the chosen
    spelling cannot depend on set iteration order between runs.
    """
    best = {}
    for name in sorted(names):
        key = _norm_key(name)
        cur = best.get(key)
        if cur is None or _name_rank(name) > _name_rank(cur):
            best[key] = name
    return sorted(best.values())


def _name_rank(name):
    """Rank a spelling so the most deliberate one wins a tie.

    "Yape" beats "YAPE" (an all-caps token is usually a raw id), and among
    mixed-case forms more internal capitals and a longer, hyphenated form
    read as the real brand: "KakaoPay" over "Kakaopay", "Interac e-Transfer"
    over "Interac Etransfer". The final element keeps it total, so equal
    candidates resolve the same way every run.
    """
    if name.isupper():
        case = 1
    elif name.islower():
        case = 0
    else:
        case = 2
    internal_caps = sum(1 for ch in name if ch.isupper())
    return (case, internal_caps, len(name), name)


# Countries the deployed endpoint answers with real methods today. Used as a
# regression guard: an extractor change must not lose any of these.
GROUND_TRUTH = {
    "KE": ["MPESA", "PESAPAL"],
    "US": ["ACH", "PAYPAL"],
    "GB": ["PAY_BY_BANK"],
    "NL": ["IDEAL"],
    "ES": ["BIZUM"],
    "AT": ["EPS"],
    "PL": ["PRZELEWY24"],
    "BH": ["CARD"],
    # Recovered by reading provider_verification.py's countries=[...] rows:
    # these had confirmed DIRECT_LOCAL providers but listed nothing at all.
    "YE": ["JAWALI"],
    "TM": ["ALTYN"],
    "AZ": ["M10"],
}


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def validate(data):
    failures = []
    for cc, expect in sorted(GROUND_TRUTH.items()):
        got = data.get(cc, [])
        for e in expect:
            if not any(norm(e) in norm(g) or norm(g) in norm(e) for g in got):
                failures.append(f"{cc}: lost {e} (have {got})")
    return failures


if __name__ == "__main__":
    data = build()
    print("countries with >=1 method:", len(data))
    print("total method entries:", sum(len(v) for v in data.values()))
    fails = validate(data)
    print("ground-truth failures:", fails or "none")
    print("\nCZ:", data.get("CZ"))
    print("LT:", data.get("LT"))
    print("IN:", data.get("IN"))
    print("KE:", data.get("KE"))
    json.dump(data, open("/tmp/kdt/methods_full.json", "w"), indent=1, ensure_ascii=False)
    print("\nwrote /tmp/kdt/methods_full.json")