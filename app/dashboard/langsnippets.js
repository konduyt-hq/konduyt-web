// Code snippets for creating a payment through Konduyt, per language.
//
// Each snippet is written the way a real integration works: the amount (and
// customer email) are PASSED IN as values — not hardcoded — so a donations app
// can pass a user-entered amount, or a marketplace can pass the price of the
// clicked item. Snippets show both the reusable function (a) and a line showing
// where the value comes from (b: user input / selected item).
//
// Platform languages (Java/Kotlin -> Android, Swift -> iOS) include a
// "dependency" block separate from the "implementation" block. {{SECRET}} and
// {{API}} are replaced at render time with the developer's real test key + URL.

export const LANG_SNIPPETS = [
  {
    id: 'curl', label: 'cURL', icon: 'terminal',
    sections: [
      { title: 'Request', code:
`# amount comes from your app (e.g. a donation input, or the clicked item's price)
AMOUNT=1000   # <- your value, in the smallest currency unit

curl -X POST {{API}}/v1/payments \\
  -H "Authorization: Bearer {{SECRET}}" \\
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
      { title: 'Implementation', code:
`// Reusable — pass in whatever amount your app produces.
// Runs server-side (Node). Never expose the secret key in the browser.
async function createPayment({ amount, email, method = "mpesa" }) {
  const res = await fetch("{{API}}/v1/payments", {
    method: "POST",
    headers: {
      "Authorization": "Bearer {{SECRET}}",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,                       // <- your value, not hardcoded
      currency: "KES",
      method,
      customer: { email },
    }),
  });
  return res.json();
}

// e.g. a donation form, or the price of the item the user clicked:
const amount = Number(req.body.amount);          // user input
// const amount = selectedItem.price;            // marketplace item
const payment = await createPayment({ amount, email: req.body.email });
// Redirect the customer: res.redirect(payment.authorization_url);` },
    ],
  },
  {
    id: 'python', label: 'Python', icon: 'python',
    sections: [
      { title: 'Dependency', code: `pip install requests` },
      { title: 'Implementation', code:
`import requests

def create_payment(amount, email, method="mpesa"):
    res = requests.post(
        "{{API}}/v1/payments",
        headers={"Authorization": "Bearer {{SECRET}}"},
        json={
            "amount": amount,            # <- your value, not hardcoded
            "currency": "KES",
            "method": method,
            "customer": {"email": email},
        },
    )
    return res.json()

# amount comes from your app — a donation input, or the clicked item:
amount = int(request.form["amount"])       # user input
# amount = selected_item.price             # marketplace item
payment = create_payment(amount, request.form["email"])
# Redirect the customer to payment["authorization_url"]` },
    ],
  },
  {
    id: 'php', label: 'PHP', icon: 'php',
    sections: [
      { title: 'Implementation', code:
`<?php
function create_payment($amount, $email, $method = "mpesa") {
    $ch = curl_init("{{API}}/v1/payments");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {{SECRET}}",
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            "amount" => $amount,           // <- your value, not hardcoded
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
$payment = create_payment($amount, $_POST["email"]);
// header("Location: " . $payment["authorization_url"]);` },
    ],
  },
  {
    id: 'go', label: 'Go', icon: 'go',
    sections: [
      { title: 'Implementation', code:
`package main

import (
	"bytes"
	"encoding/json"
	"net/http"
)

// amount is a parameter — pass your donation input or item price.
func createPayment(amount int, email string) (map[string]any, error) {
	body, _ := json.Marshal(map[string]any{
		"amount":   amount, // <- your value, not hardcoded
		"currency": "KES",
		"method":   "mpesa",
		"customer": map[string]string{"email": email},
	})

	req, _ := http.NewRequest("POST", "{{API}}/v1/payments", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer {{SECRET}}")
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
      { title: 'Implementation', code:
`require "net/http"
require "json"
require "uri"

def create_payment(amount, email, method: "mpesa")
  uri = URI("{{API}}/v1/payments")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer {{SECRET}}"
  req["Content-Type"] = "application/json"
  req.body = {
    amount: amount,          # <- your value, not hardcoded
    currency: "KES",
    method: method,
    customer: { email: email },
  }.to_json

  JSON.parse(http.request(req).body)
end

# amount from params — a donation input, or the clicked item:
payment = create_payment(params[:amount].to_i, params[:email])
# redirect_to payment["authorization_url"]` },
    ],
  },
  {
    id: 'rust', label: 'Rust', icon: 'rust',
    sections: [
      { title: 'Dependency (Cargo.toml)', code:
`[dependencies]
reqwest = { version = "0.12", features = ["json", "blocking"] }
serde_json = "1"` },
      { title: 'Implementation', code:
`use serde_json::json;

// amount is a parameter — pass user input or an item price.
fn create_payment(amount: u64, email: &str) -> Result<serde_json::Value, reqwest::Error> {
    let client = reqwest::blocking::Client::new();
    client
        .post("{{API}}/v1/payments")
        .bearer_auth("{{SECRET}}")
        .json(&json!({
            "amount": amount,          // <- your value, not hardcoded
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
      { title: 'Implementation', code:
`using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

// amount is a parameter — pass your donation input or item price.
async Task<string> CreatePayment(int amount, string email, string method = "mpesa") {
    var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", "{{SECRET}}");

    var body = new StringContent(JsonSerializer.Serialize(new {
        amount,                         // <- your value, not hardcoded
        currency = "KES",
        method,
        customer = new { email }
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
      { title: 'Implementation', code:
`// amount is a parameter — pass the value from an input or the tapped item.
// The secret key belongs on YOUR server; in production call your backend.
void createPayment(int amount, String email) throws IOException {
    OkHttpClient client = new OkHttpClient();

    String json = "{"
        + "\\"amount\\": " + amount + ","      // <- your value, not hardcoded
        + "\\"currency\\": \\"KES\\","
        + "\\"method\\": \\"mpesa\\","
        + "\\"customer\\": { \\"email\\": \\"" + email + "\\" }"
        + "}";

    Request request = new Request.Builder()
        .url("{{API}}/v1/payments")
        .addHeader("Authorization", "Bearer {{SECRET}}")
        .post(RequestBody.create(json, MediaType.parse("application/json")))
        .build();

    try (Response response = client.newCall(request).execute()) {
        String payment = response.body().string();
        // Parse payment, open authorization_url in a Chrome Custom Tab
    }
}

// e.g. amount typed by the user, or the price of the product tapped:
// createPayment(Integer.parseInt(amountInput.getText().toString()), email);
// createPayment(selectedProduct.getPrice(), email);` },
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
      { title: 'Implementation', code:
`// amount is a parameter — pass user input or the tapped item's price.
// Call from a coroutine (Dispatchers.IO). Route through your backend in prod.
fun createPayment(amount: Int, email: String) {
    val client = OkHttpClient()

    val json = """
        { "amount": $amount, "currency": "KES", "method": "mpesa",
          "customer": { "email": "$email" } }
    """.trimIndent()                       // amount = your value, not hardcoded

    val request = Request.Builder()
        .url("{{API}}/v1/payments")
        .addHeader("Authorization", "Bearer {{SECRET}}")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    client.newCall(request).execute().use { response ->
        val payment = response.body?.string()
        // Parse payment, open authorization_url in a Chrome Custom Tab
    }
}

// e.g. createPayment(amountField.text.toString().toInt(), email)
//      createPayment(selectedProduct.price, email)   // marketplace item` },
    ],
  },
  {
    id: 'swift', label: 'Swift', icon: 'swift', platform: 'iOS',
    sections: [
      { title: 'Dependency', code:
`// No external dependency — URLSession is built into iOS.
// In production, call your own backend so the secret key stays off-device.` },
      { title: 'Implementation', code:
`// amount is a parameter — pass user input or the tapped item's price.
func createPayment(amount: Int, email: String) async throws -> [String: Any] {
    var request = URLRequest(url: URL(string: "{{API}}/v1/payments")!)
    request.httpMethod = "POST"
    request.setValue("Bearer {{SECRET}}", forHTTPHeaderField: "Authorization")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = [
        "amount": amount,                  // <- your value, not hardcoded
        "currency": "KES",
        "method": "mpesa",
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
      { title: 'Dependency', code:
`# Using libcurl (install via your package manager)
sudo apt-get install libcurl4-openssl-dev   # Debian/Ubuntu` },
      { title: 'Implementation', code:
`#include <curl/curl.h>
#include <string>

// amount is a parameter — pass user input or an item price.
void create_payment(long amount, const std::string& email) {
    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string body =
        "{\\"amount\\": " + std::to_string(amount) +   // <- your value
        ", \\"currency\\": \\"KES\\", \\"method\\": \\"mpesa\\","
        " \\"customer\\": { \\"email\\": \\"" + email + "\\" } }";

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Authorization: Bearer {{SECRET}}");
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
