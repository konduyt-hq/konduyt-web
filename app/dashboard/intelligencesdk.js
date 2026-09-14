// A real, standalone demo -- one self-contained HTML file, HTML + CSS + JS
// together, no build step, no dependency.
//
// Two real flows, matching a real product, not just one scenario:
//
// ONE-TIME (the top section): a simple product with ONE "Pay" button.
//   1. Click Pay -> calls the real, public /v1/demo/run (same endpoint
//      DevPanel.js's own "Test before you sign up" button uses -- no key,
//      no backend needed for this step) -- shows the real, ranked payment
//      options for this amount, cheapest first, as a real popup -- the
//      same dotted-background modal style used across the rest of this
//      product, not a plain inline table.
//   2. Pick one -> THAT calls YOUR OWN backend at
//      http://localhost:3000/api/create-payment.
//
// A real phone number (with its real country code) is collected first,
// before Pay is even clickable -- Konduyt needs this to know which
// country's real rail catalogue to rank against, the same real "country"
// field /v1/demo/run's own backend already accepts and honors.
//
// RECURRING (the section below it): a fixed subscription price with its
// own "Subscribe" button, calling YOUR OWN backend's
// /api/create-subscription -- the SAME route every backend language tab
// implements alongside create-payment. No intelligence comparison step
// here -- a subscription authorizes once, in Konduyt's own checkout, not
// per-charge.
//
// Both routes are real ids in this file (payButton, subscribeButton, and
// so on), read by name in every backend language tab's own comments --
// open this file next to a running backend from any of those tabs and
// both flows work end to end, the same way a real customer would
// actually use them.

