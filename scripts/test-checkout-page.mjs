// Exercises the shared checkout page in a real DOM across several countries,
// with a stubbed API so no network leaves the process.
//
// The page used to embed its own country -> methods table, and this suite
// used that table as its ground truth. It now takes the catalogue from the
// API's own local_methods, so the payload is the ground truth: every method
// the API returns must be rendered, whether or not Konduyt can route it.
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('public/checkout-page.html', 'utf8');

let failures = 0;
const check = (n, a, e) => {
  const ok = JSON.stringify(a) === JSON.stringify(e);
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${n}` + (ok ? '' : `\n        got      ${JSON.stringify(a)}\n        expected ${JSON.stringify(e)}`));
};

// The API's local_methods shape: a country catalogue entry, executable or not.
const local = (label, opts = {}) => ({
  label, method_type: 'MOBILE_MONEY', provider: opts.provider ?? null,
  fee_minor: opts.fee ?? null, fee_source: opts.fee == null ? null : (opts.provider ? 'konduyt' : 'market'),
  on_konduyt: opts.on ?? false, is_estimated: false,
});
const option = (label, opts = {}) => ({
  method: opts.method ?? label, provider: opts.provider ?? 'p', label,
  fee_minor: opts.fee ?? null, fee_percent_effective: null,
  on_konduyt: opts.on ?? true, recommended: opts.rec ?? false, estimated: false, verified: true,
});

function run(iso, dial, nsn, payload) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.fetch = (u) => String(u).includes('demo/run')
        ? Promise.resolve({ json: () => Promise.resolve(payload) })
        : Promise.resolve({ json: () => Promise.resolve({ status: 'submitted' }) });
    },
  });
  const { window } = dom, doc = window.document;
  const country = doc.getElementById('countryCode');
  // jsdom derives selectedOptions from the `selected` attribute, and the page
  // ships KE marked selected. Reflect a real user selection by moving the
  // attribute, which also handles +1 being shared by CA and US.
  [...country.options].forEach((o) =>
    o.toggleAttribute('selected', o.getAttribute('data-iso') === iso));
  country.dispatchEvent(new window.Event('change', { bubbles: true }));
  const phone = doc.getElementById('phoneInput');
  phone.value = '7'.repeat(nsn);
  phone.dispatchEvent(new window.Event('input', { bubbles: true }));
  doc.getElementById('payButton').click();
  return new Promise((res) => setTimeout(() => {
    const rows = [...doc.querySelectorAll('#railRows tr')];
    res({
      window, doc, phone,
      open: doc.getElementById('intelOverlay').classList.contains('open'),
      rows,
      labels: rows.map((r) => r.querySelector('.rail-name')?.textContent
        || r.querySelector('td')?.textContent.replace('Best value', '').trim()),
      badged: rows.filter((r) => r.textContent.includes('Best value'))
        .map((r) => r.querySelector('.rail-name')?.textContent),
      fees: rows.map((r) => r.querySelectorAll('td')[1]?.textContent.trim()),
      payLabels: rows.filter((r) => r.querySelector('button.rail-pay'))
        .map((r) => r.querySelector('.rail-name')?.textContent),
      unsupported: rows.filter((r) => r.querySelector('.rail-unsupported'))
        .map((r) => r.querySelector('.rail-name')?.textContent),
      empty: rows.length === 1 && rows[0].querySelectorAll('td').length === 1,
    });
  }, 350));
}

(async () => {
  // Kenya: two routable, three local-but-not-routable. This is the case that
  // used to render as nothing but "No ranked options".
  const KE_LOCALS = [
    local('M-Pesa', { on: true, provider: 'daraja', fee: 5700 }),
    local('Pesapal', { on: true, provider: 'pesapal', fee: 14500 }),
    local('Airtel Money'),
    local('PesaLink'),
    local('T-Kash'),
  ];
  const KE_OPTS = [
    option('MPESA', { provider: 'daraja', fee: 5700, rec: true }),
    option('PESAPAL', { provider: 'pesapal', fee: 14500 }),
    option('AIRTEL_MONEY', { on: false, fee: null }),
    option('PESALINK', { on: false, fee: null }),
    option('T_KASH', { on: false, fee: null }),
  ];
  console.log('Kenya -- routable and non-routable local methods together:');
  let r = await run('KE', '254', 9, {
    payment: { amount: 3864, currency: 'KES', country: 'KE', is_representative_example: false },
    intelligence: { options: KE_OPTS, local_methods: KE_LOCALS },
  });
  check('popup opened', r.open, true);
  check('every local method listed once', r.labels.sort(),
    ['Airtel Money', 'M-Pesa', 'PesaLink', 'Pesapal', 'T-Kash'].sort());
  check('no duplicate rows', new Set(r.labels).size, r.labels.length);
  check('Pay only on routable methods', r.payLabels.sort(), ['M-Pesa', 'Pesapal'].sort());
  check('non-routable methods are marked, not hidden', r.unsupported.sort(),
    ['Airtel Money', 'PesaLink', 'T-Kash'].sort());
  check('Best value is the cheapest routable method', r.badged, ['M-Pesa']);
  check('routable rows come before non-routable ones',
    r.rows.findIndex((x) => x.querySelector('.rail-unsupported')) >
    r.rows.map((x) => x.classList.contains('rail-executable')).lastIndexOf(true), true);

  // A country with a full catalogue and no Konduyt coverage at all. This is
  // the case that must NOT say "No ranked options".
  console.log('\nBrazil -- full local catalogue, zero Konduyt coverage:');
  const BR_LOCALS = ['Pix', 'Boleto Bancário', 'Mercado Pago', 'TED'].map((l) => local(l));
  r = await run('BR', '55', 11, {
    payment: { amount: 3864, currency: 'BRL', country: 'BR', is_representative_example: false },
    intelligence: { options: [], local_methods: BR_LOCALS },
  });
  check('all local methods listed', r.labels.sort(), BR_LOCALS.map((m) => m.label).sort());
  check('none are payable', r.payLabels, []);
  check('all marked not on Konduyt yet', r.unsupported.length, BR_LOCALS.length);
  check('no Best value badge', r.badged, []);
  check('does not claim there are no methods',
    r.rows.some((x) => /No payment methods found/.test(x.textContent)), false);

  // Only a genuinely empty response may say so.
  console.log('\nCountry with no data at all:');
  r = await run('DE', '49', 10, {
    payment: { amount: 3864, currency: 'EUR', country: 'DE', is_representative_example: false },
    intelligence: { options: [], local_methods: [] },
  });
  check('empty response says there are no methods',
    r.rows.some((x) => /No payment methods found/.test(x.textContent)), true);
  check('empty response never mentions ranked options',
    r.rows.some((x) => /No ranked options/.test(x.textContent)), false);

  // Ranking: cheapest routable first, unknown prices last, and market-priced
  // non-routable methods never outrank a routable one.
  console.log('\nRanking and market fees:');
  r = await run('KE', '254', 9, {
    payment: { amount: 3864, currency: 'KES', country: 'KE', is_representative_example: false },
    intelligence: {
      options: [option('PESAPAL', { fee: 14500 }), option('MPESA', { fee: 5700, rec: true })],
      local_methods: [
        local('M-Pesa', { on: true, provider: 'daraja', fee: 5700 }),
        local('Pesapal', { on: true, provider: 'pesapal', fee: 14500 }),
        // Cheapest in the market, but not routable -- must not be Best value.
        local('Airtel Money', { fee: 4000 }),
      ],
    },
  });
  check('cheapest routable is first', r.labels[0], 'M-Pesa');
  check('the cheaper non-routable method is not Best value', r.badged, ['M-Pesa']);
  check('market fee is labelled, not presented as a Konduyt fee',
    r.fees.some((f) => /Market fee/.test(f)), true);
  check('non-routable method still listed with its market fee', r.unsupported, ['Airtel Money']);

  console.log('\nCountry with zero live pricing (Germany):');
  r = await run('DE', '49', 10, {
    payment: { amount: 3864, currency: 'EUR', country: 'DE', is_representative_example: false },
    intelligence: { options: [], local_methods: [local('Bank Transfer'), local('Card'), local('Girocard')] },
  });
  check('methods still listed with no API pricing', r.labels.length, 3);
  check('no badge when nothing is priced', r.badged, []);
  check('fees blank, not fabricated', r.fees.every((f) => f === '—'), true);

  // Dismissal. The overlay sits on top of the confirm form, so closing it
  // without also closing the form leaves the customer's details hidden behind
  // a dismissed layer -- and re-opening must not resurrect that stale form.
  console.log('\nClosing the popup:');
  r = await run('KE', '254', 9, {
    payment: { amount: 3864, currency: 'KES', country: 'KE', is_representative_example: false },
    intelligence: { options: KE_OPTS, local_methods: KE_LOCALS },
  });
  const { window: w, doc, phone } = r;
  const overlay = doc.getElementById('intelOverlay');
  const checkoutForm = doc.getElementById('checkout');
  const isOpen = () => overlay.classList.contains('open');
  const formOpen = () => checkoutForm.classList.contains('open');
  const clickInside = () => doc.querySelector('.intel-modal')
    .dispatchEvent(new w.Event('click', { bubbles: true }));

  check('popup is open to begin with', isOpen(), true);
  clickInside();
  check('clicking inside does not dismiss it', isOpen(), true);

  // Selecting a rail reveals the confirm form.
  doc.querySelector('#railRows button.rail-pay').click();
  check('selecting a payable rail reveals the confirm form', formOpen(), true);

  // A non-routable row must not open the confirm form -- it cannot be paid.
  doc.getElementById('intelClose').click();
  doc.getElementById('payButton').click();
  await new Promise((res) => setTimeout(res, 350));
  const unsupportedRow = doc.querySelector('#railRows tr.rail-unsupported');
  unsupportedRow.dispatchEvent(new w.Event('click', { bubbles: true }));
  check('clicking a non-routable row does not open the confirm form', formOpen(), false);

  doc.getElementById('intelClose').click();
  check('X dismisses the popup', isOpen(), false);
  check('X also hides the confirm form', formOpen(), false);

  doc.getElementById('payButton').click();
  await new Promise((res) => setTimeout(res, 350));
  check('popup reopens', isOpen(), true);
  check('reopened popup has no stale confirm form', formOpen(), false);

  overlay.dispatchEvent(new w.Event('click', { bubbles: true }));
  check('backdrop click dismisses the popup', isOpen(), false);

  // Phone field: digits only, and only a full-length number enables Pay.
  console.log('\nPhone number field (KE, 9 digits):');
  const pay = doc.getElementById('payButton');
  const setPhone = (v) => {
    phone.value = v;
    phone.dispatchEvent(new w.Event('input', { bubbles: true }));
  };
  const country = doc.getElementById('countryCode');

  setPhone('71234');
  check('a short number leaves Pay disabled', pay.disabled, true);
  setPhone('712345678');
  check('a full-length number enables Pay', pay.disabled, false);

  setPhone('7a1b2c3d4e5f6g7h8');
  check('letters are stripped from the value', phone.value, '712345678');
  setPhone('71 234-5678');
  check('spaces and dashes are stripped', phone.value, '712345678');
  setPhone('712345678999999');
  check('an over-long number is capped to the country length', phone.value, '712345678');

  // Changing country changes the required length, so Pay must re-lock.
  [...country.options].forEach((o) =>
    o.toggleAttribute('selected', o.getAttribute('data-iso') === 'CI'));
  country.dispatchEvent(new w.Event('change', { bubbles: true }));
  check('switching to a 10-digit country re-disables Pay at 9 digits', pay.disabled, true);
  setPhone('7123456789');
  check('the 10-digit number enables Pay again', pay.disabled, false);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILED'}`);
  process.exit(failures ? 1 : 0);
})();
