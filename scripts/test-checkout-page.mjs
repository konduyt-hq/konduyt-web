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

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILED'}`);
  process.exit(failures ? 1 : 0);
})();