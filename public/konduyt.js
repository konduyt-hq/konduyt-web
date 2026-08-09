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
 *     onClose:   function () { ... }          // customer closed the popup
 *   });
 *
 * The popup fetches the merchant's enabled methods from Konduyt using the
 * publishable key and shows the customer their options. It NEVER handles your
 * secret key — the actual charge is created by YOUR server with the secret key
 * (POST /v1/payments). This mirrors PayPal: the popup collects intent, your
 * server captures the money.
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
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      ".kdu-ov{position:fixed;inset:0;background:rgba(10,10,10,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:2147483000;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif}" +
      ".kdu-m{position:relative;background:#fff;width:100%;max-width:400px;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.3);padding:26px 24px 16px;animation:kduIn .2s ease}" +
      "@keyframes kduIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}" +
      ".kdu-x{position:absolute;top:14px;right:16px;background:none;border:none;font-size:15px;color:#6b6b6b;cursor:pointer;line-height:1}" +
      ".kdu-hd{text-align:center;padding:8px 0 20px;border-bottom:1px solid #e7e7e7;margin-bottom:18px}" +
      ".kdu-mer{font-size:14px;font-weight:600;color:#6b6b6b}" +
      ".kdu-amt{font-size:34px;font-weight:800;color:#0a0a0a;letter-spacing:-.02em;margin:4px 0 6px}" +
      ".kdu-ref{font-size:11px;color:#a3a3a3;font-family:'JetBrains Mono',monospace}" +
      ".kdu-lbl{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b6b6b;margin-bottom:10px}" +
      ".kdu-list{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}" +
      ".kdu-mtd{display:flex;align-items:center;gap:12px;width:100%;border:1.5px solid #e7e7e7;background:#fff;border-radius:11px;padding:13px 14px;cursor:pointer;transition:border-color .12s,background .12s;text-align:left}" +
      ".kdu-mtd:hover{border-color:#c9c9c9}" +
      ".kdu-mtd.sel{border-color:#22c55e;background:#dcfce7}" +
      ".kdu-mtd-t{display:flex;flex-direction:column;flex:1}" +
      ".kdu-mtd-n{font-size:14.5px;font-weight:600;color:#0a0a0a}" +
      ".kdu-mtd-v{font-size:11.5px;color:#6b6b6b}" +
      ".kdu-rd{width:18px;height:18px;border-radius:50%;border:2px solid #e7e7e7;flex-shrink:0;position:relative}" +
      ".kdu-rd.on{border-color:#22c55e}" +
      ".kdu-rd.on:after{content:'';position:absolute;inset:3px;border-radius:50%;background:#22c55e}" +
      ".kdu-pay{width:100%;background:#22c55e;color:#04120a;border:none;border-radius:11px;padding:15px;font-size:15px;font-weight:700;cursor:pointer;transition:background .15s}" +
      ".kdu-pay:hover:not(:disabled){background:#16a34a}" +
      ".kdu-pay:disabled{background:#e7e7e7;color:#a3a3a3;cursor:not-allowed}" +
      ".kdu-empty{font-size:13.5px;color:#6b6b6b;text-align:center;padding:20px 10px;line-height:1.6;background:#fafafa;border-radius:11px;margin-bottom:16px}" +
      ".kdu-proc{text-align:center;padding:36px 0;color:#6b6b6b;font-size:14px}" +
      ".kdu-sp{width:34px;height:34px;border:3px solid #dcfce7;border-top-color:#22c55e;border-radius:50%;margin:0 auto 14px;animation:kduSpin .8s linear infinite}" +
      "@keyframes kduSpin{to{transform:rotate(360deg)}}" +
      ".kdu-nx{text-align:center;padding:16px 0 6px}" +
      ".kdu-nx-i{width:46px;height:46px;border-radius:50%;background:#dcfce7;color:#15803d;font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}" +
      ".kdu-nx-i.err{background:#fef2f2;color:#b91c1c}" +
      ".kdu-nx-t{font-size:16px;font-weight:700;color:#0a0a0a;margin-bottom:8px}" +
      ".kdu-nx-m{font-size:13.5px;color:#6b6b6b;line-height:1.6;margin-bottom:18px;padding:0 6px}" +
      ".kdu-ft{display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 0 6px;margin-top:8px;border-top:1px solid #e7e7e7;font-size:12px;color:#6b6b6b}" +
      ".kdu-br{color:#0a0a0a;font-weight:700;text-decoration:none}";
    var el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
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
    if (!opts.publishableKey) { console.error("[Konduyt] publishableKey is required"); return; }
    injectStyles();

    var overlay = el("div", "kdu-ov");
    var modal = el("div", "kdu-m");
    overlay.appendChild(modal);

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof opts.onClose === "function") opts.onClose();
    }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    function header() {
      var h = el("div", "kdu-hd");
      h.appendChild(el("div", "kdu-mer", modal._merchant || "Merchant"));
      h.appendChild(el("div", "kdu-amt", fmt(opts.amount, opts.currency)));
      if (opts.reference) h.appendChild(el("div", "kdu-ref", "Ref: " + opts.reference));
      return h;
    }

    function render(methods) {
      modal.innerHTML = "";
      var x = el("button", "kdu-x", "\u2715");
      x.addEventListener("click", close);
      modal.appendChild(x);
      modal.appendChild(header());

      if (!methods || methods.length === 0) {
        modal.appendChild(el("div", "kdu-empty",
          "No payment methods are available yet. The merchant needs to connect a provider."));
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
          payBtn.textContent = "Pay " + fmt(opts.amount, opts.currency);
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
      if (ok && typeof opts.onSuccess === "function") opts.onSuccess({ method: methodId, reference: opts.reference });
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
      var url = API_BASE + "/checkout/config?pk=" + encodeURIComponent(opts.publishableKey);
      fetch(url)
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) {
            modal._merchant = "Merchant";
            result(null, false, res.d && res.d.error === "invalid_publishable_key"
              ? "This publishable key isn't valid." : "Could not load checkout.");
            return;
          }
          modal._merchant = res.d.merchant || "Merchant";
          render(res.d.methods || []);
        })
        .catch(function () {
          modal._merchant = "Merchant";
          result(null, false, "Could not reach Konduyt. Check your connection.");
        });
    }

    document.body.appendChild(overlay);
    boot();
  }

  window.Konduyt = { checkout: checkout, version: "1.0.0" };
})();
