// The single checkout page every backend snippet serves at "/".
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
export const SHARED_CHECKOUT_HTML = `<!DOCTYPE html>
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
  .intel-modal-title { font-size: 18px; font-weight: 800; margin-bottom: 6px; display: inline-block; }
  .intel-beta-badge {
    display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.03em; color: #6b6b6b; background: #f0f0f0; border-radius: 5px;
    padding: 2px 7px; margin-left: 8px; vertical-align: middle; position: relative; top: -2px;
  }
  .intel-modal-sub { font-size: 12.5px; line-height: 1.5; color: #6b6b6b; margin-bottom: 6px; }
  .intel-modal-shopper-note {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    color: #16794a; margin-bottom: 10px;
  }
  .intel-modal-rep-note {
    font-size: 10.5px; line-height: 1.4; color: #9a9a9a; margin-bottom: 10px;
  }
  .intel-modal-footer {
    font-size: 10.5px; color: #b0b0b0; text-align: center; margin-top: 14px;
  }
  .intel-modal-table { border: 1px solid #e7e7e7; border-radius: 11px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.04em; color: #9a9a9a; padding: 9px 13px 6px;
  }
  th:last-child { text-align: right; }
  tr.rail td { vertical-align: middle; }
  tr.rail:hover td { background: #fafafa; }
  tr.best td { font-weight: 700; }
  td { padding: 11px 13px; font-size: 13.5px; border-bottom: 1px solid #e7e7e7; }
  tr:last-child td { border-bottom: none; }
  .badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;
    background: #0a0a0a; color: #fff; padding: 3px 7px; border-radius: 5px; margin-left: 6px; }
  .rail-fee { white-space: nowrap; }
  .rail-fee-note { display: block; font-size: 10px; color: #9a9a9a; font-weight: 500; }
  .rail-action { text-align: right; white-space: nowrap; }
  .rail-pay {
    padding: 6px 14px; border: none; border-radius: 7px; background: #0a0a0a;
    color: #fff; font-size: 12.5px; font-weight: 600; font-family: inherit; cursor: pointer;
  }
  .rail-pay:hover { background: #262626; }
  /* A real method Konduyt cannot route yet: shown, but plainly not payable. */
  .rail-unsupported {
    font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
    color: #9a9a9a;
  }
  tr.rail-unsupported td { color: #6b6b6b; }

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
</style>
</head>
<body>

  <div class="product">
    <h1>Sample product</h1>
    <p class="sub">What your customer actually sees first -- price, phone number, and Pay.</p>
    <div class="price">Your cart</div>

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
      <input id="phoneInput" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="15" placeholder="722 123 456" />
    </div>
    <p class="phone-hint" id="phoneHint" style="display:none; color:#b00020; margin-top:-8px;"></p>
    <p class="phone-hint">Konduyt uses the country code to know which country's real rail catalogue to rank -- this is how a real checkout works too, not a demo-only step.</p>

    <button id="payButton" type="button" disabled>Pay</button>
  </div>

  <div class="intel-modal-overlay" id="intelOverlay">
    <div class="intel-modal">
      <button class="intel-modal-close" type="button" id="intelClose">✕</button>
      <div class="intel-modal-title">Preview checkout<span class="intel-beta-badge">Beta</span></div>
      <p class="intel-modal-sub" id="intelModalSub">Every way this customer could pay, converted into their own currency.</p>
      <p class="intel-modal-shopper-note">This is what the customer sees</p>
      <div class="intel-modal-rep-note" id="repNote" style="display:none;"></div>
      <div class="intel-modal-table">
        <table>
          <thead><tr><th>Pay with</th><th>Transaction fee</th><th></th></tr></thead>
          <tbody id="railRows"></tbody>
        </table>
      </div>

      <div id="checkout">
        <p class="sub">Paying with <strong id="chosenRail"></strong> -- calls YOUR OWN backend, never Konduyt directly.</p>
        <input id="emailInput" type="email" value="customer@example.com" placeholder="Email" />
        <button id="confirmButton" type="button">Confirm — Pay</button>
        <div id="resultDiv"></div>
      </div>
      <div class="intel-modal-footer">by Konduyt.dev</div>
    </div>
  </div>

  <script>
    var AMOUNT_MINOR = 500000; // Your cart -- the REFERENCE price; the
    // real, displayed currency/amount always come from the backend's own
    // response (payment.currency / payment.amount), never assumed here.
    var CURRENCY = 'KES'; // default only -- overwritten below with whatever the backend actually used
    var chosenProvider = null;

    // >>> konduyt-intelligence-methods (generated) >>>
    var KDU_STATE_LIVE = 'LIVE';
    var KDU_STATE_NOT_ON_KONDUYT = 'NOT_ON_KONDUYT';
    var KDU_NO_METHODS = 'No payment methods found for this country.';

    // Same method, written differently across the two arrays ("M-Pesa" vs
    // "MPESA", "Debit/Credit Cards" vs "DEBIT/CREDIT_CARDS"). Compare on a
    // normalized key so the overlay attaches to the right catalogue entry.
    function kduMethodKey(label) {
      return String(label == null ? '' : label).toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // The join key for one array entry. Prefer the API's stable method_id: it is
    // the same string in both arrays for the same method, so the overlay cannot
    // miss because a label was spelled or punctuated differently. The normalized
    // label remains the fallback for older responses that carry no method_id.
    function kduEntryKey(entry, fallback) {
      var id = entry && entry.method_id;
      return id ? ('id:' + id) : fallback;
    }

    function kduIsExecutable(m) {
      return !!(m && m.onKonduyt);
    }

    // Merge into one canonical entry per payment method.
    //
    // local_methods is the base because it is the complete country catalogue.
    // options overlays it: a method Konduyt can execute carries its routed
    // provider and price; one it cannot keeps the market figure and says so.
    // Options that match no catalogue entry are still appended -- they are real
    // ranked methods and dropping them would hide an executable route.
    function kduMergeIntelligenceMethods(intelligence, opts) {
      intelligence = intelligence || {};
      opts = opts || {};
      var locals = intelligence.local_methods || [];
      var options = intelligence.options || [];

      var byKey = {};
      var merged = [];
      var i, key;

      for (i = 0; i < locals.length; i++) {
        var m = locals[i] || {};
        key = kduEntryKey(m, kduMethodKey(m.label));
        if (!key || byKey[key]) continue;
        var entry = {
          key: key,
          methodId: m.method_id || null,
          label: m.label,
          method: (opts.methodFromLabel && opts.methodFromLabel[m.label]) || null,
          methodType: m.method_type || null,
          provider: m.provider || null,
          onKonduyt: m.on_konduyt === true,
          feeMinor: m.fee_minor,
          feeSource: m.fee_source || null,
          // The currency the fee is denominated in, straight from the API. A local
          // method's fee is priced in ITS country's currency, which is not always
          // this checkout's transaction currency.
          feeCurrency: m.fee_currency || null,
          feeKind: m.fee_kind || null,
          feePercent: null,
          estimated: m.is_estimated === true,
          feeLow: null,
          feeHigh: null,
          source: m.source || null,
          recommended: false,
          option: null,
        };
        entry.executable = kduIsExecutable(entry);
        entry.state = entry.executable ? KDU_STATE_LIVE : KDU_STATE_NOT_ON_KONDUYT;
        byKey[key] = entry;
        merged.push(entry);
      }

      for (i = 0; i < options.length; i++) {
        var o = options[i] || {};
        key = kduEntryKey(o, kduMethodKey(o.label));
        var target = key ? byKey[key] : null;
        if (!target) {
          // A ranked method the country catalogue doesn't list. Keep it: it
          // exists in this response, so hiding it would lose a real route.
          target = {
            key: key || ('opt:' + i),
            methodId: o.method_id || null,
            label: o.label,
            method: o.method || null,
            methodType: null,
            provider: null,
            onKonduyt: false,
            feeMinor: null,
            feeSource: null,
            feeCurrency: null,
            feeKind: null,
            feePercent: null,
            estimated: false,
            feeLow: null,
            feeHigh: null,
            source: null,
            recommended: false,
            option: null,
          };
          if (key) byKey[key] = target;
          merged.push(target);
        }
        if (o.method) target.method = o.method;
        if (o.provider) target.provider = o.provider;
        target.onKonduyt = o.on_konduyt === true;
        target.executable = kduIsExecutable(target);
        target.state = target.executable ? KDU_STATE_LIVE : KDU_STATE_NOT_ON_KONDUYT;
        // The option's own price wins when it has one: it is the routed,
        // fee-source-labelled figure. Only fall back to the catalogue price when
        // the option carries none, and never turn "unknown" into zero.
        if (o.fee_minor != null) {
          target.feeMinor = o.fee_minor;
          target.feeSource = o.fee_source || (target.executable ? 'konduyt' : 'market');
          target.feePercent = o.fee_percent_effective != null ? o.fee_percent_effective : null;
          if (o.fee_currency) target.feeCurrency = o.fee_currency;
          if (o.fee_kind) target.feeKind = o.fee_kind;
        }
        if (o.estimated != null) target.estimated = o.estimated === true;
        if (o.fee_minor_low != null) target.feeLow = o.fee_minor_low;
        if (o.fee_minor_high != null) target.feeHigh = o.fee_minor_high;
        if (o.source) target.source = o.source;
        target.recommended = o.recommended === true;
        target.option = o;
      }

      for (i = 0; i < merged.length; i++) {
        merged[i].executable = kduIsExecutable(merged[i]);
        merged[i].state = merged[i].executable ? KDU_STATE_LIVE : KDU_STATE_NOT_ON_KONDUYT;
      }
      return merged;
    }

    // Cheapest first, unknown prices last. "value" reads the price to sort on,
    // so the same comparator serves both groups.
    function kduSortByCost(list, value) {
      return list.slice().sort(function (a, b) {
        var av = value(a), bv = value(b);
        var ae = av == null, be = bv == null;
        if (ae !== be) return ae ? 1 : -1;
        if (!ae && av !== bv) return av - bv;
        return 0;
      });
    }

    function kduFeeOf(m) {
      return m ? m.feeMinor : null;
    }

    // Executable methods are ranked among themselves. Unsupported methods are
    // never mixed into that ranking -- a market fee the merchant cannot charge
    // must not outrank a route they can.
    function kduRankExecutableMethods(methods) {
      var out = [];
      for (var i = 0; i < methods.length; i++) {
        if (kduIsExecutable(methods[i])) out.push(methods[i]);
      }
      return kduSortByCost(out, kduFeeOf);
    }

    function kduRankUnsupportedMethods(methods) {
      var out = [];
      for (var i = 0; i < methods.length; i++) {
        if (!kduIsExecutable(methods[i])) out.push(methods[i]);
      }
      return kduSortByCost(out, kduFeeOf);
    }

    // Best value means the cheapest route the merchant can actually charge --
    // never the cheapest method in the country's whole market. The API's own
    // "recommended" flag is used when present; otherwise the cheapest priced
    // executable method. Unsupported methods are never eligible.
    function kduBestValueMethod(methods) {
      var exec = kduRankExecutableMethods(methods);
      if (!exec.length) return null;
      for (var i = 0; i < exec.length; i++) {
        if (exec[i].recommended && exec[i].feeMinor != null) return exec[i];
      }
      for (var j = 0; j < exec.length; j++) {
        if (exec[j].feeMinor != null) return exec[j];
      }
      return null;
    }

    // Full display order: executable first (ranked), unsupported after. The two
    // groups stay distinct so the UI can make the difference obvious, and it
    // never claims a country has no methods while its catalogue is populated.
    function kduOrderedMethods(methods) {
      return kduRankExecutableMethods(methods).concat(kduRankUnsupportedMethods(methods));
    }

    // Empty only when BOTH arrays are empty. "Nothing ranked" is not "nothing
    // exists" -- a country full of local methods Konduyt can't route yet has
    // plenty to show, and saying otherwise is the bug this file fixes.
    function kduHasAnyMethod(methods) {
      return !!(methods && methods.length);
    }

    function kduEmptyStateMessage(methods) {
      return kduHasAnyMethod(methods) ? '' : KDU_NO_METHODS;
    }

    function kduFeeLabel(m) {
      if (!m || m.feeMinor == null) return null;
      return m.feeSource === 'konduyt' ? 'fee' : 'Market fee';
    }
    // <<< konduyt-intelligence-methods (generated) <<<

    var mergeIntelligenceMethods = kduMergeIntelligenceMethods;
    var orderMethods = kduOrderedMethods;
    var bestValueMethod = kduBestValueMethod;
    var emptyStateMessage = kduEmptyStateMessage;

    // The phone number (with its real country code) has to be filled in
    // before Pay is even clickable -- Konduyt needs it to know which
    // country's real rail catalogue to rank against.
    var countryCodeEl = document.getElementById('countryCode');
    var phoneInputEl = document.getElementById('phoneInput');
    var payButtonEl = document.getElementById('payButton');

    // Required national-number length per country, so Pay enables only once
    // the number is the right length for the country selected -- not merely
    // "long enough". These are the same real lengths the backend's own
    // carrier detection uses (app/routing/carrier_detection.py). A country
    // absent from this table falls back to a generic E.164 band rather than
    // a guessed per-country length.
    var NATIONAL_LENGTHS = { KE: 9, TZ: 9, GH: 9, UG: 9, RW: 9, ZM: 9, CI: 10, SN: 9, CM: 9 };
    var FALLBACK_MIN_DIGITS = 6;
    var MAX_DIGITS = 15; // E.164 maximum

    var phoneHintEl = document.getElementById('phoneHint');

    function digitsOnly(v) { return (v || '').replace(/\\D/g, ''); }

    function expectedDigits() {
      var iso = countryCodeEl.selectedOptions[0].getAttribute('data-iso');
      return NATIONAL_LENGTHS[iso] || null;
    }

    function updatePayButtonState() {
      // Strip anything that isn't a digit, so a letter can never be typed
      // or pasted into the field.
      var expected = expectedDigits();
      phoneInputEl.maxLength = expected || MAX_DIGITS;

      // Strip non-digits, then cap to the length this country allows.
      // maxlength alone only constrains user typing/pasting, so the cap is
      // applied here too and held in one place.
      var digits = digitsOnly(phoneInputEl.value).slice(0, expected || MAX_DIGITS);
      if (digits !== phoneInputEl.value) phoneInputEl.value = digits;

      var ok = expected ? digits.length === expected
                        : (digits.length >= FALLBACK_MIN_DIGITS && digits.length <= MAX_DIGITS);
      payButtonEl.disabled = !ok;

      if (!digits.length || ok) {
        phoneHintEl.style.display = 'none';
      } else {
        phoneHintEl.style.display = 'block';
        phoneHintEl.textContent = expected
          ? 'Enter all ' + expected + ' digits of your number (' + digits.length + ' so far).'
          : 'Enter at least ' + FALLBACK_MIN_DIGITS + ' digits.';
      }
    }
    phoneInputEl.addEventListener('input', updatePayButtonState);
    // Changing country changes the required length, so re-check.
    countryCodeEl.addEventListener('change', updatePayButtonState);
    updatePayButtonState();

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

          // The real, converted reference price -- e.g. Your cart
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
            repNote.textContent = 'Estimate based on Kenya connected-provider rates, converted to ' + CURRENCY + '.';

            repNote.style.display = 'block';
          } else {
            repNote.style.display = 'none';
          }

          // The country's OWN catalogue is the list of ways to pay here --
          // including methods Konduyt cannot execute yet. The ranked
          // options are layered on top of it, not used instead of it;
          // reading only "options" is what made every unintegrated country
          // look like it had no payment methods at all.
          renderMethods(mergeIntelligenceMethods(data.intelligence || {}));
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

    function renderMethods(methods) {
      var ordered = orderMethods(methods);
      var best = bestValueMethod(methods);
      var rows = '';
      for (var i = 0; i < ordered.length; i++) {
        var m = ordered[i];
        var isBest = best != null && m.key === best.key;
        // Only a method Konduyt can actually charge gets a Pay action. An
        // unsupported one is real and worth showing, but it is not payable,
        // so it is never clickable -- offering a button that cannot work
        // would be the dishonest half of the bug this fixes.
        var action = m.executable
          ? '<button type="button" class="rail-pay" data-key="' + m.key + '">Pay</button>'
          : '<span class="rail-unsupported">NOT ON KONDUYT YET</span>';
        var fee;
        if (m.estimated && m.feeLow != null && m.feeHigh != null) {
          fee = fmt(m.feeLow, m.feeCurrency) + '\u2013' + fmt(m.feeHigh, m.feeCurrency);
        } else if (m.feeMinor != null) {
          fee = fmt(m.feeMinor, m.feeCurrency);
        } else {
          fee = '\u2014';
        }
        var feeNote = '';
        if (m.feeMinor != null && m.feeSource !== 'konduyt') {
          feeNote = '<span class="rail-fee-note">Market fee</span>';
        }
        // "estimated" describes the FEE, never the payment method, so it
        // belongs on the fee and not next to the name. A method's name is
        // its name -- qualifying it reads as though the method itself were
        // somehow provisional.
        var estNote = m.estimated ? '<span class="rail-fee-note">estimated</span>' : '';
        rows += '<tr class="rail' + (m.executable ? ' rail-executable' : ' rail-unsupported') + (isBest ? ' best' : '') + '" data-key="' + m.key + '">' +
          '<td><span class="rail-name">' + m.label + '</span>' +
          (isBest ? '<span class="badge">Best value</span>' : '') + '</td>' +
          '<td class="rail-fee">' + fee + estNote + feeNote + '</td>' +
          '<td class="rail-action">' + action + '</td></tr>';
      }

      // Nothing at all here means the country genuinely has no catalogue --
      // never the message shown while real local methods exist.
      document.getElementById('railRows').innerHTML = rows ||
        '<tr><td colspan="3">' + emptyStateMessage(methods) + '</td></tr>';

      var buttons = document.querySelectorAll('#railRows button.rail-pay');
      for (var j = 0; j < buttons.length; j++) {
        buttons[j].addEventListener('click', function (e) {
          e.stopPropagation();
          var key = this.getAttribute('data-key');
          var picked = null;
          for (var k = 0; k < ordered.length; k++) {
            if (ordered[k].key === key) { picked = ordered[k]; break; }
          }
          if (!picked || !picked.executable) return;
          chosenProvider = picked.method || picked.provider;
          document.getElementById('chosenRail').textContent = picked.label;
          document.getElementById('checkout').classList.add('open');
        });
      }
    }

    // Format a fee in the currency the FEE is actually in. cur is the API's
    // fee_currency; only when it is absent do we fall back to the page's
    // transaction currency. Labelling a fee with a currency it is not in is a
    // price lie, not a rounding detail.
    function fmt(minor, cur) {
      var c = cur || CURRENCY;
      try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(minor / 100); }
      catch (e) { return c + ' ' + (minor / 100).toFixed(2); }
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

      fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: AMOUNT_MINOR, email: email, phone: phone, provider: chosenProvider })
      })
        .then(function (r) { return r.json(); })
        .then(function (payment) {
          resultDiv.textContent = JSON.stringify(payment);
        })
        .catch(function () {
          resultDiv.textContent = 'Could not reach the server that served this page.';
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Confirm — Pay';
        });
    });
  </script>
</body>
</html>`;
