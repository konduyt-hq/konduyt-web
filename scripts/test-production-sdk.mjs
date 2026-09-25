// Exercise the production drop-in SDK (public/konduyt.js) against the real
// shapes the API returns, so the intelligence ported from the demo checkout is
// proven on the REAL SDK rather than assumed.
//
// What this checks, and why each one matters:
//   1. Fees are rendered from API fields only -- and a null fee is NEVER
//      turned into 0. Unknown is not free; that distinction is the whole point.
//   2. Cheapest genuinely-priced method gets BEST VALUE; an unknown fee never
//      does.
//   3. Customer country is explicit: it is sent to the API and it never comes
//      from the viewer's IP. The merchant's transaction currency/amount are
//      passed through untouched.
//   4. A country with no priced methods still shows its known local methods.
//   5. Methods Konduyt cannot execute render "Not on Konduyt yet" with no way
//      to select/pay them.
//   6. Representative pricing is labelled as representative.
//   7. Phone validation follows the API's per-country rules; invalid numbers
//      keep Pay disabled.
//   8. Method-specific next-step instructions, and payment states that are
//      never faked as successful by a timer.
//
// Run: node scripts/test-production-sdk.mjs
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SDK_SRC = readFileSync(join(ROOT, 'public/konduyt.js'), 'utf8');

