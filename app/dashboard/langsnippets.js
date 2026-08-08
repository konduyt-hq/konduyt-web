// Code snippets for creating a payment through Konduyt, per language.
//
// SHOW, DON'T TELL: each snippet reads the secret key from an ENVIRONMENT
// VARIABLE (KONDUYT_SECRET_KEY) the way that language does it — never pasted
// inline — so the developer sees exactly where the key belongs and how it's
// used. The amount is a parameter (from user input / the clicked item), not
// hardcoded. Platform languages (Android/iOS) show a Dependency block separate
// from Implementation. {{API}} is replaced at render time with the API base URL.
// (The secret is intentionally NOT injected — it comes from the env var.)

export const LANG_SNIPPETS = [
  {
    id: 'curl', label: 'cURL', icon: 'curl',
    sections: [
      { title: 'Set your key (shell)', code:
`# Keep the key in your environment, not in the command history/script.
export KONDUYT_SECRET_KEY="kdu_live_sk_your_key_here"` },
      { title: 'Request', code:
`# amount comes from your app (a donation input, or the clicked item's price)
AMOUNT=1000

curl -X POST {{API}}/v1/payments \\
  -H "Authorization: Bearer $KONDUYT_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"amount\\": $AMOUNT,
    \\"currency\\": \\"KES\\",
    \\"method\\": \\"mpesa\\",
    \\"customer\\": { \\"email\\": \\"customer@example.com\\" }
  }"` },
    ],
  },
  {
    id: 'js', label: 'JavaScript', icon: 'js',
    sections: [
      { title: 'Set your key (.env)', code:
`# .env  — never commit this file
KONDUYT_SECRET_KEY=kdu_live_sk_your_key_here` },
      { title: 'Implementation', code:
`// Runs server-side (Node). The key is read from the environment — never
// hardcoded, never sent to the browser.
const KONDUYT_SECRET_KEY = process.env.KONDUYT_SECRET_KEY;

async function createPayment({ amount, email, method = "mpesa" }) {
  const res = await fetch("{{API}}/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${KONDUYT_SECRET_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "KES", method, customer: { email } }),
  });
  return res.json();
}

// amount from your app — a donation form, or the clicked item:
const amount = Number(req.body.amount);        // user input
// const amount = selectedItem.price;          // marketplace item
const payment = await createPayment({ amount, email: req.body.email });
// res.redirect(payment.authorization_url);` },
    ],
  },
  {
    id: 'python', label: 'Python', icon: 'python',
    sections: [
      { title: 'Set your key (.env)', code:
`# .env  — never commit this file
KONDUYT_SECRET_KEY=kdu_live_sk_your_key_here` },
      { title: 'Dependency', code: `pip install requests` },
      { title: 'Implementation', code:
`import os
import requests

# Read the key from the environment — never hardcode it.
KONDUYT_SECRET_KEY = os.environ["KONDUYT_SECRET_KEY"]

def create_payment(amount, email, method="mpesa"):
    res = requests.post(
        "{{API}}/v1/payments",
        headers={"Authorization": f"Bearer {KONDUYT_SECRET_KEY}"},
        json={
            "amount": amount,
            "currency": "KES",
            "method": method,
            "customer": {"email": email},
        },
    )
    return res.json()

# amount from your app — a donation input, or the clicked item:
amount = int(request.form["amount"])       # user input
# amount = selected_item.price             # marketplace item
payment = create_payment(amount, request.form["email"])` },
    ],
  },
  {
    id: 'php', label: 'PHP', icon: 'php',
    sections: [
      { title: 'Set your key (.env)', code:
`# .env  — never commit this file
KONDUYT_SECRET_KEY=kdu_live_sk_your_key_here` },
      { title: 'Implementation', code:
`<?php
// Read the key from the environment — never hardcode it.
$secret = getenv("KONDUYT_SECRET_KEY");

function create_payment($secret, $amount, $email, $method = "mpesa") {
    $ch = curl_init("{{API}}/v1/payments");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $secret,
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            "amount" => $amount,
            "currency" => "KES",
            "method" => $method,
            "customer" => ["email" => $email],
        ]),
    ]);
    $payment = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $payment;
}

// amount from a donation form, or the clicked item's price:
$amount = (int) $_POST["amount"];          // user input
// $amount = $selectedItem["price"];       // marketplace item
$payment = create_payment($secret, $amount, $_POST["email"]);` },
    ],
  },
  {
    id: 'go', label: 'Go', icon: 'go',
    sections: [
      { title: 'Set your key (shell)', code:
`export KONDUYT_SECRET_KEY="kdu_live_sk_your_key_here"` },
      { title: 'Implementation', code:
`package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"os"
)

// Read the key from the environment — never hardcode it.
var konduytSecret = os.Getenv("KONDUYT_SECRET_KEY")

func createPayment(amount int, email string) (map[string]any, error) {
	body, _ := json.Marshal(map[string]any{
		"amount":   amount,
		"currency": "KES",
		"method":   "mpesa",
		"customer": map[string]string{"email": email},
	})

	req, _ := http.NewRequest("POST", "{{API}}/v1/payments", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+konduytSecret)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var payment map[string]any
	json.NewDecoder(res.Body).Decode(&payment)
	return payment, nil
}` },
    ],
  },
  {
    id: 'ruby', label: 'Ruby', icon: 'ruby',
    sections: [
      { title: 'Set your key (.env)', code:
`# .env  — never commit this file
KONDUYT_SECRET_KEY=kdu_live_sk_your_key_here` },
      { title: 'Implementation', code:
`require "net/http"
require "json"
require "uri"

# Read the key from the environment — never hardcode it.
KONDUYT_SECRET_KEY = ENV.fetch("KONDUYT_SECRET_KEY")

def create_payment(amount, email, method: "mpesa")
  uri = URI("{{API}}/v1/payments")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer #{KONDUYT_SECRET_KEY}"
  req["Content-Type"] = "application/json"
  req.body = {
    amount: amount, currency: "KES", method: method,
    customer: { email: email },
  }.to_json

  JSON.parse(http.request(req).body)
end

# amount from params — a donation input, or the clicked item:
payment = create_payment(params[:amount].to_i, params[:email])` },
    ],
  },
  {
    id: 'rust', label: 'Rust', icon: 'rust',
    sections: [
      { title: 'Set your key (shell)', code:
`export KONDUYT_SECRET_KEY="kdu_live_sk_your_key_here"` },
      { title: 'Dependency (Cargo.toml)', code:
`[dependencies]
reqwest = { version = "0.12", features = ["json", "blocking"] }
serde_json = "1"` },
      { title: 'Implementation', code:
`use serde_json::json;
use std::env;

fn create_payment(amount: u64, email: &str) -> Result<serde_json::Value, reqwest::Error> {
    // Read the key from the environment — never hardcode it.
    let secret = env::var("KONDUYT_SECRET_KEY").expect("KONDUYT_SECRET_KEY not set");
    let client = reqwest::blocking::Client::new();
    client
        .post("{{API}}/v1/payments")
        .bearer_auth(secret)
        .json(&json!({
            "amount": amount,
            "currency": "KES",
            "method": "mpesa",
            "customer": { "email": email }
        }))
        .send()?
        .json()
}` },
    ],
  },
  {
    id: 'csharp', label: 'C#', icon: 'csharp',
    sections: [
      { title: 'Set your key (shell)', code:
`setx KONDUYT_SECRET_KEY "kdu_live_sk_your_key_here"   # Windows
# export KONDUYT_SECRET_KEY="kdu_live_sk_your_key_here" # macOS/Linux` },
      { title: 'Implementation', code:
`using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

// Read the key from the environment — never hardcode it.
string secret = Environment.GetEnvironmentVariable("KONDUYT_SECRET_KEY");

async Task<string> CreatePayment(int amount, string email, string method = "mpesa") {
    var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", secret);

    var body = new StringContent(JsonSerializer.Serialize(new {
        amount, currency = "KES", method, customer = new { email }
    }), Encoding.UTF8, "application/json");

    var res = await client.PostAsync("{{API}}/v1/payments", body);
    return await res.Content.ReadAsStringAsync();
}` },
    ],
  },
  {
    id: 'java', label: 'Java', icon: 'java', platform: 'Android',
    sections: [
      { title: 'Dependency (app/build.gradle)', code:
`dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}

// AndroidManifest.xml — allow internet
// <uses-permission android:name="android.permission.INTERNET" />` },
      { title: 'Set your key (do NOT ship it in the app)', code:
`// The secret key must live on YOUR server, not inside the Android app —
// anything shipped in the APK can be extracted. Your app should call your
// backend, which holds KONDUYT_SECRET_KEY and calls Konduyt. If you must read
// a value on-device, inject it at build time via BuildConfig, never commit it:
//
// app/build.gradle:
//   buildConfigField "String", "KONDUYT_SECRET_KEY", "\\"\${System.getenv('KONDUYT_SECRET_KEY')}\\""` },
      { title: 'Implementation (server-style call)', code:
`// amount is a parameter — pass the value from an input or the tapped item.
void createPayment(int amount, String email) throws IOException {
    String secret = BuildConfig.KONDUYT_SECRET_KEY; // injected at build, not hardcoded
    OkHttpClient client = new OkHttpClient();

    String json = "{"
        + "\\"amount\\": " + amount + ","
        + "\\"currency\\": \\"KES\\","
        + "\\"method\\": \\"mpesa\\","
        + "\\"customer\\": { \\"email\\": \\"" + email + "\\" }"
        + "}";

    Request request = new Request.Builder()
        .url("{{API}}/v1/payments")
        .addHeader("Authorization", "Bearer " + secret)
        .post(RequestBody.create(json, MediaType.parse("application/json")))
        .build();

    try (Response response = client.newCall(request).execute()) {
        String payment = response.body().string();
        // open authorization_url in a Chrome Custom Tab
    }
}

// e.g. createPayment(Integer.parseInt(amountInput.getText().toString()), email);
//      createPayment(selectedProduct.getPrice(), email);` },
    ],
  },
  {
    id: 'kotlin', label: 'Kotlin', icon: 'kotlin', platform: 'Android',
    sections: [
      { title: 'Dependency (app/build.gradle.kts)', code:
`dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}

// AndroidManifest.xml
// <uses-permission android:name="android.permission.INTERNET" />` },
      { title: 'Set your key (do NOT ship it in the app)', code:
`// The secret belongs on YOUR server, not in the APK (it can be extracted).
// Have the app call your backend, which holds KONDUYT_SECRET_KEY. If you must
// read it on-device, inject at build time, never commit:
//
// app/build.gradle.kts:
//   buildConfigField("String", "KONDUYT_SECRET_KEY", "\\"\${System.getenv("KONDUYT_SECRET_KEY")}\\"")` },
      { title: 'Implementation (server-style call)', code:
`// amount is a parameter — pass user input or the tapped item's price.
// Call from a coroutine (Dispatchers.IO).
fun createPayment(amount: Int, email: String) {
    val secret = BuildConfig.KONDUYT_SECRET_KEY  // injected at build, not hardcoded
    val client = OkHttpClient()

    val json = """
        { "amount": $amount, "currency": "KES", "method": "mpesa",
          "customer": { "email": "$email" } }
    """.trimIndent()

    val request = Request.Builder()
        .url("{{API}}/v1/payments")
        .addHeader("Authorization", "Bearer $secret")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    client.newCall(request).execute().use { response ->
        val payment = response.body?.string()
        // open authorization_url in a Chrome Custom Tab
    }
}

// e.g. createPayment(amountField.text.toString().toInt(), email)
//      createPayment(selectedProduct.price, email)` },
    ],
  },
  {
    id: 'swift', label: 'Swift', icon: 'swift', platform: 'iOS',
    sections: [
      { title: 'Set your key (do NOT ship it in the app)', code:
`// The secret belongs on YOUR server, not in the iOS binary (it can be
// extracted). Your app should call your backend, which holds
// KONDUYT_SECRET_KEY. If reading on-device for a prototype, use an xcconfig /
// Info.plist value injected at build time — never commit the real key.` },
      { title: 'Implementation (server-style call)', code:
`// amount is a parameter — pass user input or the tapped item's price.
func createPayment(amount: Int, email: String) async throws -> [String: Any] {
    // Read from Info.plist (injected at build) — not hardcoded.
    let secret = Bundle.main.object(forInfoDictionaryKey: "KONDUYT_SECRET_KEY") as! String

    var request = URLRequest(url: URL(string: "{{API}}/v1/payments")!)
    request.httpMethod = "POST"
    request.setValue("Bearer \\(secret)", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = [
        "amount": amount, "currency": "KES", "method": "mpesa",
        "customer": ["email": email]
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}

// e.g. try await createPayment(amount: Int(amountField.text!)!, email: email)
//      try await createPayment(amount: selectedItem.price, email: email)` },
    ],
  },
  {
    id: 'cpp', label: 'C++', icon: 'cpp',
    sections: [
      { title: 'Set your key (shell)', code:
`export KONDUYT_SECRET_KEY="kdu_live_sk_your_key_here"` },
      { title: 'Dependency', code:
`# Using libcurl (install via your package manager)
sudo apt-get install libcurl4-openssl-dev   # Debian/Ubuntu` },
      { title: 'Implementation', code:
`#include <curl/curl.h>
#include <cstdlib>
#include <string>

void create_payment(long amount, const std::string& email) {
    // Read the key from the environment — never hardcode it.
    const char* secret = std::getenv("KONDUYT_SECRET_KEY");
    if (!secret) return;

    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string body =
        "{\\"amount\\": " + std::to_string(amount) +
        ", \\"currency\\": \\"KES\\", \\"method\\": \\"mpesa\\","
        " \\"customer\\": { \\"email\\": \\"" + email + "\\" } }";

    std::string auth = "Authorization: Bearer " + std::string(secret);
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, auth.c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, "{{API}}/v1/payments");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}` },
    ],
  },
];
