'use client';

import { useState } from 'react';
import { LANG_ICONS, LANG_BRAND } from './dashboard/langicons';
import { HOSTING_PLATFORMS } from './dashboard/hostingplatforms';
import { INTELLIGENCE_TESTING_SDK } from './dashboard/intelligencesdk';

// Landing language ids -> icon keys (only javascript differs from 'js').
const ICON_KEY = {
  curl: 'curl', javascript: 'js', python: 'python', php: 'php', go: 'go',
  ruby: 'ruby', rust: 'rust', csharp: 'csharp', java: 'java', kotlin: 'kotlin',
  swift: 'swift', cpp: 'cpp',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

// Universal TEST keys shown on the landing page. These are display placeholders
// for the quickstart — the real per-project keys come from the dashboard after
// sign-up. The "Run in test mode" button below uses the public demo endpoint,
// which needs no key, so nothing real is exposed.
const KEYS = {
  secret: 'kdu_test_secret_4f8Kd92MnQ7pXvR3sT6wY1bC5eH0jL8n',
  publishable: 'kdu_test_pub_9aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0u',
};

// Real integration snippets — genuine HTTP calls to the Konduyt test endpoint,
// matching the dashboard's Home tab exactly (curl, JavaScript, Python, PHP, Go).
// {{SECRET}} / {{API}} are filled at render time.
const LANGUAGES = [
  {
    id: 'curl', label: 'cURL', filename: 'request.sh',
    deps: 'No dependencies — cURL is built into macOS and Linux.',
    code: `curl -X POST {{API}}/v1/payments/test \\
  -H "Authorization: Bearer {{SECRET}}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 5000,
    "currency": "KES",
    "provider": "test",
    "customer": { "email": "customer@example.com" }
  }'`,
  },
  {
    id: 'javascript', label: 'JavaScript', filename: 'server.mjs',
    deps: 'Node 18+ (fetch and http are both built in). Run: node server.mjs -- then open intelligence.html next to it.',
    note: 'This is the BACKEND for the intelligence.html frontend from step 2 -- its "Buy now" button calls /api/create-payment, which this file serves. One real server, four real scenarios.',
    code: `// server.mjs  —  run with:  node server.mjs
import http from "node:http";

// SECRET KEY -- stays on the server, never sent to a browser. This is
// Konduyt's own universal demo key (safe here since it's already public),
// but a real key works exactly the same way -- see "Where does my secret
// key go?" above for where a real one belongs (never hardcoded like this).
const KONDUYT_SECRET_KEY = "{{SECRET}}";
const API = "{{API}}";

async function konduyt(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${KONDUYT_SECRET_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") { res.writeHead(404); res.end(); return; }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/api/create-payment") {
    // One-time: amount either comes from the shopper (a donation), or is a
    // fixed price you already know (a product) -- same field either way.
    const amount = body.amount;                 // whatever the shopper typed in, OR
    // const amount = 5000;                      // a fixed price you already know
    const payment = await konduyt("/v1/payments/test", {
      amount, currency: "KES", provider: "test",
    });
    res.end(JSON.stringify(payment));

  } else if (req.url === "/api/create-subscription") {
    // Recurring: a fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
    const session = await konduyt("/v1/payment_sessions", {
      amount: 100000, currency: "KES",
      recurring: true, interval: "monthly",
      reference: "sub_pro_plan",
    });
    res.end(JSON.stringify(session)); // { id: "sess_...", ... } -- open with Konduyt.checkout({ sessionId })

  } else if (req.url === "/api/create-split-payment") {
    // Split: one checkout, proceeds split across sellers using the
    // provider's own real split capability -- Konduyt never holds funds.
    const payment = await konduyt("/v1/marketplace_payments", {
      provider: "paystack", amount: 500000, currency: "KES",
      splits: [{ seller_id: "seller_123", amount: 400000 }],
    });
    res.end(JSON.stringify(payment)); // the remainder is your own commission

  } else if (req.url === "/api/create-usage-bill") {
    // Pay-as-you-go: amount computed from real usage, not typed in or fixed.
    const unitsUsed = 340, pricePerUnit = 25;
    const amount = unitsUsed * pricePerUnit;
    const session = await konduyt("/v1/payment_sessions", {
      amount, currency: "KES", recurring: false,
      reference: \`usage_\${Date.now()}\`,
    });
    res.end(JSON.stringify(session));

  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, () => console.log("Backend running on http://localhost:3000"));`,
  },
  {
    id: 'python', label: 'Python', filename: 'server.py',
    deps: 'Install: pip install flask requests   ·   Run: python server.py -- then open intelligence.html next to it.',
    note: 'This is the BACKEND for the intelligence.html frontend from step 2 -- its "Buy now" button calls /api/create-payment, which this file serves. One real server, four real scenarios.',
    code: `# server.py  —  pip install flask requests, then: python server.py
import time
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

# SECRET KEY -- stays on the server, never sent to a browser. This is
# Konduyt's own universal demo key (safe here since it's already public),
# but a real key works exactly the same way -- see "Where does my secret
# key go?" above for where a real one belongs (never hardcoded like this).
KONDUYT_SECRET_KEY = "{{SECRET}}"
API = "{{API}}"

def konduyt(path, body):
    res = requests.post(
        API + path,
        headers={"Authorization": f"Bearer {KONDUYT_SECRET_KEY}"},
        json=body,
    )
    return res.json()

@app.route("/api/create-payment", methods=["POST"])
def create_payment():
    # One-time: amount either comes from the shopper (a donation), or is a
    # fixed price you already know (a product) -- same field either way.
    amount = request.json.get("amount")   # whatever the shopper typed in, OR
    # amount = 5000                         # a fixed price you already know
    return jsonify(konduyt("/v1/payments/test", {
        "amount": amount, "currency": "KES", "provider": "test",
    }))

@app.route("/api/create-subscription", methods=["POST"])
def create_subscription():
    # Recurring: a fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
    return jsonify(konduyt("/v1/payment_sessions", {
        "amount": 100000, "currency": "KES",
        "recurring": True, "interval": "monthly",
        "reference": "sub_pro_plan",
    }))  # {"id": "sess_...", ...} -- open with Konduyt.checkout({ sessionId })

@app.route("/api/create-split-payment", methods=["POST"])
def create_split_payment():
    # Split: one checkout, proceeds split across sellers using the
    # provider's own real split capability -- Konduyt never holds funds.
    return jsonify(konduyt("/v1/marketplace_payments", {
        "provider": "paystack", "amount": 500000, "currency": "KES",
        "splits": [{"seller_id": "seller_123", "amount": 400000}],
    }))  # the remainder is your own commission

@app.route("/api/create-usage-bill", methods=["POST"])
def create_usage_bill():
    # Pay-as-you-go: amount computed from real usage, not typed in or fixed.
    units_used, price_per_unit = 340, 25
    amount = units_used * price_per_unit
    return jsonify(konduyt("/v1/payment_sessions", {
        "amount": amount, "currency": "KES", "recurring": False,
        "reference": f"usage_{int(time.time())}",
    }))

if __name__ == "__main__":
    app.run(port=3000)
    print("Backend running on http://localhost:3000")`,
  },
  {
    id: 'php', label: 'PHP', filename: 'index.php',
    deps: 'PHP 7.4+ with the curl extension (bundled by default). Run: php -S localhost:3000 -- then open intelligence.html next to it.',
    note: 'This is the BACKEND for the intelligence.html frontend from step 2 -- its "Buy now" button calls /api/create-payment, which this file serves. One real server (PHP\'s own built-in dev server), four real scenarios.',
    code: `<?php
// index.php  —  run with:  php -S localhost:3000

// SECRET KEY -- stays on the server, never sent to a browser. This is
// Konduyt's own universal demo key (safe here since it's already public),
// but a real key works exactly the same way -- see "Where does my secret
// key go?" above for where a real one belongs (never hardcoded like this).
$KONDUYT_SECRET_KEY = "{{SECRET}}";
$API = "{{API}}";

function konduyt($path, $body, $secret, $api) {
    $ch = curl_init($api . $path);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer " . $secret,
        "Content-Type: application/json",
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $result = curl_exec($ch);
    curl_close($ch);
    return $result;
}

$path = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);
header("Content-Type: application/json");

if ($path === "/api/create-payment") {
    // One-time: amount either comes from the shopper (a donation), or is a
    // fixed price you already know (a product) -- same field either way.
    $body = json_decode(file_get_contents("php://input"), true);
    $amount = $body["amount"];        // whatever the shopper typed in, OR
    // $amount = 5000;                 // a fixed price you already know
    echo konduyt("/v1/payments/test", [
        "amount" => $amount, "currency" => "KES", "provider" => "test",
    ], $KONDUYT_SECRET_KEY, $API);

} elseif ($path === "/api/create-subscription") {
    // Recurring: a fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
    echo konduyt("/v1/payment_sessions", [
        "amount" => 100000, "currency" => "KES",
        "recurring" => true, "interval" => "monthly",
        "reference" => "sub_pro_plan",
    ], $KONDUYT_SECRET_KEY, $API); // {"id": "sess_...", ...} -- open with Konduyt.checkout({ sessionId })

} elseif ($path === "/api/create-split-payment") {
    // Split: one checkout, proceeds split across sellers using the
    // provider's own real split capability -- Konduyt never holds funds.
    echo konduyt("/v1/marketplace_payments", [
        "provider" => "paystack", "amount" => 500000, "currency" => "KES",
        "splits" => [["seller_id" => "seller_123", "amount" => 400000]],
    ], $KONDUYT_SECRET_KEY, $API); // the remainder is your own commission

} elseif ($path === "/api/create-usage-bill") {
    // Pay-as-you-go: amount computed from real usage, not typed in or fixed.
    $unitsUsed = 340; $pricePerUnit = 25;
    $amount = $unitsUsed * $pricePerUnit;
    echo konduyt("/v1/payment_sessions", [
        "amount" => $amount, "currency" => "KES", "recurring" => false,
        "reference" => "usage_" . time(),
    ], $KONDUYT_SECRET_KEY, $API);

} else {
    http_response_code(404);
}`,
  },
  {
    id: 'go', label: 'Go', filename: 'main.go',
    deps: 'Standard library only. Run: go run main.go -- then open intelligence.html next to it.',
    note: 'This is the BACKEND for the intelligence.html frontend from step 2 -- its "Buy now" button calls /api/create-payment, which this file serves. One real server, four real scenarios.',
    code: `// main.go  —  run with:  go run main.go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// SECRET KEY -- stays on the server, never sent to a browser. This is
// Konduyt's own universal demo key (safe here since it's already public),
// but a real key works exactly the same way -- see "Where does my secret
// key go?" above for where a real one belongs (never hardcoded like this).
const konduytSecretKey = "{{SECRET}}"
const api = "{{API}}"

func konduyt(path string, body map[string]any) ([]byte, error) {
	buf, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", api+path, bytes.NewBuffer(buf))
	req.Header.Set("Authorization", "Bearer "+konduytSecretKey)
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	return io.ReadAll(res.Body)
}

func main() {
	http.HandleFunc("/api/create-payment", func(w http.ResponseWriter, r *http.Request) {
		// One-time: amount either comes from the shopper (a donation), or
		// is a fixed price you already know (a product) -- same field either way.
		var in struct{ Amount int }
		json.NewDecoder(r.Body).Decode(&in)
		amount := in.Amount // whatever the shopper typed in, OR
		// amount := 5000     // a fixed price you already know
		out, _ := konduyt("/v1/payments/test", map[string]any{
			"amount": amount, "currency": "KES", "provider": "test",
		})
		w.Write(out)
	})

	http.HandleFunc("/api/create-subscription", func(w http.ResponseWriter, r *http.Request) {
		// Recurring: a fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
		out, _ := konduyt("/v1/payment_sessions", map[string]any{
			"amount": 100000, "currency": "KES",
			"recurring": true, "interval": "monthly",
			"reference": "sub_pro_plan",
		})
		w.Write(out) // {"id": "sess_...", ...} -- open with Konduyt.checkout({ sessionId })
	})

	http.HandleFunc("/api/create-split-payment", func(w http.ResponseWriter, r *http.Request) {
		// Split: one checkout, proceeds split across sellers using the
		// provider's own real split capability -- Konduyt never holds funds.
		out, _ := konduyt("/v1/marketplace_payments", map[string]any{
			"provider": "paystack", "amount": 500000, "currency": "KES",
			"splits": []map[string]any{{"seller_id": "seller_123", "amount": 400000}},
		})
		w.Write(out) // the remainder is your own commission
	})

	http.HandleFunc("/api/create-usage-bill", func(w http.ResponseWriter, r *http.Request) {
		// Pay-as-you-go: amount computed from real usage, not typed in or fixed.
		unitsUsed, pricePerUnit := 340, 25
		amount := unitsUsed * pricePerUnit
		out, _ := konduyt("/v1/payment_sessions", map[string]any{
			"amount": amount, "currency": "KES", "recurring": false,
			"reference": fmt.Sprintf("usage_%d", time.Now().Unix()),
		})
		w.Write(out)
	})

	fmt.Println("Backend running on http://localhost:3000")
	http.ListenAndServe(":3000", nil)
}`,
  },
  {
    id: 'ruby', label: 'Ruby', filename: 'main.rb',
    deps: 'Standard library only (net/http). Run: ruby main.rb',
    code: `# main.rb  —  run with:  ruby main.rb
require "net/http"
require "json"
require "uri"

uri = URI("{{API}}/v1/payments/test")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

req = Net::HTTP::Post.new(uri)
req["Authorization"] = "Bearer {{SECRET}}"
req["Content-Type"] = "application/json"
req.body = {
  amount: 5000, currency: "KES", provider: "test",
  customer: { email: "customer@example.com" }
}.to_json

puts http.request(req).body`,
  },
  {
    id: 'rust', label: 'Rust', filename: 'main.rs',
    deps: 'Cargo.toml: reqwest = { version = "0.12", features = ["blocking","json"] }  ·  serde_json = "1"   —   Run: cargo run',
    code: `// src/main.rs  —  cargo add reqwest --features blocking,json && cargo add serde_json
use reqwest::blocking::Client;
use serde_json::json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let res = Client::new()
        .post("{{API}}/v1/payments/test")
        .bearer_auth("{{SECRET}}")
        .json(&json!({
            "amount": 5000,
            "currency": "KES",
            "provider": "test",
            "customer": { "email": "customer@example.com" }
        }))
        .send()?;

    println!("{}", res.text()?);
    Ok(())
}`,
  },
  {
    id: 'csharp', label: 'C#', filename: 'Program.cs',
    deps: '.NET 6+ (HttpClient is built in). Run: dotnet run',
    code: `// Program.cs  —  dotnet new console, paste, then: dotnet run
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;

using var client = new HttpClient();
client.DefaultRequestHeaders.Authorization =
    new AuthenticationHeaderValue("Bearer", "{{SECRET}}");

var body = new StringContent("""
{ "amount": 5000, "currency": "KES", "provider": "test",
  "customer": { "email": "customer@example.com" } }
""", Encoding.UTF8, "application/json");

var res = await client.PostAsync("{{API}}/v1/payments/test", body);
Console.WriteLine(await res.Content.ReadAsStringAsync());`,
  },
  {
    id: 'java', label: 'Java', filename: 'Main.java',
    deps: `dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}
// AndroidManifest.xml — allow internet
// <uses-permission android:name="android.permission.INTERNET" />`,
    note: 'For Android: this runs as-is on the JVM. On Android you must add the INTERNET permission in AndroidManifest.xml and make the call off the main thread (e.g. a coroutine or Executor) — a raw network call on the UI thread throws NetworkOnMainThreadException.',
    code: `// Main.java  —  uses OkHttp (add the dependency above)
import okhttp3.*;

public class Main {
    public static void main(String[] args) throws Exception {
        OkHttpClient client = new OkHttpClient();
        MediaType JSON = MediaType.get("application/json");
        String payload = "{ \\"amount\\": 5000, \\"currency\\": \\"KES\\", \\"provider\\": \\"test\\","
                       + "  \\"customer\\": { \\"email\\": \\"customer@example.com\\" } }";

        Request request = new Request.Builder()
            .url("{{API}}/v1/payments/test")
            .header("Authorization", "Bearer {{SECRET}}")
            .post(RequestBody.create(payload, JSON))
            .build();

        try (Response res = client.newCall(request).execute()) {
            System.out.println(res.body().string());
        }
    }
}`,
  },
  {
    id: 'kotlin', label: 'Kotlin', filename: 'Main.kt',
    deps: `dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
// AndroidManifest.xml
// <uses-permission android:name="android.permission.INTERNET" />`,
    note: 'On Android, call from a coroutine (Dispatchers.IO) — never the main thread.',
    code: `// Main.kt  —  uses OkHttp (add the dependency above)
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

fun main() {
    val client = OkHttpClient()
    val json = "application/json".toMediaType()
    val payload = """{ "amount": 5000, "currency": "KES", "provider": "test",
                       "customer": { "email": "customer@example.com" } }"""

    val request = Request.Builder()
        .url("{{API}}/v1/payments/test")
        .header("Authorization", "Bearer {{SECRET}}")
        .post(payload.toRequestBody(json))
        .build()

    client.newCall(request).execute().use { res ->
        println(res.body?.string())
    }
}`,
  },
  {
    id: 'swift', label: 'Swift', filename: 'main.swift',
    deps: 'Swift 5.5+ with Foundation. Run: swift main.swift',
    note: 'Uses async/await at top level (Swift 5.5+). In an app target, call this inside a Task { } rather than at file scope.',
    code: `// main.swift  —  swift main.swift
import Foundation

var request = URLRequest(url: URL(string: "{{API}}/v1/payments/test")!)
request.httpMethod = "POST"
request.setValue("Bearer {{SECRET}}", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = """
{ "amount": 5000, "currency": "KES", "provider": "test",
  "customer": { "email": "customer@example.com" } }
""".data(using: .utf8)

let (data, _) = try await URLSession.shared.data(for: request)
print(String(data: data, encoding: .utf8)!)`,
  },
  {
    id: 'cpp', label: 'C++', filename: 'main.cpp',
    deps: 'Needs libcurl. Install: apt install libcurl4-openssl-dev (Debian/Ubuntu) or brew install curl (macOS). Compile: g++ main.cpp -lcurl -o pay && ./pay',
    code: `// main.cpp  —  g++ main.cpp -lcurl -o pay && ./pay
#include <curl/curl.h>

int main() {
    CURL* curl = curl_easy_init();
    if (!curl) return 1;

    const char* body =
        R"({"amount":5000,"currency":"KES","provider":"test",)"
        R"("customer":{"email":"customer@example.com"}})";

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Authorization: Bearer {{SECRET}}");
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, "{{API}}/v1/payments/test");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body);
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return 0;
}`,
  },
];

function render(code) {
  return code.replace(/\{\{API\}\}/g, API_BASE).replace(/\{\{SECRET\}\}/g, KEYS.secret);
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button className="copy-btn" onClick={handleCopy} type="button">
      {copied ? '✓ Copied' : `⧉ ${label}`}
    </button>
  );
}