let failures = 0, checks = 0;
const check = (name, ok, detail = '') => {
  checks++;
  if (!ok) failures++;
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}` + (ok || !detail ? '' : `\n        ${detail}`));
};

// ---- A real DOM, with fetch stubbed at the network boundary ----------------
// The SDK is loaded as the browser would load it (<script>), and fetch is the
// only thing replaced -- everything else (render, selection, validation) runs
// as real code.
function loadSdk(response, { capture } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const { window } = dom;
  window.fetch = (url) => {
    if (capture) capture.url = url;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response),
    });
  };
  window.eval(SDK_SRC);
  return { dom, window, document: window.document };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

// Real API shapes. KE mixes LIVE (priced) and not-on-Konduyt methods, which is
// exactly the case the UI has to get right.
const KE_RESPONSE = {
  merchant: 'Demo Store',
  customer_country: 'KE',
  customer_country_source: 'explicit',
  reference_amount: 500000,
  reference_currency: 'KES',
  phone_rules: { country: 'KE', dial: '254', required_digits: 9, max_digits: 15, has_numbering_data: true },
  methods: [
    { id: 'mpesa', name: 'M-Pesa', via: 'Daraja', fee_minor: 5600, fee_percent: 1.12,
      fee_source: 'konduyt', konduyt_state: 'LIVE' },
    { id: 'card', name: 'Cards', via: 'Paystack', fee_minor: 14500, fee_percent: 2.9,
      fee_source: 'konduyt', konduyt_state: 'LIVE' },
  ],
  coverage: [
    { id: 'MPESA', name: 'M-Pesa', fee_minor: 5600, konduyt_state: 'LIVE', on_konduyt: true },
    { id: 'CARD', name: 'Cards', fee_minor: 14500, konduyt_state: 'LIVE', on_konduyt: true },
    { id: 'AIRTEL_MONEY', name: 'Airtel Money', fee_minor: 0, konduyt_state: 'PROVIDER_SUPPORTED', on_konduyt: false },
    { id: 'PESALINK', name: 'PesaLink', fee_minor: 2000, konduyt_state: 'PROVIDER_SUPPORTED', on_konduyt: false },
    { id: 'T_KASH', name: 'T-Kash', fee_minor: null, konduyt_state: 'NOT_ON_KONDUYT', on_konduyt: false },
  ],
  // Kenya's own real methods. Some are priced market rows and some are not
  // executable -- but the data is Kenya's, so it is NOT representative.
  coverage_representative: false,
  coverage_has_unroutable_pricing: true,
};

const text = (node) => (node ? node.textContent : '');

console.log('\n=== fees come from the API, never calculated ===');
{
  const { window, document } = loadSdk(KE_RESPONSE);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES', customerCountry: 'KE' });
  await flush(); await flush();
  const rows = [...document.querySelectorAll('.kdu-mtd')];
  const feeTexts = rows.map((r) => text(r.querySelector('.kdu-mtd-fee')));
  check('renders the API fee figures verbatim (5600 minor = 56.00)', feeTexts.some((t) => t.includes('56.00')),
    JSON.stringify(feeTexts));
  check('renders the API fee percentage', feeTexts.some((t) => t.includes('1.12%')), JSON.stringify(feeTexts));
  check('does not invent a fee from the amount (500,000 is NOT shown as a fee)',
    !feeTexts.some((t) => t.includes('500,000')), JSON.stringify(feeTexts));
}

console.log('\n=== null fee is never turned into zero ===');
{
  const resp = JSON.parse(JSON.stringify(KE_RESPONSE));
  resp.methods = [
    { id: 'mpesa', name: 'M-Pesa', fee_minor: null, fee_percent: null, konduyt_state: 'LIVE' },
  ];
  const { window, document } = loadSdk(resp);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES' });
  await flush(); await flush();
  const fee = text(document.querySelector('.kdu-mtd-fee'));
  check('null fee renders as "Fee unavailable"', fee === 'Fee unavailable', fee);
  check('null fee does NOT render as 0', !/0\.00|KSh 0/.test(fee), fee);
  check('an unknown fee is never badged Best value',
    document.querySelectorAll('.kdu-best').length === 0,
    String(document.querySelectorAll('.kdu-best').length));
}

console.log('\n=== estimated range renders as a range ===');
{
  const resp = JSON.parse(JSON.stringify(KE_RESPONSE));
  resp.methods = [
    { id: 'mpesa', name: 'M-Pesa', fee_minor: 3000, fee_minor_low: 2500, fee_minor_high: 4000,
      fee_estimated: true, konduyt_state: 'LIVE' },
  ];
  const { window, document } = loadSdk(resp);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES' });
  await flush(); await flush();
  const fee = text(document.querySelector('.kdu-mtd-fee'));
  check('range is shown as low–high · estimated', fee.includes('25.00') && fee.includes('40.00') && fee.includes('estimated'), fee);
}

console.log('\n=== cheapest genuinely priced method is BEST VALUE ===');
{
  const resp = JSON.parse(JSON.stringify(KE_RESPONSE));
  // Pricier method first, and an unpriced one between them: the badge must
  // follow the real fee, not the row order.
  resp.methods = [
    { id: 'card', name: 'Cards', fee_minor: 14500, fee_percent: 2.9, konduyt_state: 'LIVE' },
    { id: 'paypal_wallet', name: 'PayPal', fee_minor: null, fee_percent: null, konduyt_state: 'LIVE' },
    { id: 'mpesa', name: 'M-Pesa', fee_minor: 5600, fee_percent: 1.12, konduyt_state: 'LIVE' },
  ];
  const { window, document } = loadSdk(resp);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES' });
  await flush(); await flush();
  const rows = [...document.querySelectorAll('.kdu-mtd')];
  const badged = rows.find((r) => r.querySelector('.kdu-best'));
  check('exactly one BEST VALUE badge', document.querySelectorAll('.kdu-best').length === 1);
  check('BADGE is on the cheapest PRICED method (M-Pesa), not the unpriced one',
    !!badged && text(badged).includes('M-Pesa') && !text(badged).includes('Cards'),
    badged ? text(badged) : 'none');
}

console.log('\n=== explicit customer country is sent; transaction is untouched ===');
{
  const cap = {};
  const { window } = loadSdk(KE_RESPONSE, { capture: cap });
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES',
    customerCountry: 'KE', customer: { phone: '0722123456' } });
  await flush(); await flush();
  check('customer_country=KE sent to the API', /customer_country=KE/.test(cap.url), cap.url);
  check('phone sent so the API can use its dial code', /customer_phone=0722123456/.test(cap.url), cap.url);
  check('merchant amount+currency passed through unchanged',
    /amount=500000/.test(cap.url) && /currency=KES/.test(cap.url), cap.url);
}

console.log('\n=== a fee is rendered in the currency the API priced it in ===');
{
  // A US shopper paying a KES 5,000 sale: the country's own catalogue prices
  // local methods in USD. Rendering that figure as KES would quote a real
  // price in the wrong unit -- a correct number, a wrong amount of money.
  const us = {
    merchant: 'Demo Store', customer_country: 'US', customer_country_source: 'explicit',
    reference_amount: 500000, reference_currency: 'KES',
    phone_rules: { country: 'US', dial: '1', required_digits: 10, max_digits: 15, has_numbering_data: true },
    methods: [],
    coverage: [
      { id: 'ACH', name: 'ACH', fee_minor: 800, fee_currency: 'USD', fee_kind: 'market',
        fee_source: 'market', konduyt_state: 'NOT_ON_KONDUYT', on_konduyt: false },
    ],
  };
  const { window, document } = loadSdk(us);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES', customerCountry: 'US' });
  await flush(); await flush();
  const fee = text([...document.querySelectorAll('.kdu-mtd')]
    .map((r) => r.querySelector('.kdu-mtd-fee')).find(Boolean));
  check('the fee says USD, the currency the API priced it in', fee.includes('$') || fee.includes('USD'), fee);
  check('the fee is NOT relabelled as the KES transaction currency',
    !fee.includes('KES') && !fee.includes('Ksh'), fee);
}

console.log('\n=== a zero-priced method is never shown as a real price ===');
{
  // A suppression row (Airtel Money, fee_minor 0) is "no known merchant fee",
  // not "free to accept". It must read unavailable, never a figure of 0.
  const { window, document } = loadSdk(KE_RESPONSE);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES', customerCountry: 'KE' });
  await flush(); await flush();
  const row = [...document.querySelectorAll('.kdu-mtd')]
    .find((r) => text(r).includes('Airtel Money'));
  check('a zero fee renders as unavailable, not as 0.00',
    !!row && !text(row.querySelector('.kdu-mtd-fee')).includes('0.00'),
    row ? text(row.querySelector('.kdu-mtd-fee')) : 'row missing');
}

console.log('\n=== the viewer IP is never used to change the currency ===');
{
  const cap = {};
  const resp = JSON.parse(JSON.stringify(KE_RESPONSE));
  // A local-intelligence-style response would have rewritten the currency.
  // The default path must keep the merchant's KES transaction exactly as-is.
  const { window, document } = loadSdk(resp, { capture: cap });
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES', customerCountry: 'KE' });
  await flush(); await flush();
  const amount = text(document.querySelector('.kdu-amt'));
  check('headline amount stays the merchant KES 5,000.00', amount.includes('5,000.00'), amount);
  check('no currency conversion claim is rendered',
    !document.body.innerHTML.includes('Converted to'), 'found a conversion claim');
}

console.log('\n=== a country with no priced methods still shows its local methods ===');
{
  const gh = {
    merchant: 'Demo Store', customer_country: 'GH', customer_country_source: 'explicit',
    reference_amount: 500000, reference_currency: 'GHS',
    phone_rules: { country: 'GH', dial: '233', required_digits: 9, max_digits: 15, has_numbering_data: true },
    methods: [],
    reason: 'no_coverage',
    coverage: [
      { id: 'MTN_MOMO_GH', name: 'MTN MoMo', fee_minor: null, konduyt_state: 'NOT_ON_KONDUYT', on_konduyt: false },
      { id: 'TELECEL_CASH', name: 'Telecel Cash', fee_minor: null, konduyt_state: 'NOT_ON_KONDUYT', on_konduyt: false },
      { id: 'AIRTELTIGO_MONEY', name: 'AirtelTigo Money', fee_minor: null, konduyt_state: 'NOT_ON_KONDUYT', on_konduyt: false },
      { id: 'GH_CARD', name: 'Cards', fee_minor: null, konduyt_state: 'NOT_ON_KONDUYT', on_konduyt: false },
    ],
    coverage_representative: false,
    coverage_has_unroutable_pricing: false,
  };
  const { window, document } = loadSdk(gh);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'GHS', customerCountry: 'GH' });
  await flush(); await flush();
  const body = document.body.innerHTML;
  check('empty message is honest about Konduyt, not about the country',
    body.includes('No payment methods are available for shoppers in this country yet.'),
    'missing honest empty message');
  check('MTN MoMo is still listed', body.includes('MTN MoMo'));
  check('Telecel Cash is still listed', body.includes('Telecel Cash'));
  check('AirtelTigo Money is still listed', body.includes('AirtelTigo Money'));
  check('they are labelled "Not on Konduyt yet"', body.includes('Not on Konduyt yet'));
  check('no Pay button is offered for them',
    document.querySelectorAll('.kdu-mtd.na[disabled]').length === 4,
    String(document.querySelectorAll('.kdu-mtd.na[disabled]').length));
  check('a country with an empty routable list is NOT reported as having no methods',
    !/No payment methods are available yet\. The merchant needs to connect a provider\./.test(body),
    'showed the generic no-provider message');
}

console.log('\n=== a country\'s own methods are never labelled representative ===');
{
  // KE_RESPONSE has real Kenyan methods, some of which Konduyt can't execute
  // (not on Konduyt yet) and some of which are market-priced. That is a fact
  // about KENYA, not an example borrowed from elsewhere, so the note must say
  // what is actually true and must NOT call the data representative.
  const { window, document } = loadSdk(KE_RESPONSE);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES', customerCountry: 'KE' });
  await flush(); await flush();
  const note = document.querySelector('.kdu-note');
  check('a note is visible when some methods are not executable', !!note, 'no note rendered');
  check('it does NOT call a real country\'s data representative',
    note && !/representative/i.test(text(note)), note ? text(note) : '');
  check('it explains the real caveat -- some methods are not available yet',
    note && /available through Konduyt yet/i.test(text(note)), note ? text(note) : '');
}

console.log('\n=== example (borrowed) pricing is labelled as an example ===');
{
  // A country with no catalogue of its own. The server substitutes another
  // country's methods; that must read as an example, never as this country's
  // payment infrastructure.
  const ng = {
    merchant: 'Demo Store',
    customer_country: 'NG',
    reference_amount: 500000,
    reference_currency: 'KES',
    methods: [],
    reason: 'no_coverage',
    coverage: [
      { id: 'KE_MPESA', name: 'M-Pesa', fee_minor: 7500, konduyt_state: 'NOT_ON_KONDUYT', on_konduyt: false },
    ],
    coverage_representative: true,
    coverage_source_country: 'KE',
    coverage_has_unroutable_pricing: false,
  };
  const { window, document } = loadSdk(ng);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES', customerCountry: 'NG' });
  await flush(); await flush();
  const note = document.querySelector('.kdu-note');
  check('example note is visible', !!note, 'no example note rendered');
  check('it says the data is an example, not this country\'s methods',
    note && /example/i.test(text(note)) && /not payment methods available in/i.test(text(note)),
    note ? text(note) : '');
  check('it names the source country',
    note && /KE/.test(text(note)), note ? text(note) : '');
}

console.log('\n=== phone validation follows the API country rules ===');
{
  const { window, document } = loadSdk(KE_RESPONSE);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES', customerCountry: 'KE' });
  await flush(); await flush();
  const input = document.getElementById('kdu-phone-input');
  check('a phone field is shown because a mobile-money method is offered', !!input);

  const select = () => document.querySelector('.kdu-mtd').dispatchEvent(new window.Event('click'));

  input.value = '072212';  // too short
  input.dispatchEvent(new window.Event('input'));
  const payBtn = document.querySelector('.kdu-pay');
  select();
  check('Pay stays disabled for an invalid (too short) number', payBtn.disabled === true,
    'Pay was enabled for an invalid number');
  check('a helpful error is shown', text(document.querySelector('.kdu-phone-err')).includes('9 digits'),
    text(document.querySelector('.kdu-phone-err')));

  input.value = 'abc0722123456xyz';  // non-digits stripped
  input.dispatchEvent(new window.Event('input'));
  check('non-digit characters are stripped', input.value === '0722123456', input.value);
  select();
  check('Pay is enabled for a valid number', payBtn.disabled === false,
    'Pay stayed disabled for a valid number');
}

console.log('\n=== method-specific next steps, no faked success ===');
{
  for (const [id, expect] of [
    ['mpesa', 'M-Pesa PIN'],
    ['paypal_wallet', 'PayPal'],
    ['pix', 'Pix QR'],
    ['card', 'card details'],
  ]) {
    const resp = JSON.parse(JSON.stringify(KE_RESPONSE));
    resp.methods = [{ id, name: id, fee_minor: 1000, fee_percent: 0.2, konduyt_state: 'LIVE' }];
    resp.phone_rules = null;
    const { window, document } = loadSdk(resp);
    window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES', customerCountry: 'KE' });
    await flush(); await flush();
    document.querySelector('.kdu-mtd').dispatchEvent(new window.Event('click'));
    document.querySelector('.kdu-pay').dispatchEvent(new window.Event('click'));
    const msg = text(document.querySelector('.kdu-nx-m'));
    check(`${id}: shows the real next step`, msg.includes(expect), msg);
    check(`${id}: does not claim the payment succeeded`, !/success|paid|complete[d]?$/i.test(msg) || msg.includes('complete the payment'), msg);
  }
}

console.log('\n=== a method payable AND in coverage is never shown twice ===');
{
  // The real API keys `methods` by connector capability ('ach') and `coverage`
  // by routing rail ('pm_2fefb8...'), naming the same method. Both are LIVE.
  // It must appear once, as a payable row -- not again underneath labelled
  // "Not on Konduyt yet", which is what happened before capability_id.
  const resp = {
    merchant: 'Demo Store', customer_country: 'US', customer_country_source: 'explicit',
    reference_amount: 500000, reference_currency: 'USD', phone_rules: null,
    methods: [
      { id: 'ach', name: 'ACH', via: 'Stripe', fee_minor: 500, fee_percent: 0.1,
        fee_source: 'konduyt', konduyt_state: 'LIVE' },
    ],
    coverage: [
      { id: 'pm_2fefb85c8f45e79b', capability_id: 'ach', name: 'ACH', method_type: 'BANK_TRANSFER',
        fee_minor: 4000, fee_estimated: true, konduyt_state: 'LIVE', on_konduyt: true },
      { id: 'pm_620df74a8dae6f2c', capability_id: 'card', name: 'Debit/Credit Cards',
        method_type: 'CARD', fee_minor: 1500, konduyt_state: 'LIVE', on_konduyt: true },
      { id: 'pm_us_wire', capability_id: null, name: 'Wire Transfer', method_type: 'BANK_TRANSFER',
        fee_minor: 2500, konduyt_state: 'NOT_ON_KONDUYT', on_konduyt: false },
    ],
    coverage_representative: false,
    coverage_has_unroutable_pricing: true,
  };
  const { window, document } = loadSdk(resp);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'USD', customerCountry: 'US' });
  await flush(); await flush();
  const all = [...document.querySelectorAll('.kdu-mtd')].map((r) => text(r));
  const achRows = all.filter((t) => t.includes('ACH'));
  check('ACH appears exactly once', achRows.length === 1, JSON.stringify(all));
  check('ACH is NOT repeated as a "Not on Konduyt yet" row',
    !achRows.some((t) => t.includes('Not on Konduyt yet')), JSON.stringify(achRows));
  check('a genuinely unavailable method (Wire Transfer) still appears',
    all.some((t) => t.includes('Wire Transfer') && t.includes('Not on Konduyt yet')), JSON.stringify(all));
  check('a LIVE method this project has no provider for is not mislabelled as unavailable',
    !all.some((t) => t.includes('Debit/Credit Cards') && t.includes('Not on Konduyt yet')),
    JSON.stringify(all));
}

console.log('\n=== pay button state is honest on selection ===');
{
  const { window, document } = loadSdk(KE_RESPONSE);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES' });
  await flush(); await flush();
  const payBtn = document.querySelector('.kdu-pay');
  check('Pay starts disabled before a method is chosen', payBtn.disabled === true);
  check('button says "Select a method"', text(payBtn) === 'Select a method', text(payBtn));
  document.querySelector('.kdu-mtd').dispatchEvent(new window.Event('click'));
  check('Pay button shows the real amount once selected', /Pay KSh 5,000\.00/.test(text(payBtn)), text(payBtn));
}

console.log('\n=== direct-to-merchant trust message ===');
{
  const { window, document } = loadSdk(KE_RESPONSE);
  window.Konduyt.checkout({ publishableKey: 'pk_test_x', amount: 500000, currency: 'KES' });
  await flush(); await flush();
  const footer = text(document.querySelector('.kdu-ft'));
  check('direct-to-merchant message is present', /directly to the merchant/i.test(footer), footer);
}

console.log('\n' + '-'.repeat(60));
console.log(`  ${checks - failures}/${checks} passed`);
console.log('-'.repeat(60));
process.exit(failures ? 1 : 0);