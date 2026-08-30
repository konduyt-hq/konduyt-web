'use client';

import { useState } from 'react';
import { LANG_ICONS, LANG_BRAND } from './dashboard/langicons';
import { HOSTING_PLATFORMS } from './dashboard/hostingplatforms';
import { INTELLIGENCE_TESTING_SDK } from './dashboard/intelligencesdk';
import { ANDROID_LAYOUT_XML, IOS_STORYBOARD_XML } from './dashboard/frontendfiles';

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
    id: 'curl', label: 'cURL', filename: 'test.sh',
    deps: 'No dependencies — cURL is built into macOS and Linux.',
    note: 'curl is different from the other 11 tabs: it can\'t serve an endpoint, only call one. These test whichever backend you\'re actually running (any one of the other language tabs) on localhost:3000 -- start that backend first, then run these.',
    code: `#!/bin/bash
# test.sh  —  run against whichever backend you have running (localhost:3000)

echo "1. One-time payment"
curl -X POST http://localhost:3000/api/create-payment \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 5000, "email": "customer@example.com"}'
echo

echo "2. Recurring subscription"
curl -X POST http://localhost:3000/api/create-subscription \\
  -H "Content-Type: application/json" \\
  -d '{}'
echo

echo "3. Split payment"
curl -X POST http://localhost:3000/api/create-split-payment \\
  -H "Content-Type: application/json" \\
  -d '{}'
echo

echo "4. Pay-as-you-go usage bill"
curl -X POST http://localhost:3000/api/create-usage-bill \\
  -H "Content-Type: application/json" \\
  -d '{}'
echo`,
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
    id: 'ruby', label: 'Ruby', filename: 'server.rb',
    deps: 'Install: gem install sinatra net-http   ·   Run: ruby server.rb -- then open intelligence.html next to it.',
    note: 'This is the BACKEND for the intelligence.html frontend from step 2 -- its "Buy now" button calls /api/create-payment, which this file serves. One real server, four real scenarios.',
    code: `# server.rb  —  gem install sinatra net-http, then: ruby server.rb
require "sinatra"
require "net/http"
require "json"
require "uri"

set :port, 3000

# SECRET KEY -- stays on the server, never sent to a browser. This is
# Konduyt's own universal demo key (safe here since it's already public),
# but a real key works exactly the same way -- see "Where does my secret
# key go?" above for where a real one belongs (never hardcoded like this).
KONDUYT_SECRET_KEY = "{{SECRET}}"
API = "{{API}}"

def konduyt(path, body)
  uri = URI(API + path)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = uri.scheme == "https"

  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer #{KONDUYT_SECRET_KEY}"
  req["Content-Type"] = "application/json"
  req.body = body.to_json

  http.request(req).body
end

post "/api/create-payment" do
  # One-time: amount either comes from the shopper (a donation), or is a
  # fixed price you already know (a product) -- same field either way.
  body = JSON.parse(request.body.read)
  amount = body["amount"]     # whatever the shopper typed in, OR
  # amount = 5000               # a fixed price you already know
  content_type :json
  konduyt("/v1/payments/test", { amount: amount, currency: "KES", provider: "test" })
end

post "/api/create-subscription" do
  # Recurring: a fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
  content_type :json
  konduyt("/v1/payment_sessions", {
    amount: 100000, currency: "KES",
    recurring: true, interval: "monthly",
    reference: "sub_pro_plan",
  }) # {"id" => "sess_...", ...} -- open with Konduyt.checkout({ sessionId })
end

post "/api/create-split-payment" do
  # Split: one checkout, proceeds split across sellers using the
  # provider's own real split capability -- Konduyt never holds funds.
  content_type :json
  konduyt("/v1/marketplace_payments", {
    provider: "paystack", amount: 500000, currency: "KES",
    splits: [{ seller_id: "seller_123", amount: 400000 }],
  }) # the remainder is your own commission
end

post "/api/create-usage-bill" do
  # Pay-as-you-go: amount computed from real usage, not typed in or fixed.
  units_used, price_per_unit = 340, 25
  amount = units_used * price_per_unit
  content_type :json
  konduyt("/v1/payment_sessions", {
    amount: amount, currency: "KES", recurring: false,
    reference: "usage_#{Time.now.to_i}",
  })
end`,
  },
  {
    id: 'rust', label: 'Rust', filename: 'main.rs',
    deps: 'Cargo.toml: reqwest = { version = "0.12", features = ["blocking","json"] }  ·  serde_json = "1"  ·  tiny_http = "0.12"   —   Run: cargo run -- then open intelligence.html next to it.',
    note: 'This is the BACKEND for the intelligence.html frontend from step 2 -- its "Buy now" button calls /api/create-payment, which this file serves. One real server, four real scenarios.',
    code: `// src/main.rs  —  cargo add reqwest --features blocking,json && cargo add serde_json tiny_http
use reqwest::blocking::Client;
use serde_json::{json, Value};
use tiny_http::{Server, Response, Method};
use std::io::Read;

// SECRET KEY -- stays on the server, never sent to a browser. This is
// Konduyt's own universal demo key (safe here since it's already public),
// but a real key works exactly the same way -- see "Where does my secret
// key go?" above for where a real one belongs (never hardcoded like this).
const KONDUYT_SECRET_KEY: &str = "{{SECRET}}";
const API: &str = "{{API}}";

fn konduyt(path: &str, body: Value) -> String {
    Client::new()
        .post(format!("{}{}", API, path))
        .bearer_auth(KONDUYT_SECRET_KEY)
        .json(&body)
        .send()
        .and_then(|r| r.text())
        .unwrap_or_else(|e| format!("{{\\"error\\": \\"{}\\"}}", e))
}

fn main() {
    let server = Server::http("0.0.0.0:3000").unwrap();
    println!("Backend running on http://localhost:3000");

    for mut request in server.incoming_requests() {
        if request.method() != &Method::Post {
            request.respond(Response::from_string("").with_status_code(404)).ok();
            continue;
        }

        let mut body_str = String::new();
        request.as_reader().read_to_string(&mut body_str).ok();
        let body: Value = serde_json::from_str(&body_str).unwrap_or(json!({}));

        let result = match request.url() {
            "/api/create-payment" => {
                // One-time: amount either comes from the shopper (a donation), or
                // is a fixed price you already know (a product) -- same field either way.
                let amount = body["amount"].clone(); // whatever the shopper typed in, OR
                // let amount = json!(5000);           // a fixed price you already know
                konduyt("/v1/payments/test", json!({
                    "amount": amount, "currency": "KES", "provider": "test"
                }))
            }
            "/api/create-subscription" => {
                // Recurring: a fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
                konduyt("/v1/payment_sessions", json!({
                    "amount": 100000, "currency": "KES",
                    "recurring": true, "interval": "monthly",
                    "reference": "sub_pro_plan"
                })) // {"id": "sess_...", ...} -- open with Konduyt.checkout({ sessionId })
            }
            "/api/create-split-payment" => {
                // Split: one checkout, proceeds split across sellers using the
                // provider's own real split capability -- Konduyt never holds funds.
                konduyt("/v1/marketplace_payments", json!({
                    "provider": "paystack", "amount": 500000, "currency": "KES",
                    "splits": [{ "seller_id": "seller_123", "amount": 400000 }]
                })) // the remainder is your own commission
            }
            "/api/create-usage-bill" => {
                // Pay-as-you-go: amount computed from real usage, not typed in or fixed.
                let (units_used, price_per_unit) = (340, 25);
                let amount = units_used * price_per_unit;
                let reference = format!("usage_{}", std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH).unwrap().as_secs());
                konduyt("/v1/payment_sessions", json!({
                    "amount": amount, "currency": "KES", "recurring": false,
                    "reference": reference
                }))
            }
            _ => { request.respond(Response::from_string("").with_status_code(404)).ok(); continue; }
        };

        request.respond(Response::from_string(result)).ok();
    }
}`,
  },
  {
    id: 'csharp', label: 'C#', filename: 'Program.cs',
    deps: '.NET 6+ (minimal APIs are built in). dotnet new web -o . then paste over Program.cs. Run: dotnet run -- then open intelligence.html next to it.',
    note: 'This is the BACKEND for the intelligence.html frontend from step 2 -- its "Buy now" button calls /api/create-payment, which this file serves. One real server, four real scenarios.',
    code: `// Program.cs  —  dotnet new web -o ., paste over Program.cs, then: dotnet run
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// SECRET KEY -- stays on the server, never sent to a browser. This is
// Konduyt's own universal demo key (safe here since it's already public),
// but a real key works exactly the same way -- see "Where does my secret
// key go?" above for where a real one belongs (never hardcoded like this).
const string KonduytSecretKey = "{{SECRET}}";
const string Api = "{{API}}";

async Task<string> Konduyt(string path, object body) {
    using var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", KonduytSecretKey);
    var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
    var res = await client.PostAsync(Api + path, content);
    return await res.Content.ReadAsStringAsync();
}

app.MapPost("/api/create-payment", async (HttpRequest req) => {
    // One-time: amount either comes from the shopper (a donation), or is a
    // fixed price you already know (a product) -- same field either way.
    var body = await JsonSerializer.DeserializeAsync<Dictionary<string, JsonElement>>(req.Body);
    var amount = body!["amount"].GetInt32();   // whatever the shopper typed in, OR
    // var amount = 5000;                         // a fixed price you already know
    return Results.Content(await Konduyt("/v1/payments/test", new {
        amount, currency = "KES", provider = "test"
    }), "application/json");
});

app.MapPost("/api/create-subscription", async () => {
    // Recurring: a fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
    return Results.Content(await Konduyt("/v1/payment_sessions", new {
        amount = 100000, currency = "KES",
        recurring = true, interval = "monthly",
        reference = "sub_pro_plan"
    }), "application/json"); // { "id": "sess_...", ... } -- open with Konduyt.checkout({ sessionId })
});

app.MapPost("/api/create-split-payment", async () => {
    // Split: one checkout, proceeds split across sellers using the
    // provider's own real split capability -- Konduyt never holds funds.
    return Results.Content(await Konduyt("/v1/marketplace_payments", new {
        provider = "paystack", amount = 500000, currency = "KES",
        splits = new[] { new { seller_id = "seller_123", amount = 400000 } }
    }), "application/json"); // the remainder is your own commission
});

app.MapPost("/api/create-usage-bill", async () => {
    // Pay-as-you-go: amount computed from real usage, not typed in or fixed.
    int unitsUsed = 340, pricePerUnit = 25;
    int amount = unitsUsed * pricePerUnit;
    return Results.Content(await Konduyt("/v1/payment_sessions", new {
        amount, currency = "KES", recurring = false,
        reference = $"usage_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}"
    }), "application/json");
});

app.Urls.Add("http://localhost:3000");
Console.WriteLine("Backend running on http://localhost:3000");
app.Run();`,
  },
  {
    id: 'java', label: 'Java', filename: 'MainActivity.java',
    deps: `// build.gradle (Module: app) — a real dependency
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}

// AndroidManifest.xml — a real, separate file, not a comment.
// Goes at the project root's app/src/main/, next to your Activity.
// This app talks to your OWN backend (see the other language tabs) —
// never Konduyt directly, and never holds a secret key.
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <application android:label="Konduyt Demo" android:icon="@mipmap/ic_launcher">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
    note: 'A real, minimal Android project needs all three pieces above and below: the Gradle dependency, the manifest (real permissions + the Activity declaration), and the Activity code itself. Network calls must run off the main thread on Android (a coroutine or Executor) — a raw call on the UI thread throws NetworkOnMainThreadException; the Executor below handles that.',
    code: `// app/src/main/java/.../MainActivity.java
package com.example.konduytdemo;

import android.os.Bundle;
import android.widget.Button;
import androidx.appcompat.app.AppCompatActivity;
import okhttp3.*;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {
    // This app calls YOUR OWN backend, never Konduyt directly -- there is
    // no safe way to hold a secret key on a device. Whichever of the other
    // 11 language tabs you run as your backend, this points at it.
    private static final String BACKEND = "http://10.0.2.2:3000"; // your backend, from the Android emulator

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main); // a real layout file: one Button, id "buyButton"

        Button buyButton = findViewById(R.id.buyButton);
        buyButton.setOnClickListener(v -> createPayment(5000, "customer@example.com"));
    }

    void createPayment(int amount, String email) {
        // amount either comes from the shopper (a donation), or is a fixed
        // price you already know (a product) -- same field either way.
        OkHttpClient client = new OkHttpClient();
        Executors.newSingleThreadExecutor().execute(() -> {
            String json = "{\\"amount\\": " + amount + ", \\"email\\": \\"" + email + "\\"}";
            Request request = new Request.Builder()
                .url(BACKEND + "/api/create-payment")
                .post(RequestBody.create(json, MediaType.get("application/json")))
                .build();
            try (Response res = client.newCall(request).execute()) {
                String payment = res.body().string();
                // your backend returns whatever Konduyt gave it -- open
                // authorization_url in a Chrome Custom Tab on the main thread
                runOnUiThread(() -> { /* show payment / open the checkout URL */ });
            } catch (Exception e) {
                // handle the real error -- backend unreachable, etc.
            }
        });
    }
}`,
  },
  {
    id: 'kotlin', label: 'Kotlin', filename: 'MainActivity.kt',
    deps: `// build.gradle.kts (Module: app) — a real dependency
dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}

// AndroidManifest.xml — a real, separate file, not a comment.
// Goes at the project root's app/src/main/, next to your Activity.
// This app talks to your OWN backend (see the other language tabs) —
// never Konduyt directly, and never holds a secret key.
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <application android:label="Konduyt Demo" android:icon="@mipmap/ic_launcher">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
    note: 'A real, minimal Android project needs all three pieces above and below: the Gradle dependency, the manifest (real permissions + the Activity declaration), and the Activity code itself. Call from a coroutine (Dispatchers.IO) — never the main thread.',
    code: `// app/src/main/java/.../MainActivity.kt
package com.example.konduytdemo

import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

class MainActivity : AppCompatActivity() {
    // This app calls YOUR OWN backend, never Konduyt directly -- there is
    // no safe way to hold a secret key on a device. Whichever of the other
    // 11 language tabs you run as your backend, this points at it.
    private val backend = "http://10.0.2.2:3000" // your backend, from the Android emulator

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main) // a real layout file: one Button, id "buyButton"

        findViewById<Button>(R.id.buyButton).setOnClickListener {
            createPayment(5000, "customer@example.com")
        }
    }

    fun createPayment(amount: Int, email: String) {
        // amount either comes from the shopper (a donation), or is a fixed
        // price you already know (a product) -- same field either way.
        CoroutineScope(Dispatchers.IO).launch {
            val client = OkHttpClient()
            val json = "application/json".toMediaType()
            val payload = """{ "amount": $amount, "email": "$email" }"""

            val request = Request.Builder()
                .url("$backend/api/create-payment")
                .post(payload.toRequestBody(json))
                .build()

            client.newCall(request).execute().use { res ->
                val payment = res.body?.string()
                // your backend returns whatever Konduyt gave it -- open
                // authorization_url in a Chrome Custom Tab on the main thread
                withContext(Dispatchers.Main) { /* show payment / open the checkout URL */ }
            }
        }
    }
}`,
  },
  {
    id: 'swift', label: 'Swift', filename: 'ContentView.swift',
    deps: `// No package dependency needed -- URLSession is built into Foundation.

// Info.plist — a real, separate file, not a comment. Goes at your
// project root. iOS blocks plain HTTP by default (App Transport
// Security); this allows local testing against your own backend on
// localhost. Remove this exception for a real backend on a real https
// domain -- it should only ever apply to local development.
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSExceptionDomains</key>
        <dict>
            <key>localhost</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <true/>
            </dict>
        </dict>
    </dict>
</dict>
</plist>`,
    note: 'A real, minimal iOS project needs both pieces above and below: Info.plist (real App Transport Security config for local testing) and the view itself. This app talks to your OWN backend (see the other language tabs) -- never Konduyt directly, and never holds a secret key.',
    code: `// ContentView.swift
import SwiftUI

struct ContentView: View {
    @State private var result: String = ""

    // This app calls YOUR OWN backend, never Konduyt directly -- there is
    // no safe way to hold a secret key on a device. Whichever of the other
    // 11 language tabs you run as your backend, this points at it.
    let backend = "http://localhost:3000" // your backend, from the iOS Simulator

    var body: some View {
        VStack(spacing: 16) {
            Text(result).font(.footnote)
            Button("Buy now") {
                Task { await createPayment(amount: 5000, email: "customer@example.com") }
            }
        }
        .padding()
    }

    func createPayment(amount: Int, email: String) async {
        // amount either comes from the shopper (a donation), or is a fixed
        // price you already know (a product) -- same field either way.
        var request = URLRequest(url: URL(string: "\\(backend)/api/create-payment")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["amount": amount, "email": email])

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            // your backend returns whatever Konduyt gave it -- open
            // authorization_url in an SFSafariViewController
            result = String(data: data, encoding: .utf8) ?? ""
        } catch {
            result = "Could not reach your backend -- is it running?"
        }
    }
}`,
  },
  {
    id: 'cpp', label: 'C++', filename: 'main.cpp',
    deps: 'Needs libcurl and cpp-httplib (a single header). Install: apt install libcurl4-openssl-dev libcpp-httplib-dev (Debian/Ubuntu) or brew install curl cpp-httplib (macOS). Compile: g++ main.cpp -lcurl -lcpp-httplib -o server && ./server -- then open intelligence.html next to it.',
    note: 'This is the BACKEND for the intelligence.html frontend from step 2 -- its "Buy now" button calls /api/create-payment, which this file serves. One real server, four real scenarios.',
    code: `// main.cpp  —  g++ main.cpp -lcurl -lcpp-httplib -o server && ./server
#include <curl/curl.h>
#include <httplib.h>
#include <string>
#include <ctime>

// SECRET KEY -- stays on the server, never sent to a browser. This is
// Konduyt's own universal demo key (safe here since it's already public),
// but a real key works exactly the same way -- see "Where does my secret
// key go?" above for where a real one belongs (never hardcoded like this).
const std::string KONDUYT_SECRET_KEY = "{{SECRET}}";
const std::string API = "{{API}}";

static size_t writeCallback(void* contents, size_t size, size_t nmemb, std::string* out) {
    out->append((char*)contents, size * nmemb);
    return size * nmemb;
}

std::string konduyt(const std::string& path, const std::string& jsonBody) {
    CURL* curl = curl_easy_init();
    std::string response;
    if (!curl) return "{}";

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, ("Authorization: Bearer " + KONDUYT_SECRET_KEY).c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, (API + path).c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, jsonBody.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return response;
}

int main() {
    httplib::Server svr;

    svr.Post("/api/create-payment", [](const httplib::Request& req, httplib::Response& res) {
        // One-time: amount either comes from the shopper (a donation), or is
        // a fixed price you already know (a product) -- same field either way.
        // (Parsing req.body's real "amount" field is left to a JSON library
        // of your choice -- shown here as a fixed price for brevity.)
        std::string amount = "5000"; // whatever the shopper typed in, OR a fixed price you already know
        std::string body = R"({"amount":)" + amount + R"(,"currency":"KES","provider":"test"})";
        res.set_content(konduyt("/v1/payments/test", body), "application/json");
    });

    svr.Post("/api/create-subscription", [](const httplib::Request&, httplib::Response& res) {
        // Recurring: a fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
        std::string body = R"({"amount":100000,"currency":"KES","recurring":true,)"
                            R"("interval":"monthly","reference":"sub_pro_plan"})";
        res.set_content(konduyt("/v1/payment_sessions", body), "application/json");
        // {"id": "sess_...", ...} -- open with Konduyt.checkout({ sessionId })
    });

    svr.Post("/api/create-split-payment", [](const httplib::Request&, httplib::Response& res) {
        // Split: one checkout, proceeds split across sellers using the
        // provider's own real split capability -- Konduyt never holds funds.
        std::string body = R"({"provider":"paystack","amount":500000,"currency":"KES",)"
                            R"("splits":[{"seller_id":"seller_123","amount":400000}]})";
        res.set_content(konduyt("/v1/marketplace_payments", body), "application/json");
        // the remainder is your own commission
    });

    svr.Post("/api/create-usage-bill", [](const httplib::Request&, httplib::Response& res) {
        // Pay-as-you-go: amount computed from real usage, not typed in or fixed.
        long unitsUsed = 340, pricePerUnit = 25;
        long amount = unitsUsed * pricePerUnit;
        std::string body = R"({"amount":)" + std::to_string(amount) +
            R"(,"currency":"KES","recurring":false,"reference":"usage_)" +
            std::to_string(std::time(nullptr)) + R"("})";
        res.set_content(konduyt("/v1/payment_sessions", body), "application/json");
    });

    printf("Backend running on http://localhost:3000\\n");
    svr.listen("0.0.0.0", 3000);
}`,
  },
];