export const INTELLIGENCE_TESTING_SDK = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Konduyt — Sample Checkout</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 420px;
    margin: 60px auto;
    padding: 0 20px;
    color: #0a0a0a;
  }
  .product { border: 1px solid #e5e5e5; border-radius: 14px; padding: 24px; }
  .product h1 { font-size: 18px; margin: 0 0 4px; }
  .product .sub { color: #6b6b6b; font-size: 13px; margin: 0 0 20px; }
  .price { font-size: 26px; font-weight: 700; margin-bottom: 18px; }

  .phone-row { display: flex; gap: 8px; margin-bottom: 16px; }
  #countryCode {
    width: 92px;
    padding: 10px 8px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
  }
  #phoneInput {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
  }
  .phone-hint { font-size: 11.5px; color: #6b6b6b; margin: -10px 0 16px; }

  #payButton {
    width: 100%;
    padding: 13px;
    border: none;
    border-radius: 9px;
    background: #0a0a0a;
    color: #fff;
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
  }
  #payButton:disabled { opacity: 0.5; cursor: default; }

  /* Real Konduyt popup styling -- the same dotted-background modal used
     across the rest of this product, not a plain inline table. */
  .intel-modal-overlay {
    display: none;
    position: fixed; inset: 0;
    background: rgba(10,10,10,.55);
    align-items: center; justify-content: center;
    z-index: 100; padding: 20px;
  }
  .intel-modal-overlay.open { display: flex; }
  .intel-modal {
    position: relative;
    background-color: #fff;
    background-image: radial-gradient(rgba(0,0,0,0.13) 1px, transparent 1px);
    background-size: 16px 16px; background-position: 0 0;
    border-radius: 16px; max-width: 420px; width: 100%; padding: 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
  }
  .intel-modal-close {
    position: absolute; top: 16px; right: 16px;
    background: none; border: none; font-size: 16px; color: #6b6b6b; cursor: pointer;
  }
  .intel-modal-title { font-size: 18px; font-weight: 800; margin-bottom: 6px; }
  .intel-modal-sub { font-size: 12.5px; line-height: 1.5; color: #6b6b6b; margin-bottom: 6px; }
  .intel-modal-shopper-note {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    color: #16794a; margin-bottom: 10px;
  }
  .intel-modal-rep-note {
    font-size: 11.5px; line-height: 1.5; color: #8a6d1a; background: #fdf6e3;
    border: 1px solid #f0e2b0; border-radius: 9px; padding: 10px 12px; margin-bottom: 14px;
  }
  .intel-modal-table { border: 1px solid #e7e7e7; border-radius: 11px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  tr.rail { cursor: pointer; }
  tr.rail:hover td { background: #fafafa; }
  tr.best td { font-weight: 700; }
  td { padding: 11px 13px; font-size: 13.5px; border-bottom: 1px solid #e7e7e7; }
  tr:last-child td { border-bottom: none; }
  .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
    background: #0a0a0a; color: #fff; padding: 3px 7px; border-radius: 5px; margin-left: 6px; }

  #checkout { display: none; margin-top: 18px; }
  #checkout.open { display: block; }
  #checkout .sub { font-size: 12.5px; color: #6b6b6b; margin: 0 0 12px; }
  #checkout input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    margin-bottom: 10px;
  }
  #confirmButton {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #0a0a0a;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  #resultDiv { margin-top: 12px; font-size: 12.5px; color: #6b6b6b; word-break: break-all; }

  .divider { border: none; border-top: 1px solid #e5e5e5; margin: 32px 0; }
  #subscribeButton {
    width: 100%;
    padding: 13px;
    border: 1px solid #0a0a0a;
    border-radius: 9px;
    background: #fff;
    color: #0a0a0a;
    font-size: 14.5px;
    font-weight: 600;
    cursor: pointer;
  }
  #subscribeButton:disabled { opacity: 0.5; cursor: default; }
  #subResultDiv { margin-top: 12px; font-size: 12.5px; color: #6b6b6b; word-break: break-all; }
</style>
</head>
<body>

  <div class="product">
    <h1>Sample product</h1>
    <p class="sub">What your customer actually sees first -- price, phone number, and Pay.</p>
    <div class="price">KES 5,000.00</div>

    <div class="phone-row">
      <select id="countryCode">
        <option value="254" data-iso="KE" selected>🇰🇪 Kenya +254</option>
        <option value="93" data-iso="AF">🇦🇫 Afghanistan +93</option>
        <option value="355" data-iso="AL">🇦🇱 Albania +355</option>
        <option value="213" data-iso="DZ">🇩🇿 Algeria +213</option>
        <option value="376" data-iso="AD">🇦🇩 Andorra +376</option>
        <option value="244" data-iso="AO">🇦🇴 Angola +244</option>
        <option value="1268" data-iso="AG">🇦🇬 Antigua and Barbuda +1268</option>
        <option value="54" data-iso="AR">🇦🇷 Argentina +54</option>
        <option value="374" data-iso="AM">🇦🇲 Armenia +374</option>
        <option value="61" data-iso="AU">🇦🇺 Australia +61</option>
        <option value="43" data-iso="AT">🇦🇹 Austria +43</option>
        <option value="994" data-iso="AZ">🇦🇿 Azerbaijan +994</option>
        <option value="1242" data-iso="BS">🇧🇸 Bahamas +1242</option>
        <option value="973" data-iso="BH">🇧🇭 Bahrain +973</option>
        <option value="880" data-iso="BD">🇧🇩 Bangladesh +880</option>
        <option value="1246" data-iso="BB">🇧🇧 Barbados +1246</option>
        <option value="375" data-iso="BY">🇧🇾 Belarus +375</option>
        <option value="32" data-iso="BE">🇧🇪 Belgium +32</option>
        <option value="501" data-iso="BZ">🇧🇿 Belize +501</option>
        <option value="229" data-iso="BJ">🇧🇯 Benin +229</option>
        <option value="975" data-iso="BT">🇧🇹 Bhutan +975</option>
        <option value="591" data-iso="BO">🇧🇴 Bolivia +591</option>
        <option value="387" data-iso="BA">🇧🇦 Bosnia and Herzegovina +387</option>
        <option value="267" data-iso="BW">🇧🇼 Botswana +267</option>
        <option value="55" data-iso="BR">🇧🇷 Brazil +55</option>
        <option value="673" data-iso="BN">🇧🇳 Brunei +673</option>
        <option value="359" data-iso="BG">🇧🇬 Bulgaria +359</option>
        <option value="226" data-iso="BF">🇧🇫 Burkina Faso +226</option>
        <option value="257" data-iso="BI">🇧🇮 Burundi +257</option>
        <option value="238" data-iso="CV">🇨🇻 Cabo Verde +238</option>
        <option value="855" data-iso="KH">🇰🇭 Cambodia +855</option>
        <option value="237" data-iso="CM">🇨🇲 Cameroon +237</option>
        <option value="1" data-iso="CA">🇨🇦 Canada +1</option>
        <option value="236" data-iso="CF">🇨🇫 Central African Republic +236</option>
        <option value="235" data-iso="TD">🇹🇩 Chad +235</option>
        <option value="56" data-iso="CL">🇨🇱 Chile +56</option>
        <option value="86" data-iso="CN">🇨🇳 China +86</option>
        <option value="57" data-iso="CO">🇨🇴 Colombia +57</option>
        <option value="269" data-iso="KM">🇰🇲 Comoros +269</option>
        <option value="506" data-iso="CR">🇨🇷 Costa Rica +506</option>
        <option value="385" data-iso="HR">🇭🇷 Croatia +385</option>
        <option value="53" data-iso="CU">🇨🇺 Cuba +53</option>
        <option value="357" data-iso="CY">🇨🇾 Cyprus +357</option>
        <option value="420" data-iso="CZ">🇨🇿 Czechia +420</option>
        <option value="225" data-iso="CI">🇨🇮 Côte d'Ivoire +225</option>
        <option value="243" data-iso="CD">🇨🇩 Democratic Republic of the Congo +243</option>
        <option value="45" data-iso="DK">🇩🇰 Denmark +45</option>
        <option value="253" data-iso="DJ">🇩🇯 Djibouti +253</option>
        <option value="1767" data-iso="DM">🇩🇲 Dominica +1767</option>
        <option value="1809" data-iso="DO">🇩🇴 Dominican Republic +1809</option>
        <option value="593" data-iso="EC">🇪🇨 Ecuador +593</option>
        <option value="20" data-iso="EG">🇪🇬 Egypt +20</option>
        <option value="503" data-iso="SV">🇸🇻 El Salvador +503</option>
        <option value="240" data-iso="GQ">🇬🇶 Equatorial Guinea +240</option>
        <option value="291" data-iso="ER">🇪🇷 Eritrea +291</option>
        <option value="372" data-iso="EE">🇪🇪 Estonia +372</option>
        <option value="268" data-iso="SZ">🇸🇿 Eswatini +268</option>
        <option value="251" data-iso="ET">🇪🇹 Ethiopia +251</option>
        <option value="679" data-iso="FJ">🇫🇯 Fiji +679</option>
        <option value="358" data-iso="FI">🇫🇮 Finland +358</option>
        <option value="33" data-iso="FR">🇫🇷 France +33</option>
        <option value="241" data-iso="GA">🇬🇦 Gabon +241</option>
        <option value="220" data-iso="GM">🇬🇲 Gambia +220</option>
        <option value="995" data-iso="GE">🇬🇪 Georgia +995</option>
        <option value="49" data-iso="DE">🇩🇪 Germany +49</option>
        <option value="233" data-iso="GH">🇬🇭 Ghana +233</option>
        <option value="30" data-iso="GR">🇬🇷 Greece +30</option>
        <option value="1473" data-iso="GD">🇬🇩 Grenada +1473</option>
        <option value="502" data-iso="GT">🇬🇹 Guatemala +502</option>
        <option value="224" data-iso="GN">🇬🇳 Guinea +224</option>
        <option value="245" data-iso="GW">🇬🇼 Guinea-Bissau +245</option>
        <option value="592" data-iso="GY">🇬🇾 Guyana +592</option>
        <option value="509" data-iso="HT">🇭🇹 Haiti +509</option>
        <option value="504" data-iso="HN">🇭🇳 Honduras +504</option>
        <option value="36" data-iso="HU">🇭🇺 Hungary +36</option>
        <option value="354" data-iso="IS">🇮🇸 Iceland +354</option>
        <option value="91" data-iso="IN">🇮🇳 India +91</option>
        <option value="62" data-iso="ID">🇮🇩 Indonesia +62</option>
        <option value="98" data-iso="IR">🇮🇷 Iran +98</option>
        <option value="964" data-iso="IQ">🇮🇶 Iraq +964</option>
        <option value="353" data-iso="IE">🇮🇪 Ireland +353</option>
        <option value="972" data-iso="IL">🇮🇱 Israel +972</option>
        <option value="39" data-iso="IT">🇮🇹 Italy +39</option>
        <option value="1876" data-iso="JM">🇯🇲 Jamaica +1876</option>
        <option value="81" data-iso="JP">🇯🇵 Japan +81</option>
        <option value="962" data-iso="JO">🇯🇴 Jordan +962</option>
        <option value="7" data-iso="KZ">🇰🇿 Kazakhstan +7</option>
        <option value="686" data-iso="KI">🇰🇮 Kiribati +686</option>
        <option value="383" data-iso="XK">🇽🇰 Kosovo +383</option>
        <option value="965" data-iso="KW">🇰🇼 Kuwait +965</option>
        <option value="996" data-iso="KG">🇰🇬 Kyrgyzstan +996</option>
        <option value="856" data-iso="LA">🇱🇦 Laos +856</option>
        <option value="371" data-iso="LV">🇱🇻 Latvia +371</option>
        <option value="961" data-iso="LB">🇱🇧 Lebanon +961</option>
        <option value="266" data-iso="LS">🇱🇸 Lesotho +266</option>
        <option value="231" data-iso="LR">🇱🇷 Liberia +231</option>
        <option value="218" data-iso="LY">🇱🇾 Libya +218</option>
        <option value="423" data-iso="LI">🇱🇮 Liechtenstein +423</option>
        <option value="370" data-iso="LT">🇱🇹 Lithuania +370</option>
        <option value="352" data-iso="LU">🇱🇺 Luxembourg +352</option>
        <option value="261" data-iso="MG">🇲🇬 Madagascar +261</option>
        <option value="265" data-iso="MW">🇲🇼 Malawi +265</option>
        <option value="60" data-iso="MY">🇲🇾 Malaysia +60</option>
        <option value="960" data-iso="MV">🇲🇻 Maldives +960</option>
        <option value="223" data-iso="ML">🇲🇱 Mali +223</option>
        <option value="356" data-iso="MT">🇲🇹 Malta +356</option>
        <option value="692" data-iso="MH">🇲🇭 Marshall Islands +692</option>
        <option value="222" data-iso="MR">🇲🇷 Mauritania +222</option>
        <option value="230" data-iso="MU">🇲🇺 Mauritius +230</option>
        <option value="52" data-iso="MX">🇲🇽 Mexico +52</option>
        <option value="691" data-iso="FM">🇫🇲 Micronesia +691</option>
        <option value="373" data-iso="MD">🇲🇩 Moldova +373</option>
        <option value="377" data-iso="MC">🇲🇨 Monaco +377</option>
        <option value="976" data-iso="MN">🇲🇳 Mongolia +976</option>
        <option value="382" data-iso="ME">🇲🇪 Montenegro +382</option>
        <option value="212" data-iso="MA">🇲🇦 Morocco +212</option>
        <option value="258" data-iso="MZ">🇲🇿 Mozambique +258</option>
        <option value="95" data-iso="MM">🇲🇲 Myanmar +95</option>
        <option value="264" data-iso="NA">🇳🇦 Namibia +264</option>
        <option value="674" data-iso="NR">🇳🇷 Nauru +674</option>
        <option value="977" data-iso="NP">🇳🇵 Nepal +977</option>
        <option value="31" data-iso="NL">🇳🇱 Netherlands +31</option>
        <option value="64" data-iso="NZ">🇳🇿 New Zealand +64</option>
        <option value="505" data-iso="NI">🇳🇮 Nicaragua +505</option>
        <option value="227" data-iso="NE">🇳🇪 Niger +227</option>
        <option value="234" data-iso="NG">🇳🇬 Nigeria +234</option>
        <option value="850" data-iso="KP">🇰🇵 North Korea +850</option>
        <option value="389" data-iso="MK">🇲🇰 North Macedonia +389</option>
        <option value="47" data-iso="NO">🇳🇴 Norway +47</option>
        <option value="968" data-iso="OM">🇴🇲 Oman +968</option>
        <option value="92" data-iso="PK">🇵🇰 Pakistan +92</option>
        <option value="680" data-iso="PW">🇵🇼 Palau +680</option>
        <option value="970" data-iso="PS">🇵🇸 Palestine +970</option>
        <option value="507" data-iso="PA">🇵🇦 Panama +507</option>
        <option value="675" data-iso="PG">🇵🇬 Papua New Guinea +675</option>
        <option value="595" data-iso="PY">🇵🇾 Paraguay +595</option>
        <option value="51" data-iso="PE">🇵🇪 Peru +51</option>
        <option value="63" data-iso="PH">🇵🇭 Philippines +63</option>
        <option value="48" data-iso="PL">🇵🇱 Poland +48</option>
        <option value="351" data-iso="PT">🇵🇹 Portugal +351</option>
        <option value="974" data-iso="QA">🇶🇦 Qatar +974</option>
        <option value="242" data-iso="CG">🇨🇬 Republic of the Congo +242</option>
        <option value="40" data-iso="RO">🇷🇴 Romania +40</option>
        <option value="250" data-iso="RW">🇷🇼 Rwanda +250</option>
        <option value="1869" data-iso="KN">🇰🇳 Saint Kitts and Nevis +1869</option>
        <option value="1758" data-iso="LC">🇱🇨 Saint Lucia +1758</option>
        <option value="1784" data-iso="VC">🇻🇨 Saint Vincent and the Grenadines +1784</option>
        <option value="685" data-iso="WS">🇼🇸 Samoa +685</option>
        <option value="378" data-iso="SM">🇸🇲 San Marino +378</option>
        <option value="966" data-iso="SA">🇸🇦 Saudi Arabia +966</option>
        <option value="221" data-iso="SN">🇸🇳 Senegal +221</option>
        <option value="381" data-iso="RS">🇷🇸 Serbia +381</option>
        <option value="248" data-iso="SC">🇸🇨 Seychelles +248</option>
        <option value="232" data-iso="SL">🇸🇱 Sierra Leone +232</option>
        <option value="65" data-iso="SG">🇸🇬 Singapore +65</option>
        <option value="421" data-iso="SK">🇸🇰 Slovakia +421</option>
        <option value="386" data-iso="SI">🇸🇮 Slovenia +386</option>
        <option value="677" data-iso="SB">🇸🇧 Solomon Islands +677</option>
        <option value="252" data-iso="SO">🇸🇴 Somalia +252</option>
        <option value="27" data-iso="ZA">🇿🇦 South Africa +27</option>
        <option value="82" data-iso="KR">🇰🇷 South Korea +82</option>
        <option value="211" data-iso="SS">🇸🇸 South Sudan +211</option>
        <option value="34" data-iso="ES">🇪🇸 Spain +34</option>
        <option value="94" data-iso="LK">🇱🇰 Sri Lanka +94</option>
        <option value="249" data-iso="SD">🇸🇩 Sudan +249</option>
        <option value="597" data-iso="SR">🇸🇷 Suriname +597</option>
        <option value="46" data-iso="SE">🇸🇪 Sweden +46</option>
        <option value="41" data-iso="CH">🇨🇭 Switzerland +41</option>
        <option value="963" data-iso="SY">🇸🇾 Syria +963</option>
        <option value="239" data-iso="ST">🇸🇹 São Tomé and Príncipe +239</option>
        <option value="886" data-iso="TW">🇹🇼 Taiwan +886</option>
        <option value="992" data-iso="TJ">🇹🇯 Tajikistan +992</option>
        <option value="255" data-iso="TZ">🇹🇿 Tanzania +255</option>
        <option value="66" data-iso="TH">🇹🇭 Thailand +66</option>
        <option value="670" data-iso="TL">🇹🇱 Timor-Leste +670</option>
        <option value="228" data-iso="TG">🇹🇬 Togo +228</option>
        <option value="676" data-iso="TO">🇹🇴 Tonga +676</option>
        <option value="1868" data-iso="TT">🇹🇹 Trinidad and Tobago +1868</option>
        <option value="216" data-iso="TN">🇹🇳 Tunisia +216</option>
        <option value="993" data-iso="TM">🇹🇲 Turkmenistan +993</option>
        <option value="688" data-iso="TV">🇹🇻 Tuvalu +688</option>
        <option value="90" data-iso="TR">🇹🇷 Türkiye +90</option>
        <option value="256" data-iso="UG">🇺🇬 Uganda +256</option>
        <option value="380" data-iso="UA">🇺🇦 Ukraine +380</option>
        <option value="971" data-iso="AE">🇦🇪 United Arab Emirates +971</option>
        <option value="44" data-iso="GB">🇬🇧 United Kingdom +44</option>
        <option value="1" data-iso="US">🇺🇸 United States +1</option>
        <option value="598" data-iso="UY">🇺🇾 Uruguay +598</option>
        <option value="998" data-iso="UZ">🇺🇿 Uzbekistan +998</option>
        <option value="678" data-iso="VU">🇻🇺 Vanuatu +678</option>
        <option value="379" data-iso="VA">🇻🇦 Vatican City +379</option>
        <option value="58" data-iso="VE">🇻🇪 Venezuela +58</option>
        <option value="84" data-iso="VN">🇻🇳 Vietnam +84</option>
        <option value="967" data-iso="YE">🇾🇪 Yemen +967</option>
        <option value="260" data-iso="ZM">🇿🇲 Zambia +260</option>
        <option value="263" data-iso="ZW">🇿🇼 Zimbabwe +263</option>
      </select>
      <input id="phoneInput" type="tel" placeholder="722 123 456" />
    </div>
    <p class="phone-hint">Konduyt uses the country code to know which country's real rail catalogue to rank -- this is how a real checkout works too, not a demo-only step.</p>

    <button id="payButton" type="button" disabled>Pay</button>
  </div>

  <div class="intel-modal-overlay" id="intelOverlay">
    <div class="intel-modal">
      <button class="intel-modal-close" type="button" id="intelClose">✕</button>
      <div class="intel-modal-title">Preview checkout</div>
      <p class="intel-modal-sub" id="intelModalSub">Every way this customer could pay, converted into their own currency.</p>
      <p class="intel-modal-shopper-note">This is what the customer sees</p>
      <div class="intel-modal-rep-note" id="repNote" style="display:none;"></div>
      <div class="intel-modal-table">
        <table><tbody id="railRows"></tbody></table>
      </div>

      <div id="checkout">
        <p class="sub">Paying with <strong id="chosenRail"></strong> -- calls YOUR OWN backend, never Konduyt directly.</p>
        <input id="emailInput" type="email" value="customer@example.com" placeholder="Email" />
        <button id="confirmButton" type="button">Confirm — Pay</button>
        <div id="resultDiv"></div>
      </div>
    </div>
  </div>

  <hr class="divider" />

  <div class="product">
    <h1>Sample subscription</h1>
    <p class="sub">A fixed recurring price -- e.g. a Pro Plan. No comparison step: the customer authorizes once, in Konduyt's own checkout, and every later charge reuses that authorization automatically.</p>
    <div class="price">KES 1,000.00 / month</div>
    <button id="subscribeButton" type="button">Subscribe</button>
    <div id="subResultDiv"></div>
  </div>

  <script>
    var AMOUNT_MINOR = 500000; // KES 5,000.00 -- the REFERENCE price; the
    // real, displayed currency/amount always come from the backend's own
    // response (payment.currency / payment.amount), never assumed here.
    var CURRENCY = 'KES'; // default only -- overwritten below with whatever the backend actually used
    var chosenProvider = null;

    // The phone number (with its real country code) has to be filled in
    // before Pay is even clickable -- Konduyt needs it to know which
    // country's real rail catalogue to rank against.
    var countryCodeEl = document.getElementById('countryCode');
    var phoneInputEl = document.getElementById('phoneInput');
    var payButtonEl = document.getElementById('payButton');

    function updatePayButtonState() {
      payButtonEl.disabled = phoneInputEl.value.trim().length < 6;
    }
    phoneInputEl.addEventListener('input', updatePayButtonState);

    payButtonEl.addEventListener('click', function () {
      var btn = payButtonEl;
      btn.disabled = true;
      btn.textContent = 'Loading…';

      var iso = countryCodeEl.selectedOptions[0].getAttribute('data-iso');

      // The real, public intelligence endpoint -- no key, no backend of
      // your own needed for this step. Same one DevPanel.js's own
      // "Test before you sign up" button calls. country: an explicit
      // value is honored by the real backend (mainly useful for testing,
      // per that endpoint's own docstring) -- derived here from the
      // phone number's own real country code, not guessed.
      fetch('https://konduyt-api.onrender.com/v1/demo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: AMOUNT_MINOR, currency: 'KES', country: iso })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          // The real currency this response actually used -- e.g. USD for
          // a US number -- not assumed, read directly from what the
          // backend computed. Every fee shown below is already IN this
          // currency: the real backend converts each rail's own fee into
          // it before this response is even sent, not left to the
          // frontend to guess an exchange rate.
          CURRENCY = (data.payment && data.payment.currency) || 'KES';

          // The real, converted reference price -- e.g. KES 5,000.00
          // converted into its real USD equivalent for a US shopper, not
          // relabeled as if $5,000 were the original price.
          var subEl = document.getElementById('intelModalSub');
          if (subEl && data.payment && typeof data.payment.amount === 'number') {
            subEl.textContent = 'Every way this customer could pay, converted into ' + CURRENCY + ' (' + fmt(data.payment.amount) + ').';
          }

          var repNote = document.getElementById('repNote');
          if (data.is_representative_example) {
            // Real and honest, not hidden: Konduyt doesn't have sourced
            // rail data for every country yet (Kenya's catalogue is the
            // most complete today). When that's true for the selected
            // country, the backend says so directly
            // (is_representative_example) rather than silently showing
            // Kenya-only methods as if they were genuinely available
            // wherever the customer is.
            var countryName = iso;
            var opt = countryCodeEl.selectedOptions[0];
            if (opt) countryName = opt.textContent.replace(/^\\S+\\s+/, '').replace(/\\s+\\+\\d+$/, '').trim() || iso;
            repNote.textContent = 'Konduyt doesn\\'t have sourced payment-provider data for ' + countryName + ' yet, so this shows Kenya\\'s real, connected-provider pricing as a representative example, converted into ' + CURRENCY + ' for display.';
            repNote.style.display = 'block';
          } else {
            repNote.style.display = 'none';
          }

          var options = (data.intelligence && data.intelligence.options) || [];
          renderRails(options);
          document.getElementById('intelOverlay').classList.add('open');
        })
        .catch(function () {
          document.getElementById('intelOverlay').classList.add('open');
          document.getElementById('railRows').innerHTML =
            '<tr><td colspan="2">Could not reach the intelligence endpoint. Try again.</td></tr>';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Pay';
        });
    });

    document.getElementById('intelClose').addEventListener('click', function () {
      document.getElementById('intelOverlay').classList.remove('open');
      document.getElementById('checkout').classList.remove('open');
    });
    document.getElementById('intelOverlay').addEventListener('click', function (e) {
      if (e.target === this) {
        this.classList.remove('open');
        document.getElementById('checkout').classList.remove('open');
      }
    });

    function renderRails(options) {
      var rows = '';
      for (var i = 0; i < options.length; i++) {
        var o = options[i];
        var isBest = i === 0;
        rows += '<tr class="rail' + (isBest ? ' best' : '') + '" data-provider="' + o.provider + '" data-label="' + o.label + '">' +
          '<td>' + o.label + (isBest ? '<span class="badge">Best value</span>' : '') + '</td>' +
          '<td>' + (o.fee_minor != null ? fmt(o.fee_minor) : '—') + '</td></tr>';
      }
      document.getElementById('railRows').innerHTML = rows ||
        '<tr><td colspan="2">No ranked options for this amount right now.</td></tr>';

      var trs = document.querySelectorAll('#railRows tr.rail');
      for (var j = 0; j < trs.length; j++) {
        trs[j].addEventListener('click', function () {
          chosenProvider = this.getAttribute('data-provider');
          document.getElementById('chosenRail').textContent = this.getAttribute('data-label');
          document.getElementById('checkout').classList.add('open');
        });
      }
    }

    function fmt(minor) {
      try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY }).format(minor / 100); }
      catch (e) { return CURRENCY + ' ' + (minor / 100).toFixed(2); }
    }

    // The actual charge -- YOUR OWN backend, never Konduyt directly. Same
    // pattern as every backend language tab: the frontend never holds a
    // secret key, only your server does.
    document.getElementById('confirmButton').addEventListener('click', function () {
      var btn = document.getElementById('confirmButton');
      var resultDiv = document.getElementById('resultDiv');
      var email = document.getElementById('emailInput').value;
      var phone = countryCodeEl.value + phoneInputEl.value.replace(/\\D/g, '');

      btn.disabled = true;
      btn.textContent = 'Processing…';
      resultDiv.textContent = '';

      fetch('http://localhost:3000/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: AMOUNT_MINOR, email: email, phone: phone, provider: chosenProvider })
      })
        .then(function (r) { return r.json(); })
        .then(function (payment) {
          resultDiv.textContent = JSON.stringify(payment);
        })
        .catch(function () {
          resultDiv.textContent = 'Could not reach your backend at localhost:3000 -- is it running?';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Confirm — Pay';
        });
    });

    // A fixed recurring price -- calls YOUR OWN backend's
    // /api/create-subscription route, the same one every backend language
    // tab implements alongside /api/create-payment. No intelligence
    // comparison step here on purpose: a subscription authorizes once, in
    // Konduyt's own checkout widget, not per-charge -- there's no per-
    // transaction rail to rank yet. A real integration would take the
    // session id this returns and open it with Konduyt.checkout({ sessionId }).
    document.getElementById('subscribeButton').addEventListener('click', function () {
      var btn = document.getElementById('subscribeButton');
      var resultDiv = document.getElementById('subResultDiv');

      btn.disabled = true;
      btn.textContent = 'Processing…';
      resultDiv.textContent = '';

      fetch('http://localhost:3000/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(function (r) { return r.json(); })
        .then(function (session) {
          resultDiv.textContent = JSON.stringify(session) + ' -- open with Konduyt.checkout({ sessionId }).';
        })
        .catch(function () {
          resultDiv.textContent = 'Could not reach your backend at localhost:3000 -- is it running?';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Subscribe';
        });
    });
  </script>
</body>
</html>`;
