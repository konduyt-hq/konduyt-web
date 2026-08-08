// Code snippets for creating a payment through Konduyt, per language.
// Each snippet hits POST /v1/payments with the project's secret key as a Bearer
// token. Platform languages (Java/Kotlin -> Android, Swift -> iOS) include a
// "dependency" block (what to add to the build file) separate from the
// "implementation" block (the actual code). {{SECRET}} and {{API}} are replaced
// at render time with the developer's real test key and API base URL.

export const LANG_SNIPPETS = [
  {
    id: 'curl', label: 'cURL', mono: 'sh',
    sections: [
      { title: 'Request', lang: 'bash', code:
`curl -X POST {{API}}/v1/payments \\
  -H "Authorization: Bearer {{SECRET}}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 1000,
    "currency": "KES",
    "method": "mpesa",
    "customer": { "email": "customer@example.com" }
  }'` },
    ],
  },
  {
    id: 'js', label: 'JavaScript', mono: 'js',
    sections: [
      { title: 'Implementation', lang: 'javascript', code:
`// Runs server-side (Node). Never expose the secret key in the browser.
const res = await fetch("{{API}}/v1/payments", {
  method: "POST",
  headers: {
    "Authorization": "Bearer {{SECRET}}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 1000,
    currency: "KES",
    method: "mpesa",
    customer: { email: "customer@example.com" },
  }),
});

const payment = await res.json();
// Redirect the customer to the provider's hosted checkout:
// window.location.href = payment.authorization_url;` },
    ],
  },
  {
    id: 'python', label: 'Python', mono: 'py',
    sections: [
      { title: 'Dependency', lang: 'bash', code: `pip install requests` },
      { title: 'Implementation', lang: 'python', code:
`import requests

res = requests.post(
    "{{API}}/v1/payments",
    headers={"Authorization": "Bearer {{SECRET}}"},
    json={
        "amount": 1000,
        "currency": "KES",
        "method": "mpesa",
        "customer": {"email": "customer@example.com"},
    },
)

payment = res.json()
# Send the customer to payment["authorization_url"]` },
    ],
  },
  {
    id: 'php', label: 'PHP', mono: 'php',
    sections: [
      { title: 'Implementation', lang: 'php', code:
`<?php
$ch = curl_init("{{API}}/v1/payments");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer {{SECRET}}",
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "amount" => 1000,
        "currency" => "KES",
        "method" => "mpesa",
        "customer" => ["email" => "customer@example.com"],
    ]),
]);

$payment = json_decode(curl_exec($ch), true);
curl_close($ch);
// Redirect to $payment["authorization_url"]` },
    ],
  },
  {
    id: 'go', label: 'Go', mono: 'go',
    sections: [
      { title: 'Implementation', lang: 'go', code:
`package main

import (
	"bytes"
	"encoding/json"
	"net/http"
)

func createPayment() (map[string]any, error) {
	body, _ := json.Marshal(map[string]any{
		"amount":   1000,
		"currency": "KES",
		"method":   "mpesa",
		"customer": map[string]string{"email": "customer@example.com"},
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
    id: 'ruby', label: 'Ruby', mono: 'rb',
    sections: [
      { title: 'Implementation', lang: 'ruby', code:
`require "net/http"
require "json"
require "uri"

uri = URI("{{API}}/v1/payments")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

req = Net::HTTP::Post.new(uri)
req["Authorization"] = "Bearer {{SECRET}}"
req["Content-Type"] = "application/json"
req.body = {
  amount: 1000,
  currency: "KES",
  method: "mpesa",
  customer: { email: "customer@example.com" },
}.to_json

payment = JSON.parse(http.request(req).body)
# Redirect to payment["authorization_url"]` },
    ],
  },
  {
    id: 'rust', label: 'Rust', mono: 'rs',
    sections: [
      { title: 'Dependency (Cargo.toml)', lang: 'toml', code:
`[dependencies]
reqwest = { version = "0.12", features = ["json", "blocking"] }
serde_json = "1"` },
      { title: 'Implementation', lang: 'rust', code:
`use serde_json::json;

fn create_payment() -> Result<serde_json::Value, reqwest::Error> {
    let client = reqwest::blocking::Client::new();
    let payment = client
        .post("{{API}}/v1/payments")
        .bearer_auth("{{SECRET}}")
        .json(&json!({
            "amount": 1000,
            "currency": "KES",
            "method": "mpesa",
            "customer": { "email": "customer@example.com" }
        }))
        .send()?
        .json()?;
    Ok(payment)
}` },
    ],
  },
  {
    id: 'csharp', label: 'C#', mono: 'cs',
    sections: [
      { title: 'Implementation', lang: 'csharp', code:
`using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", "{{SECRET}}");

var body = new StringContent(JsonSerializer.Serialize(new {
    amount = 1000,
    currency = "KES",
    method = "mpesa",
    customer = new { email = "customer@example.com" }
}), Encoding.UTF8, "application/json");

var res = await client.PostAsync("{{API}}/v1/payments", body);
var payment = await res.Content.ReadAsStringAsync();
// Parse and redirect to authorization_url` },
    ],
  },
  {
    id: 'java', label: 'Java (Android)', mono: 'java', platform: 'Android',
    sections: [
      { title: 'Dependency (app/build.gradle)', lang: 'groovy', code:
`dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}

// AndroidManifest.xml — allow internet
// <uses-permission android:name="android.permission.INTERNET" />`},
      { title: 'Implementation', lang: 'java', code:
`// Run off the main thread. The secret key belongs on YOUR server —
// for production, call your backend, not Konduyt directly from the app.
OkHttpClient client = new OkHttpClient();

String json = "{"
    + "\\"amount\\": 1000,"
    + "\\"currency\\": \\"KES\\","
    + "\\"method\\": \\"mpesa\\","
    + "\\"customer\\": { \\"email\\": \\"customer@example.com\\" }"
    + "}";

Request request = new Request.Builder()
    .url("{{API}}/v1/payments")
    .addHeader("Authorization", "Bearer {{SECRET}}")
    .post(RequestBody.create(json, MediaType.parse("application/json")))
    .build();

try (Response response = client.newCall(request).execute()) {
    String payment = response.body().string();
    // Parse payment, open authorization_url in a Custom Tab
}` },
    ],
  },
  {
    id: 'kotlin', label: 'Kotlin (Android)', mono: 'kt', platform: 'Android',
    sections: [
      { title: 'Dependency (app/build.gradle.kts)', lang: 'kotlin', code:
`dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}

// AndroidManifest.xml
// <uses-permission android:name="android.permission.INTERNET" />` },
      { title: 'Implementation', lang: 'kotlin', code:
`// Call from a coroutine (Dispatchers.IO). In production, route through your
// own backend so the secret key never ships inside the app.
val client = OkHttpClient()

val json = """
    { "amount": 1000, "currency": "KES", "method": "mpesa",
      "customer": { "email": "customer@example.com" } }
""".trimIndent()

val request = Request.Builder()
    .url("{{API}}/v1/payments")
    .addHeader("Authorization", "Bearer {{SECRET}}")
    .post(json.toRequestBody("application/json".toMediaType()))
    .build()

client.newCall(request).execute().use { response ->
    val payment = response.body?.string()
    // Parse payment, open authorization_url in a Chrome Custom Tab
}` },
    ],
  },
  {
    id: 'swift', label: 'Swift (iOS)', mono: 'swift', platform: 'iOS',
    sections: [
      { title: 'Dependency', lang: 'text', code:
`No external dependency needed — URLSession is built into iOS.
(For production, call your own backend so the secret key stays off-device.)` },
      { title: 'Implementation', lang: 'swift', code:
`var request = URLRequest(url: URL(string: "{{API}}/v1/payments")!)
request.httpMethod = "POST"
request.setValue("Bearer {{SECRET}}", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

let body: [String: Any] = [
    "amount": 1000,
    "currency": "KES",
    "method": "mpesa",
    "customer": ["email": "customer@example.com"]
]
request.httpBody = try JSONSerialization.data(withJSONObject: body)

let (data, _) = try await URLSession.shared.data(for: request)
let payment = try JSONSerialization.jsonObject(with: data)
// Open authorization_url in an ASWebAuthenticationSession / SFSafariViewController` },
    ],
  },
  {
    id: 'cpp', label: 'C++', mono: 'cpp',
    sections: [
      { title: 'Dependency', lang: 'bash', code:
`# Using libcurl (install via your package manager)
sudo apt-get install libcurl4-openssl-dev   # Debian/Ubuntu` },
      { title: 'Implementation', lang: 'cpp', code:
`#include <curl/curl.h>
#include <string>

void create_payment() {
    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string body = R"({
        "amount": 1000, "currency": "KES", "method": "mpesa",
        "customer": { "email": "customer@example.com" }
    })";

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
