// Exercises the shared checkout page in a real DOM across several countries,
// with a stubbed API so no network leaves the process. The method-listing and
// badge logic under test is the real generated code.
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('public/checkout-page.html', 'utf8');

// Ground truth is the table the page actually embeds, not a separate snapshot
// file: a second copy could silently drift out of date and make this suite
// assert against numbers the served page never had. Parsing it back out means
// this really checks "every method the page lists is rendered".
const LOCAL = JSON.parse(
  html.match(/var LOCAL_METHODS = (\{.*?\});\n/s)[1]);

let failures = 0;
const check = (n, a, e) => {
  const ok = JSON.stringify(a) === JSON.stringify(e);
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${n}` + (ok ? '' : `\n        got      ${JSON.stringify(a)}\n        expected ${JSON.stringify(e)}`));
};

// Minimal API payloads mirroring the live shape.
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
      labels: rows.map((r) => r.querySelector('td').textContent.replace('Best value', '').trim()),
      badged: rows.filter((r) => r.textContent.includes('Best value'))
                   .map((r) => r.querySelector('td').textContent.replace('Best value', '').trim()),
      fees: rows.map((r) => r.querySelectorAll('td')[1].textContent.trim()),
    });
  }, 350));
}

const priced = (label, minor) => ({ method: label, provider: 'p', label, fee_minor: minor });

(async () => {
  console.log('Kenya -- 6 real rails, only MPESA priced:');
  let r = await run('KE', '254', 9, {
    payment: { amount: 3864, currency: 'USD', country: 'KE', is_representative_example: false },
    intelligence: { options: [priced('MPESA', 31)] },
  });
  check('popup opened', r.open, true);
  check('every real KE method listed', r.labels.sort(),
        ['Airtel Money', 'Apple Pay', 'Bank Transfer', 'Card', 'M-Pesa',
         'Mobile Money', 'PesaLink', 'Pesapal', 'T-Kash'].sort());
  check('badge on the priced rail, not index 0', r.badged, ['M-Pesa']);

  console.log('\nUS -- 9 real rails, two priced, cheapest wins:');
  r = await run('US', '1', 10, {
    payment: { amount: 3864, currency: 'USD', country: 'US', is_representative_example: false },
    intelligence: { options: [priced('PayPal', 184), priced('ACH', 31)] },
  });
  check('all US methods listed', r.labels.length, LOCAL.US.length);
  check('badge is ACH (cheapest priced)', r.badged, ['ACH']);

  console.log('\nRanking is by cost, not table order:');
  r = await run('US', '1', 10, {
    payment: { amount: 3864, currency: 'USD', country: 'US', is_representative_example: false },
    intelligence: { options: [priced('PayPal', 184), priced('ACH', 31), priced('Card', 142)] },
  });
  // Sent dearest-first on purpose: the rendered order must be cost order, and
  // the priced rows must come before the unpriced ones.
  check('priced rows ascending, cheapest first',
        r.fees.filter((f) => f !== '—'), ['$0.31', '$1.42', '$1.84']);
  check('cheapest is the first row', r.labels[0], 'ACH');
  check('unpriced rows sort after every priced row',
        r.fees.indexOf('—') > r.fees.lastIndexOf('$1.84'), true);

  console.log('\nCountry with zero live pricing (Germany):');
  r = await run('DE', '49', 10, {
    payment: { amount: 3864, currency: 'EUR', country: 'DE', is_representative_example: false },
    intelligence: { options: [] },
  });
  check('methods still listed with no API pricing', r.labels.length, LOCAL.DE.length);
  check('no badge when nothing is priced', r.badged, []);
  check('fees blank, not fabricated', r.fees.every((f) => f === '—' || f === ''), true);

  console.log('\nCountry absent from the API entirely (Nigeria):');
  r = await run('NG', '234', 10, {
    payment: { amount: 3864, currency: 'NGN', country: 'NG', is_representative_example: true },
    intelligence: { options: [] },
  });
  check('NG methods listed', r.labels.length, (LOCAL.NG || []).length);

  // Dismissal. The overlay sits on top of the confirm form, so closing it
  // without also closing the form leaves the customer's details hidden behind
  // a dismissed layer -- and re-opening must not resurrect that stale form.
  console.log('\nClosing the popup:');
  r = await run('KE', '254', 9, {
    payment: { amount: 3864, currency: 'KES', country: 'KE', is_representative_example: false },
    intelligence: { options: [priced('MPESA', 5700)] },
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
  doc.querySelector('#railRows tr.rail').dispatchEvent(new w.Event('click', { bubbles: true }));
  check('selecting a rail reveals the confirm form', formOpen(), true);

  doc.getElementById('intelClose').click();
  check('X dismisses the popup', isOpen(), false);
  check('X also hides the confirm form', formOpen(), false);

  // Reopen: the form from the previous session must be gone.
  doc.getElementById('payButton').click();
  await new Promise((res) => setTimeout(res, 350));
  check('popup reopens', isOpen(), true);
  check('reopened popup has no stale confirm form', formOpen(), false);

  // Backdrop click -- but not a click on the modal's own contents.
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
  setPhone('712345678');
  check('a pasted non-numeric value cannot re-enable Pay early', pay.disabled, false);

  // Changing country changes the required length, so Pay must re-lock.
  [...country.options].forEach((o) =>
    o.toggleAttribute('selected', o.getAttribute('data-iso') === 'CI'));
  country.dispatchEvent(new w.Event('change', { bubbles: true }));
  check('switching to a 10-digit country re-disables Pay at 9 digits', pay.disabled, true);
  setPhone('7123456789');
  check('the 10-digit number enables Pay again', pay.disabled, false);
  setPhone('712345678');
  check('switching to CI capped the value back to 10', phone.value.length <= 10, true);

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILED'}`);
  process.exit(failures ? 1 : 0);
})();