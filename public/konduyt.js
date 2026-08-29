/*!
 * konduyt.js — the Konduyt drop-in checkout.
 *
 * Include on your site:
 *   <script src="https://konduyt.dev/konduyt.js"></script>
 *
 * Then open the popup (PayPal-style) when your customer clicks Pay:
 *   Konduyt.checkout({
 *     publishableKey: "kdu_live_pub_xxx",   // safe to expose in the browser
 *     amount: 150000,                        // minor units (e.g. 1500.00 KES)
 *     currency: "KES",
 *     reference: "order_123",
 *     onSuccess: function (result) { ... },  // customer completed the step
 *     onClose:   function () { ... },        // customer closed the popup
 *
 *     // ---- OR: session mode (section 5) -- recommended when possible ----
 *     // Your server creates the session first (secret key):
 *     //   POST /v1/payment_sessions { amount, currency, customer_country, reference }
 *     //   -> { session_id, expires_at }
 *     // Then the browser only ever holds the opaque session_id -- amount,
 *     // currency and reference come from what your server fixed at
 *     // creation, never from anything editable in the browser:
 *     // sessionId: "kdu_sess_xxx",   // instead of publishableKey+amount+currency+reference
 *     //
 *     // If your server created the session with recurring: true (Netflix-
 *     // style, billed automatically going forward -- see POST
 *     // /v1/payment_sessions), the popup automatically shows a clear
 *     // "Recurring — charged every month" disclosure and changes the button
 *     // to "Subscribe" instead of "Pay". This is never something YOU
 *     // declare in checkout() itself -- only your server, at session
 *     // creation, decides it.
 *
 *     // ---- Appearance: you control the brand and experience ----
 *     theme: "light",          // "light" | "dark" | "system" (default "light")
 *     brandColor: "#2563eb",   // your accent color -- buttons, selection state
 *     logo: "https://you.com/logo.png",  // shown in the popup header
 *     borderRadius: 18,        // px, corners of the popup and its buttons
 *     font: "'Inter', sans-serif",       // font-family for the whole popup
 *     layout: "comfortable",   // "comfortable" | "compact"
 *
 *     // ---- Checkout behavior: you narrow, Konduyt still decides what's real ----
 *     allowedMethods: ["mpesa", "card"], // only show these IDs -- but only ones
 *                                        // Konduyt actually finds eligible for
 *                                        // THIS shopper are ever shown; this can
 *                                        // never add a method that isn't real.
 *     hiddenMethods: ["paypal_wallet"],  // never show these, even if eligible
 *     preferredMethods: ["mpesa","card"], // shown in THIS order, for whichever
 *                                        // of them are eligible -- methods not
 *                                        // listed keep their smart order,
 *                                        // appended after. (preferredMethod,
 *                                        // singular, still works as shorthand
 *                                        // for a one-item list.)
 *     smartOrdering: true,               // default. false = a neutral,
 *                                        // alphabetical order instead of
 *                                        // Konduyt's cheapest-first ranking --
 *                                        // ignored if preferredMethods is set.
 *   });
 *
 * The popup fetches the merchant's REAL eligible methods from Konduyt for the
 * actual shopper and transaction (country, currency, amount) using the
 * publishable key -- not a static list. It NEVER handles your secret key —
 * the actual charge is created by YOUR server with the secret key
 * (POST /v1/payments). This mirrors PayPal: the popup collects intent, your
 * server captures the money.
 *
 * Customization changes what's SHOWN and in what ORDER. It can never change
 * what's ELIGIBLE -- allowedMethods/hiddenMethods/preferredMethod only ever
 * filter or reorder the real methods Konduyt's eligibility engine already
 * returned for this shopper; they can't inject a method that isn't genuinely
 * available. "The merchant controls the brand and experience. Konduyt
 * controls the payment intelligence."
 */