function KeyField({ value }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try { await navigator.clipboard.writeText(value); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = value; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  const masked = value.slice(0, 16) + '•'.repeat(Math.max(0, value.length - 20)) + value.slice(-4);
  return (
    <div className="key-field">
      <span className="key-value">{masked}</span>
      <button className="copy-icon-btn" onClick={handleCopy} type="button" aria-label="Copy key">
        {copied ? '✓' : '⧉'}
      </button>
    </div>
  );
}

function fmtMoney(minor, currency) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100); }
  catch { return `${currency} ${(minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`; }
}

// Human speed label from settlement days.
// Human speed label. Only ever renders a real, known value — unknown shows "—",
// NEVER a fabricated number of days.
function speedLabel(settlement, days) {
  if (settlement === 'instant' || days === 0) return 'Instant';
  if (settlement === 't1' || days === 1) return 'Next day';
  if (settlement === 't2' || days === 2) return '2 days';
  if (settlement === 't3' || days === 3) return '3 days';
  if (days != null && days > 0 && days < 99) return `${days} days`;
  return '—';
}

export default function DevPanel() {
  const [activeId, setActiveId] = useState('curl');
  const [runState, setRunState] = useState('idle'); // idle | running | done
  const [result, setResult] = useState(null);
  const [showIntel, setShowIntel] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [devPlatform, setDevPlatform] = useState('render');
  const [htmlOpen, setHtmlOpen] = useState(false);
  const active = LANGUAGES.find((l) => l.id === activeId) || LANGUAGES[0];
  const renderedCode = render(active.code);

  async function handleRun() {
    if (runState === 'running') return;
    setRunState('running'); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/v1/demo/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 500000, currency: 'KES' }),
      });
      const data = await res.json();
      setResult(data);
      setRunState('done');
      setShowIntel(true);
    } catch {
      setResult({ error: 'Could not reach the demo API. Try again in a moment.' });
      setRunState('done');
    }
  }

  function selectLang(id) { setActiveId(id); setRunState('idle'); setResult(null); }

  const options = (result && result.intelligence && result.intelligence.options) || [];
  const payment = result && result.payment;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="tabs">
          <div className="tab active">Quick start</div>
        </div>
        <button className="btn-test" type="button" onClick={handleRun}>Test before you sign up</button>
      </div>
      <div className="panel-body">
        {/* Universal keys — stacked (secret above publishable) */}
        <div className="keys-stack">
          <div className="key-block">
            <div className="key-label">Universal secret key <span className="info">ⓘ</span></div>
            <KeyField value={KEYS.secret} />
          </div>
          <div className="key-block">
            <div className="key-label">Universal publishable key <span className="info">ⓘ</span></div>
            <KeyField value={KEYS.publishable} />
          </div>
        </div>

        {/* 1. Set your key */}
        <div className="step-label">1. Set your key</div>
        <p className="step-hint">
          A real key goes on your host, never in code. Pick yours:
        </p>
        <p className="step-hint">
          We&apos;re assuming you already have an account with whichever host you pick below — Vercel, Heroku,
          Render, Fly.io, or another. This is just where the key goes once you do, not how to sign up for one.
        </p>
        <div className="env-platform-tabs">
          {HOSTING_PLATFORMS.map((p) => (
            <button key={p.id} type="button"
              className={devPlatform === p.id ? 'env-platform-tab active' : 'env-platform-tab'}
              onClick={() => setDevPlatform(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        {(() => {
          const platform = HOSTING_PLATFORMS.find((p) => p.id === devPlatform) || HOSTING_PLATFORMS[0];
          return (
            <ol className="env-platform-steps-list">
              {platform.steps.map((s, i) => (
                <li key={i}>{s.replace('{{KEY_VALUE}}', 'the universal secret key above').replace('{{KEY_VALUE_INLINE}}', KEYS.secret)}</li>
              ))}
            </ol>
          );
        })()}

        {/* 2. Copy HTML and CSS — the frontend. Collapsed by default: this is
            the shopper-facing half of a full project (frontend = HTML/CSS,
            backend = whichever language is picked below), shown collapsed
            so it doesn't compete with "Set your key" for attention on load. */}
        <div className="step-row">
          <button type="button" className="env-setup-head" style={{ width: '100%' }}
            onClick={() => setHtmlOpen((o) => !o)}>
            <span className="step-label" style={{ marginBottom: 0 }}>2. Copy HTML and CSS</span>
            <span className="env-setup-chevron">{htmlOpen ? '▲' : '▼'}</span>
          </button>
        </div>
        {htmlOpen && (() => {
          const intelHtml = INTELLIGENCE_TESTING_SDK
            .replaceAll('{{API}}', API_BASE)
            .replaceAll('{{PUBLISHABLE_KEY}}', KEYS.publishable);
          return (
            <>
              <p className="step-hint">
                This is the shopper-facing half of a full project — the frontend, HTML and CSS together in one
                file. The 12 languages below are the backend half: whichever one you pick serves the endpoints
                this file calls out to.
              </p>
              <div className="code-box">
                <div className="code-box-head">
                  <span>intelligence.html</span>
                  <CopyButton text={intelHtml} />
                </div>
                <pre className="code-pre">{intelHtml}</pre>
              </div>
            </>
          );
        })()}

        {/* 3. Language selector — matches the dashboard set */}
        <div className="step-label">3. Choose your language</div>
        <div className="lang-pills">
          {LANGUAGES.map((l) => {
            const key = ICON_KEY[l.id] || l.id;
            const icon = LANG_ICONS[key];
            const brand = LANG_BRAND[key];
            const isActive = l.id === activeId;
            return (
              <button key={l.id} type="button"
                className={isActive ? 'pill active' : 'pill'}
                style={isActive && brand ? { borderColor: brand } : undefined}
                onClick={() => selectLang(l.id)}>
                {icon && (
                  <span className="pill-icon" dangerouslySetInnerHTML={{ __html: icon }} />
                )}
                {l.label}
              </button>
            );
          })}
        </div>

        {/* 4. Real code */}
        <div className="step-row">
          <div className="step-label" style={{ marginBottom: 0 }}>4. Copy, run, and see it work</div>
          <a href="/docs/" className="view-docs">View full docs →</a>
        </div>

        <div className="code-grid">
          <div className="code-box">
            <div className="code-box-head">
              <span>{active.filename}</span>
              <CopyButton text={renderedCode} />
            </div>
            {active.deps && <div className="code-deps"><span className="code-deps-tag">setup</span>{active.deps}</div>}
            <pre className="code-pre">{renderedCode}</pre>
            {active.note && <div className="code-note">{active.note}</div>}
          </div>
          <div className="code-box">
            <div className="code-box-head">
              <span>RESPONSE</span>
              {runState === 'done' && payment ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="status-dot"></span>200 OK · test
                </span>
              ) : runState === 'running' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8a8a92' }}>
                  <span className="status-dot pending"></span>Sending…
                </span>
              ) : (
                <span style={{ color: '#6a6a72' }}>Awaiting request</span>
              )}
            </div>
            {runState === 'idle' && (
              <pre className="code-pre code-muted">{`// Click "Run in test mode" to send a
// test payment and see the real API
// response — and the routing intelligence.`}</pre>
            )}
            {runState === 'running' && (
              <pre className="code-pre code-muted">{`> POST /v1/payments/test
> Running routing intelligence…
> Creating test payment…`}</pre>
            )}
            {runState === 'done' && payment && (
              <pre className="code-pre">{JSON.stringify(payment, null, 2)}</pre>
            )}
            {runState === 'done' && result && result.error && (
              <pre className="code-pre code-muted">{result.error}</pre>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="run-btn" type="button" onClick={handleRun} disabled={runState === 'running'}>
            {runState === 'running' ? '● Running…' : runState === 'done' ? '↻ Run again' : '▶ Run in test mode'}
          </button>
          {runState === 'done' && payment && (
            <button className="success-line" type="button" style={{ border: 'none', cursor: 'pointer', background: 'none' }}
              onClick={() => setShowIntel(true)}>
              ✓ Test payment created · see intelligence
            </button>
          )}
        </div>

        {/* View more in test mode — appears after a run */}
        {runState === 'done' && payment && (
          <button className="view-more-btn" type="button" onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Hide test details ▲' : 'View more in test mode ▼'}
          </button>
        )}
        {showMore && runState === 'done' && payment && (
          <div className="test-more">
            <div className="test-more-block">
              <div className="test-more-h">Full payment object</div>
              <pre className="code-pre">{JSON.stringify(payment, null, 2)}</pre>
            </div>
            <div className="test-more-block">
              <div className="test-more-h">What each way to pay would cost</div>
              <div className="test-more-rails">
                {options.map((o, i) => (
                  <div key={o.label} className={`test-more-rail test-more-rail-2col ${i === 0 ? 'best' : ''}`}>
                    <span className="test-more-rail-name">{o.label}</span>
                    <span className="test-more-rail-fee">{o.fee_minor != null ? fmtMoney(o.fee_minor, payment.currency) : '—'}{o.fee_percent_effective != null ? ` · ${o.fee_percent_effective}%` : ''}</span>
                    {i === 0 && <span className="test-more-rail-reason">Best value for this payment — chosen automatically.</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="test-more-block">
              <div className="test-more-h">What happens on a real (live) project</div>
              <ul className="test-more-list">
                <li>You connect your own provider (Paystack, M-Pesa, PayPal, etc.) in the dashboard.</li>
                <li>Konduyt routes the payment to the cheapest option automatically.</li>
                <li>A webhook confirms the payment; the ledger records it.</li>
                <li>The Money and Taxes tabs update with the real transaction.</li>
              </ul>
              <div className="test-more-note">Test mode — no real charge, nothing stored. This mirrors the live result.</div>
            </div>
          </div>
        )}
      </div>

      {/* Payment intelligence popup — the real ranked vendors from the engine */}
      {showIntel && options.length > 0 && (
        <div className="intel-modal-overlay" onClick={() => setShowIntel(false)}>
          <div className="intel-modal" onClick={(e) => e.stopPropagation()}>
            <button className="intel-modal-close" onClick={() => setShowIntel(false)} type="button">✕</button>
            <div className="intel-modal-head">
              <div className="intel-modal-title">Payment intelligence</div>
              <div className="intel-modal-sub">
                A {fmtMoney(payment.amount, payment.currency)} payment, every way your customer can pay —
                ranked cheapest-first by real charges. This is exactly what you get on a real project once you connect a provider.
              </div>
            </div>
            <div className="intel-modal-table">
              <div className="intel-modal-row intel-modal-row-head intel-row-2col">
                <span>Pay with</span><span>Charge</span><span></span>
              </div>
              {options.map((o, i) => (
                <div key={o.label} className={`intel-modal-row intel-row-2col ${i === 0 ? 'best' : ''}`}>
                  <span className="intel-rail-name">{o.label}</span>
                  <span className="intel-rail-fee">
                    {o.fee_minor != null ? fmtMoney(o.fee_minor, payment.currency) : '—'}
                    {o.fee_percent_effective != null && <span className="intel-rail-money"> · {o.fee_percent_effective}%</span>}
                  </span>
                  <span>{i === 0 ? <span className="intel-best-badge">Best value</span> : null}</span>
                </div>
              ))}
            </div>
            <div className="intel-modal-foot">
              Test mode — no real charge. Konduyt routes to the best-value option automatically for your customers.
            </div>
            <a href="/demo/" className="intel-modal-cta">View the full demo →</a>
          </div>
        </div>
      )}
    </div>
  );
}