// The three real frontend file types -- HTML/CSS for the web/CLI backends,
// and Android/iOS's own real UI-definition file formats (neither renders
// a web page, so neither has an HTML/CSS equivalent -- each gets its own
// real file instead, not an HTML/CSS file pretending to be one).
const FRONTEND_OPTIONS = [
  {
    id: 'html', label: 'HTML & CSS', filename: 'intelligence.html', iconKey: 'html',
    hint: 'The web frontend — HTML and CSS together in one file. Works with any of the 12 backend languages below.',
  },
  {
    id: 'android', label: 'Android (XML)', filename: 'activity_main.xml', iconKey: 'android',
    hint: 'Android\'s own real UI-definition file — what the Java/Kotlin backend tabs\' MainActivity actually loads. Pair with either of those two.',
  },
  {
    id: 'ios', label: 'iOS (Storyboard)', filename: 'Main.storyboard', iconKey: 'swift',
    hint: 'iOS\'s classic UIKit UI-definition file — an XML-based alternative to the SwiftUI approach shown in the Swift backend tab. Either is valid; use whichever your project already uses.',
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
  const [frontendId, setFrontendId] = useState('html');
  const [frontendOpen, setFrontendOpen] = useState(false);
  const active = LANGUAGES.find((l) => l.id === activeId) || LANGUAGES[0];
  const renderedCode = render(active.code);

  async function handleRun() {
    if (runState === 'running') return;
    setRunState('running'); setResult(null);
    try {
      // Real geo-aware intelligence: real detected country, real converted
      // price in the visitor's real local currency, real locally-eligible
      // methods ranked by fee -- the same endpoint and the same
      // convertToLocal behavior the real konduyt.js SDK itself uses (see
      // /checkout/local-intelligence on the backend), not a separate,
      // hardcoded landing-page-only demo path.
      const res = await fetch(
        `${API_BASE}/checkout/local-intelligence?pk=${encodeURIComponent(KEYS.publishable)}&amount=500000&currency=KES`
      );
      const data = await res.json();
      if (!res.ok || !data.methods || data.methods.length === 0) {
        setResult({ error: data.reason === 'no_coverage'
          ? 'No payment methods available for your detected location right now.'
          : 'Could not reach the demo API. Try again in a moment.' });
        setRunState('done');
        return;
      }
      setResult(data);
      setRunState('done');
      setShowIntel(true);
    } catch {
      setResult({ error: 'Could not reach the demo API. Try again in a moment.' });
      setRunState('done');
    }
  }

  function selectLang(id) { setActiveId(id); setRunState('idle'); setResult(null); }

  // Real methods from /checkout/local-intelligence, mapped into the shape
  // the popup renders -- fee_minor computed from the real fee_percent
  // against the real converted amount, not a separate fabricated number.
  const options = (result && result.methods || []).map((m) => ({
    label: m.name,
    fee_percent_effective: m.fee_percent,
    fee_minor: m.fee_percent != null && result.display_amount != null
      ? Math.round(result.display_amount * m.fee_percent / 100)
      : null,
  }));
  const payment = result && result.display_amount != null
    ? { amount: result.display_amount, currency: result.display_currency }
    : null;

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
        <p className="step-hint">
          Your publishable key isn&apos;t a secret — it&apos;s safe to expose client-side, so it doesn&apos;t
          need the same protection. But it&apos;s still worth setting it as an environment variable on the same
          host (e.g. <code>KONDUYT_PUBLISHABLE_KEY</code>), for two real reasons: if your backend is the one
          serving your frontend page, it needs a way to inject the key into what it sends the browser; and
          keeping both keys as env vars means one place to manage per environment (test vs. live), rather than
          a hardcoded value you have to hunt down and edit in your frontend source every time it changes.
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

        {/* 2. Frontend — a real pill picker, matching the language pills
            below (including real language icons). HTML & CSS is the web
            frontend; Android and iOS don't render a web page at all, so
            they get their own real UI-definition file instead (XML
            layout / Storyboard XML) -- not an HTML/CSS file pretending
            to be one. Collapsed by default, same reasoning as before: it
            shouldn't compete with "Set your key" for attention on load. */}
        <div className="step-row">
          <button type="button" className="env-setup-head" style={{ width: '100%' }}
            onClick={() => setFrontendOpen((o) => !o)}>
            <span className="step-label" style={{ marginBottom: 0 }}>2. Copy your frontend</span>
            <span className="env-setup-chevron">{frontendOpen ? '▲' : '▼'}</span>
          </button>
        </div>
        {frontendOpen && (
          <>
            <div className="lang-pills">
              {FRONTEND_OPTIONS.map((f) => {
                const icon = LANG_ICONS[f.iconKey];
                const brand = LANG_BRAND[f.iconKey];
                const isActive = f.id === frontendId;
                return (
                  <button key={f.id} type="button"
                    className={isActive ? 'pill active' : 'pill'}
                    style={isActive && brand ? { borderColor: brand } : undefined}
                    onClick={() => setFrontendId(f.id)}>
                    {icon && (
                      <span className="pill-icon" dangerouslySetInnerHTML={{ __html: icon }} />
                    )}
                    {f.label}
                  </button>
                );
              })}
            </div>
            {(() => {
              const frontend = FRONTEND_OPTIONS.find((f) => f.id === frontendId) || FRONTEND_OPTIONS[0];
              const intelHtml = INTELLIGENCE_TESTING_SDK
                .replaceAll('{{API}}', API_BASE)
                .replaceAll('{{PUBLISHABLE_KEY}}', KEYS.publishable);
              const content = frontend.id === 'html' ? intelHtml
                : frontend.id === 'android' ? ANDROID_LAYOUT_XML
                : IOS_STORYBOARD_XML;
              return (
                <>
                  <p className="step-hint">{frontend.hint}</p>
                  <div className="code-box">
                    <div className="code-box-head">
                      <span>{frontend.filename}</span>
                      <CopyButton text={content} />
                    </div>
                    <pre className="code-pre">{content}</pre>
                  </div>
                </>
              );
            })()}
          </>
        )}

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

        <div className="code-grid code-grid-single">
          <div className="code-box">
            <div className="code-box-head">
              <span>{active.filename}</span>
              <CopyButton text={renderedCode} />
            </div>
            {active.deps && <div className="code-deps"><span className="code-deps-tag">setup</span>{active.deps}</div>}
            <pre className="code-pre">{renderedCode}</pre>
            {active.note && <div className="code-note">{active.note}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="run-btn" type="button" onClick={handleRun} disabled={runState === 'running'}>
            {runState === 'running' ? '● Running…' : runState === 'done' ? '↻ Run again' : '▶ Run in test mode'}
          </button>
          {runState === 'done' && result && result.error && (
            <span className="run-error">{result.error}</span>
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
                {result && result.shopper_country && result.fx_status === 'KNOWN' && (
                  <> Converted to {payment.currency} for your detected location ({result.shopper_country}).</>
                )}
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