(function () {
  "use strict";

  var API_BASE = "https://konduyt-api.onrender.com";
  var BRAND = "Konduyt.dev";

  var CURRENCY_SYMBOL = { KES: "KSh", USD: "$", GBP: "\u00a3", EUR: "\u20ac", NGN: "\u20a6", GHS: "\u20b5", ZAR: "R", INR: "\u20b9", BRL: "R$" };

  function fmt(amount, currency) {
    var major = (Number(amount) || 0) / 100;
    var sym = CURRENCY_SYMBOL[currency] || (currency ? currency + " " : "");
    return sym + major.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function nextStep(methodId) {
    if (methodId === "mpesa") return "An M-Pesa STK push is sent to your phone to authorise payment.";
    if (["apple_pay", "google_pay", "samsung_pay"].indexOf(methodId) > -1) return "Your device wallet opens to confirm.";
    if (methodId === "card") return "You'll enter your card details on the secure form.";
    if (methodId === "paypal_wallet") return "You'll be redirected to PayPal to approve.";
    if (methodId === "pix") return "Scan the Pix QR code to pay.";
    if (methodId === "upi") return "Approve the UPI request on your phone.";
    if (["bank_transfer", "rtgs", "pesalink", "ach", "sepa", "eft", "wire_transfer", "faster_payments"].indexOf(methodId) > -1) return "You'll be shown bank transfer / authorisation details.";
    return "You'll be taken to the provider's secure step to complete payment.";
  }

  // ---- Styles injected once -------------------------------------------------
  var STYLE_ID = "konduyt-dropin-styles";
  function darken(hex, amount) {
    // Used for the button's hover shade -- can't hardcode a "darker green"
    // when the brand color is now whatever the merchant chose.
    var h = (hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
    var r = Math.max(0, parseInt(h.substr(0, 2), 16) - amount);
    var g = Math.max(0, parseInt(h.substr(2, 2), 16) - amount);
    var b = Math.max(0, parseInt(h.substr(4, 2), 16) - amount);
    function pad(n) { var s = n.toString(16); return s.length === 1 ? "0" + s : s; }
    return "#" + pad(r) + pad(g) + pad(b);
  }

  function lighten(hex, amount) {
    // For the soft-tint background behind a selected method / spinner ring --
    // mixed toward white, not just a lower-opacity overlay, so it reads
    // correctly as a solid background regardless of what's behind it.
    var h = (hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
    var r = Math.min(255, parseInt(h.substr(0, 2), 16) + amount);
    var g = Math.min(255, parseInt(h.substr(2, 2), 16) + amount);
    var b = Math.min(255, parseInt(h.substr(4, 2), 16) + amount);
    function pad(n) { var s = n.toString(16); return s.length === 1 ? "0" + s : s; }
    return "#" + pad(r) + pad(g) + pad(b);
  }

  function contrastText(hex) {
    // Picks readable text for the brand-colored Pay button -- a bright
    // brand color (e.g. yellow) needs dark text; a dark one needs white.
    var h = (hex || "").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#04120a";
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    var brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? "#04120a" : "#ffffff";
  }

  function resolveTheme(opts) {
    if (opts.theme === "dark") return "dark";
    if (opts.theme === "system") {
      return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    }
    return "light";
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      // Light theme (default) values live as var() fallbacks so a merchant
      // who sets nothing gets exactly the original look. brandColor/
      // borderRadius/font are set as inline custom properties per-instance
      // on .kdu-m (see checkout()), not baked into this shared stylesheet --
      // this file is injected once and shared by every checkout() call on
      // the page, which could each want a different brand color.
      ".kdu-ov{position:fixed;inset:0;background:rgba(10,10,10,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:2147483000;padding:20px;font-family:var(--kdu-font,-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif)}" +
      ".kdu-m{position:relative;background:#fff;width:100%;max-width:400px;border-radius:var(--kdu-radius,18px);box-shadow:0 24px 70px rgba(0,0,0,.3);padding:26px 24px 16px;animation:kduIn .2s ease}" +
      ".kdu-m.compact{max-width:340px;padding:18px 16px 12px}" +
      ".kdu-m.dark{background:#18181b;box-shadow:0 24px 70px rgba(0,0,0,.55)}" +
      "@keyframes kduIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}" +
      ".kdu-x{position:absolute;top:14px;right:16px;background:none;border:none;font-size:15px;color:#6b6b6b;cursor:pointer;line-height:1}" +
      ".kdu-m.dark .kdu-x{color:#a1a1aa}" +
      ".kdu-logo{display:block;max-height:28px;max-width:140px;margin:0 auto 10px;object-fit:contain}" +
      ".kdu-hd{text-align:center;padding:8px 0 20px;border-bottom:1px solid #e7e7e7;margin-bottom:18px}" +
      ".kdu-m.compact .kdu-hd{padding:4px 0 14px;margin-bottom:12px}" +
      ".kdu-m.dark .kdu-hd{border-bottom-color:#2c2c31}" +
      ".kdu-mer{font-size:14px;font-weight:600;color:#6b6b6b}" +
      ".kdu-m.dark .kdu-mer{color:#a1a1aa}" +
      ".kdu-amt{font-size:34px;font-weight:800;color:#0a0a0a;letter-spacing:-.02em;margin:4px 0 6px}" +
      ".kdu-m.compact .kdu-amt{font-size:28px;margin:2px 0 4px}" +
      ".kdu-m.dark .kdu-amt{color:#fafafa}" +
      ".kdu-ref{font-size:11px;color:#a3a3a3;font-family:'JetBrains Mono',monospace}" +
      ".kdu-recurring-badge{display:inline-block;margin-top:6px;font-size:11px;font-weight:700;" +
      "text-transform:uppercase;letter-spacing:.04em;color:var(--kdu-brand-dark,#15803d);" +
      "background:var(--kdu-brand-soft,#dcfce7);padding:4px 9px;border-radius:6px}" +
      ".kdu-demo-warn{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:1.5;" +
      "color:#7a2e24;background:#fdecea;border:1px solid #f0c9c2;border-radius:10px;" +
      "padding:10px 12px;margin-bottom:14px}" +
      ".kdu-demo-warn a{color:inherit;font-weight:700;text-decoration:underline}" +
      ".kdu-m.dark .kdu-demo-warn{background:#3a1f1c;color:#f5b8ac;border-color:#5c2e28}" +
      ".kdu-lbl{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b6b6b;margin-bottom:10px}" +
      ".kdu-m.dark .kdu-lbl{color:#a1a1aa}" +
      ".kdu-list{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}" +
      ".kdu-m.compact .kdu-list{gap:6px;margin-bottom:12px}" +
      ".kdu-mtd{display:flex;align-items:center;gap:12px;width:100%;border:1.5px solid #e7e7e7;background:#fff;border-radius:calc(var(--kdu-radius,18px) * 0.6);padding:13px 14px;cursor:pointer;transition:border-color .12s,background .12s;text-align:left}" +
      ".kdu-m.compact .kdu-mtd{padding:10px 12px}" +
      ".kdu-m.dark .kdu-mtd{background:#212126;border-color:#2c2c31}" +
      ".kdu-mtd:hover{border-color:#c9c9c9}" +
      ".kdu-m.dark .kdu-mtd:hover{border-color:#3f3f46}" +
      ".kdu-mtd.sel{border-color:var(--kdu-brand,#22c55e);background:var(--kdu-brand-soft,#dcfce7)}" +
      ".kdu-mtd-t{display:flex;flex-direction:column;flex:1}" +
      ".kdu-mtd-n{font-size:14.5px;font-weight:600;color:#0a0a0a}" +
      ".kdu-m.dark .kdu-mtd-n{color:#fafafa}" +
      ".kdu-mtd-v{font-size:11.5px;color:#6b6b6b}" +
      ".kdu-m.dark .kdu-mtd-v{color:#a1a1aa}" +
      ".kdu-rd{width:18px;height:18px;border-radius:50%;border:2px solid #e7e7e7;flex-shrink:0;position:relative}" +
      ".kdu-m.dark .kdu-rd{border-color:#3f3f46}" +
      ".kdu-rd.on{border-color:var(--kdu-brand,#22c55e)}" +
      ".kdu-rd.on:after{content:'';position:absolute;inset:3px;border-radius:50%;background:var(--kdu-brand,#22c55e)}" +
      ".kdu-pay{width:100%;background:var(--kdu-brand,#22c55e);color:var(--kdu-brand-text,#04120a);border:none;border-radius:calc(var(--kdu-radius,18px) * 0.6);padding:15px;font-size:15px;font-weight:700;cursor:pointer;transition:background .15s}" +
      ".kdu-m.compact .kdu-pay{padding:12px;font-size:14px}" +
      ".kdu-pay:hover:not(:disabled){background:var(--kdu-brand-dark,#16a34a)}" +
      ".kdu-pay:disabled{background:#e7e7e7;color:#a3a3a3;cursor:not-allowed}" +
      ".kdu-m.dark .kdu-pay:disabled{background:#2c2c31;color:#71717a}" +
      ".kdu-empty{font-size:13.5px;color:#6b6b6b;text-align:center;padding:20px 10px;line-height:1.6;background:#fafafa;border-radius:calc(var(--kdu-radius,18px) * 0.6);margin-bottom:16px}" +
      ".kdu-m.dark .kdu-empty{background:#212126;color:#a1a1aa}" +
      ".kdu-proc{text-align:center;padding:36px 0;color:#6b6b6b;font-size:14px}" +
      ".kdu-m.compact .kdu-proc{padding:22px 0}" +
      ".kdu-m.dark .kdu-proc{color:#a1a1aa}" +
      ".kdu-sp{width:34px;height:34px;border:3px solid var(--kdu-brand-soft,#dcfce7);border-top-color:var(--kdu-brand,#22c55e);border-radius:50%;margin:0 auto 14px;animation:kduSpin .8s linear infinite}" +
      "@keyframes kduSpin{to{transform:rotate(360deg)}}" +
      ".kdu-nx{text-align:center;padding:16px 0 6px}" +
      ".kdu-nx-i{width:46px;height:46px;border-radius:50%;background:var(--kdu-brand-soft,#dcfce7);color:var(--kdu-brand-dark,#15803d);font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}" +
      ".kdu-nx-i.err{background:#fef2f2;color:#b91c1c}" +
      ".kdu-m.dark .kdu-nx-i.err{background:#3f1d1d;color:#f87171}" +
      ".kdu-nx-t{font-size:16px;font-weight:700;color:#0a0a0a;margin-bottom:8px}" +
      ".kdu-m.dark .kdu-nx-t{color:#fafafa}" +
      ".kdu-nx-m{font-size:13.5px;color:#6b6b6b;line-height:1.6;margin-bottom:18px;padding:0 6px}" +
      ".kdu-m.dark .kdu-nx-m{color:#a1a1aa}" +
      ".kdu-ft{display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 0 6px;margin-top:8px;border-top:1px solid #e7e7e7;font-size:12px;color:#6b6b6b}" +
      ".kdu-m.dark .kdu-ft{border-top-color:#2c2c31;color:#a1a1aa}" +
      ".kdu-br{color:#0a0a0a;font-weight:700;text-decoration:none}" +
      ".kdu-m.dark .kdu-br{color:#fafafa}";
    var el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  function applyMerchantPreferences(methods, opts) {
    // Can only ever NARROW or REORDER what the server already said is
    // eligible for this real shopper/transaction -- every operation here is
    // a .filter() or a reorder of existing items, never an addition, so
    // there's no way for allowedMethods/preferredMethods to inject a method
    // Konduyt's eligibility engine didn't actually return. "The merchant
    // enables capabilities, Konduyt determines what's appropriate" --
    // enforced structurally here, not just by convention.
    var result = methods || [];
    if (opts.allowedMethods && opts.allowedMethods.length) {
      var allowed = {};
      opts.allowedMethods.forEach(function (m) { allowed[m] = true; });
      result = result.filter(function (m) { return allowed[m.id]; });
    }
    if (opts.hiddenMethods && opts.hiddenMethods.length) {
      var hidden = {};
      opts.hiddenMethods.forEach(function (m) { hidden[m] = true; });
      result = result.filter(function (m) { return !hidden[m.id]; });
    }

    // Ordering. preferredMethods (a full ordered list) is the general form;
    // preferredMethod (singular, section 2) is kept working as shorthand for
    // a one-item list, only when preferredMethods isn't ALSO given.
    var orderList = (opts.preferredMethods && opts.preferredMethods.length)
      ? opts.preferredMethods
      : (opts.preferredMethod ? [opts.preferredMethod] : null);

    if (orderList) {
      // MERCHANT ORDERING: the server's response already comes back cheapest-
      // first (smart-ordered by real fee data). This is a STABLE re-sort:
      // methods present in orderList move to the front, in the order given;
      // everything else keeps its existing relative order (still the smart
      // order) and is appended after. A method named in orderList that isn't
      // actually eligible simply never appears -- same guardrail as
      // allowedMethods, nothing here can add an entry.
      var rank = {};
      orderList.forEach(function (id, i) { rank[id] = i; });
      var ranked = [], unranked = [];
      result.forEach(function (m) {
        if (rank.hasOwnProperty(m.id)) ranked.push(m); else unranked.push(m);
      });
      ranked.sort(function (a, b) { return rank[a.id] - rank[b.id]; });
      result = ranked.concat(unranked);
    } else if (opts.smartOrdering === false) {
      // SMART ORDERING explicitly turned off, and no merchant order given
      // either: fall back to a neutral, predictable order (alphabetical by
      // name) instead of the fee-based "recommended" order -- a merchant who
      // opts out of Konduyt's cost-optimized ranking shouldn't still see an
      // implicit opinion about which method is "best" baked into the order.
      result = result.slice().sort(function (a, b) {
        return (a.name || "").localeCompare(b.name || "");
      });
    }
    // smartOrdering true (the default) or unset: leave the server's real,
    // cheapest-first order exactly as returned -- this is the "Konduyt
    // determines the optimal order" mode, no client-side change needed.

    return result;
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function footer() {
    var f = el("div", "kdu-ft");
    f.innerHTML = "\uD83D\uDD12 Secured &amp; optimized by <a class='kdu-br' href='https://konduyt.dev' target='_blank' rel='noreferrer'>" + BRAND + "</a>";
    return f;
  }

  function checkout(opts) {
    opts = opts || {};
    if (!opts.publishableKey && !opts.sessionId) {
      console.error("[Konduyt] publishableKey or sessionId is required");
      return;
    }
    injectStyles();

    var overlay = el("div", "kdu-ov");
    var modal = el("div", "kdu-m");
    var theme = resolveTheme(opts);
    if (theme === "dark") modal.className += " dark";
    if (opts.layout === "compact") modal.className += " compact";
    // Per-instance custom properties -- NOT baked into the shared stylesheet
    // (injectStyles runs once per page and could serve several checkout()
    // calls, potentially for different merchants/brand colors).
    var brand = opts.brandColor || "#22c55e";
    modal.style.setProperty("--kdu-brand", brand);
    modal.style.setProperty("--kdu-brand-dark", darken(brand, 32));
    modal.style.setProperty("--kdu-brand-soft", lighten(brand, 150));
    modal.style.setProperty("--kdu-brand-text", contrastText(brand));
    if (opts.borderRadius != null) modal.style.setProperty("--kdu-radius", opts.borderRadius + "px");
    if (opts.font) modal.style.setProperty("--kdu-font", opts.font);
    // Session mode (boot()) overwrites these with the server-fixed real
    // values -- publishable-key mode uses opts directly, since there's no
    // session to be authoritative instead.
    modal._amount = opts.amount;
    modal._currency = opts.currency;
    modal._reference = opts.reference;
    modal._recurring = false;  // only ever true via session mode -- publishable-key
                                // mode has no server-declared recurring intent to trust
    modal._interval = null;
    overlay.appendChild(modal);

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof opts.onClose === "function") opts.onClose();
    }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    function header() {
      var h = el("div", "kdu-hd");
      if (opts.logo) {
        var img = document.createElement("img");
        img.className = "kdu-logo";
        img.src = opts.logo;
        img.alt = modal._merchant || "Merchant";
        // A broken/unreachable logo URL should never break the checkout --
        // just remove it and carry on with the text merchant name.
        img.addEventListener("error", function () { if (img.parentNode) img.parentNode.removeChild(img); });
        h.appendChild(img);
      }
      h.appendChild(el("div", "kdu-mer", modal._merchant || "Merchant"));
      if (modal._amount != null) h.appendChild(el("div", "kdu-amt", fmt(modal._amount, modal._currency)));
      if (modal._recurring) {
        // Real disclosure, not a cosmetic label -- many jurisdictions
        // require a shopper to clearly see they're agreeing to a RECURRING
        // charge, not a single purchase, before they pay.
        var intervalLabel = modal._interval === "monthly" ? "month" : (modal._interval || "cycle");
        h.appendChild(el("div", "kdu-recurring-badge",
          "Recurring \u2014 charged every " + intervalLabel));
      }
      if (modal._reference) h.appendChild(el("div", "kdu-ref", "Ref: " + modal._reference));
      return h;
    }

    function render(rawMethods, reason, isDemoKey) {
      // Filter/reorder within the server's real eligible list -- never adds
      // to it. See applyMerchantPreferences for why this is safe by
      // construction, not just by convention.
      var methods = applyMerchantPreferences(rawMethods, opts);
      modal.innerHTML = "";
      var x = el("button", "kdu-x", "\u2715");
      x.addEventListener("click", close);
      modal.appendChild(x);
      modal.appendChild(header());

      if (isDemoKey) {
        // A REAL signal from the server (is_demo_key), never inferred from
        // the key string client-side -- see app/demo_project.py. Shown
        // regardless of whether methods are empty or not: whoever's
        // looking at this checkout, on any site using these keys, should
        // know they're using Konduyt's own shared demo project.
        var warn = el("div", "kdu-demo-warn");
        warn.innerHTML = "You're using Konduyt's universal demo keys, shared by everyone \u2014 not your own. " +
          "<a href=\"https://konduyt.dev/signup/\" target=\"_blank\" rel=\"noreferrer\">Sign up</a> to get your own real keys.";
        modal.appendChild(warn);
      }

      if (!methods || methods.length === 0) {
        var emptyMsg;
        if (rawMethods && rawMethods.length > 0) {
          // The server genuinely found eligible methods -- it was the
          // merchant's OWN allowedMethods/hiddenMethods config that filtered
          // them all out. Different problem, different message: don't
          // wrongly tell the shopper "the merchant needs to connect a
          // provider" when they already have.
          emptyMsg = "No payment methods are available for this checkout's configuration.";
        } else if (reason === "no_country_set") {
          // A provider IS connected -- the real gap is that neither the
          // shopper's country nor the merchant's own country is known yet.
          // Telling a merchant who's already connected a provider to "go
          // connect a provider" is actively misleading.
          emptyMsg = "No payment methods are available yet. The merchant needs to set their country in Konduyt settings.";
        } else if (reason === "no_coverage") {
          // A provider IS connected and a country IS known -- genuinely no
          // connected provider serves this specific country yet.
          emptyMsg = "No payment methods are available for shoppers in this country yet.";
        } else {
          emptyMsg = "No payment methods are available yet. The merchant needs to connect a provider.";
        }
        modal.appendChild(el("div", "kdu-empty", emptyMsg));
        modal.appendChild(footer());
        return;
      }

      modal.appendChild(el("div", "kdu-lbl", "Choose how to pay"));
      var list = el("div", "kdu-list");
      var selected = null;
      var payBtn;

      methods.forEach(function (m) {
        var b = el("button", "kdu-mtd");
        var t = el("div", "kdu-mtd-t");
        t.appendChild(el("span", "kdu-mtd-n", m.name));
        if (m.via) t.appendChild(el("span", "kdu-mtd-v", "via " + m.via));
        b.appendChild(t);
        var rd = el("span", "kdu-rd");
        b.appendChild(rd);
        b.addEventListener("click", function () {
          selected = m.id;
          Array.prototype.forEach.call(list.children, function (c) { c.className = "kdu-mtd"; c.querySelector(".kdu-rd").className = "kdu-rd"; });
          b.className = "kdu-mtd sel"; rd.className = "kdu-rd on";
          payBtn.disabled = false;
          var amtLabel = fmt(modal._amount, modal._currency);
          payBtn.textContent = modal._recurring ? "Subscribe \u2014 " + amtLabel : "Pay " + amtLabel;
        });
        list.appendChild(b);
      });
      modal.appendChild(list);

      payBtn = el("button", "kdu-pay", "Select a method");
      payBtn.disabled = true;
      payBtn.addEventListener("click", function () { pay(selected); });
      modal.appendChild(payBtn);
      modal.appendChild(footer());
    }

    function processing() {
      modal.innerHTML = "";
      modal.appendChild(header());
      var p = el("div", "kdu-proc");
      p.appendChild(el("div", "kdu-sp"));
      p.appendChild(el("div", null, "Starting your payment\u2026"));
      modal.appendChild(p);
      modal.appendChild(footer());
    }

    function result(methodId, ok, msg) {
      modal.innerHTML = "";
      var x = el("button", "kdu-x", "\u2715"); x.addEventListener("click", close); modal.appendChild(x);
      modal.appendChild(header());
      var wrap = el("div", "kdu-nx");
      wrap.appendChild(el("div", "kdu-nx-i" + (ok ? "" : " err"), ok ? "\u2192" : "!"));
      wrap.appendChild(el("div", "kdu-nx-t", ok ? "Next step" : "Couldn't start payment"));
      wrap.appendChild(el("p", "kdu-nx-m", msg));
      var btn = el("button", "kdu-pay", ok ? "Done" : "Try again");
      btn.addEventListener("click", ok ? close : function () { boot(); });
      wrap.appendChild(btn);
      modal.appendChild(wrap);
      modal.appendChild(footer());
      if (ok && typeof opts.onSuccess === "function") opts.onSuccess({ method: methodId, reference: modal._reference });
    }

    function pay(methodId) {
      if (!methodId) return;
      processing();
      // The drop-in signals the merchant's page to create the charge server-side
      // (with the secret key). We surface the honest next step here.
      setTimeout(function () {
        result(methodId, true, nextStep(methodId));
      }, 700);
    }

    function boot() {
      processing();
      var url = opts.sessionId
        ? API_BASE + "/checkout/session/" + encodeURIComponent(opts.sessionId)
        : API_BASE + "/checkout/config?pk=" + encodeURIComponent(opts.publishableKey);
      fetch(url)
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) {
            modal._merchant = "Merchant";
            var msg = "Could not load checkout.";
            if (res.d && res.d.error === "invalid_publishable_key") msg = "This publishable key isn't valid.";
            if (res.d && res.d.error === "invalid_or_expired_session") msg = "This checkout session has expired. Please try again.";
            result(null, false, msg);
            return;
          }
          modal._merchant = res.d.merchant || "Merchant";
          // Session mode: amount/currency/reference come from the server --
          // the merchant's OWN server fixed these at session creation, not
          // from anything this browser supplied. Publishable-key mode keeps
          // using what was passed into checkout() directly, since there's no
          // session to be authoritative instead.
          if (opts.sessionId) {
            modal._amount = res.d.amount;
            modal._currency = res.d.currency;
            modal._reference = res.d.reference;
            modal._recurring = !!res.d.recurring;
            modal._interval = res.d.interval;
          }
          render(res.d.methods || [], res.d.reason, res.d.is_demo_key);
        })
        .catch(function () {
          modal._merchant = "Merchant";
          result(null, false, "Could not reach Konduyt. Check your connection.");
        });
    }

    document.body.appendChild(overlay);
    boot();
  }

  window.Konduyt = { checkout: checkout, version: "1.3.0" };
})();
