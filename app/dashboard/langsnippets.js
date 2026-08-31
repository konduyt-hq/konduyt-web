// Code snippets for creating a payment through Konduyt, per language.
//
// SHOW, DON'T TELL: each snippet reads the secret key from an ENVIRONMENT
// VARIABLE (KONDUYT_SECRET_KEY) the way that language does it — never pasted
// inline. Where to actually SET that variable is covered once, in the shared
// "Where does my secret key go?" panel above these snippets (your hosting
// platform's environment variables -- Render, Vercel, Railway, and so on --
// not a .env file), rather than repeated per-language here. Platform
// languages (Android/iOS) call the developer's OWN backend, never Konduyt
// directly -- there is no safe way to hold a secret key on a device.
// {{API}} is replaced at render time with the API base URL.
//
// Every language covers the same four real scenarios, using the same real
// endpoints as the rest of Konduyt:
//   - One-time payment       -- POST /v1/payments
//   - Recurring subscription -- POST /v1/payment_sessions (recurring: true),
//                                then Konduyt.checkout({ sessionId })
//   - Split payment          -- POST /v1/marketplace_payments (splits[])
//   - Pay-as-you-go          -- amount computed server-side from real usage,
//                                then POST /v1/payment_sessions (recurring: false)
//
// The one-time example shows BOTH ways an amount can come from: a shopper
// typing it in (a donation), and a fixed price you already know (a
// product) -- the same amount variable either way, just where it comes
// from differs. The other three examples don't repeat this -- a
// subscription price, a split total, and a computed usage bill are each
// naturally fixed/computed already, not something a shopper types in.

export const LANG_SNIPPETS = [
  {
    id: 'curl', label: 'cURL', icon: 'curl',
    sections: [
      { title: 'One-time payment', code:
`# amount either comes from the shopper (a donation input) or is a price
# you already know (a product) -- same field either way:
AMOUNT=1000            # a fixed price you already know, OR
# AMOUNT=$SHOPPER_INPUT  # whatever the shopper typed into a donation field

# $KONDUYT_SECRET_KEY is set as an environment variable on your server/host --
# see "Where does my secret key go?" above, never pasted into a command directly.
curl -X POST {{API}}/v1/payments \\
  -H "Authorization: Bearer $KONDUYT_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"amount\\": $AMOUNT,
    \\"currency\\": \\"KES\\",
    \\"method\\": \\"mpesa\\",
    \\"customer\\": { \\"email\\": \\"customer@example.com\\" }
  }"` },
      { title: 'Recurring subscription', code:
`# A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
# Creates a session; the customer authorizes once in the checkout popup,
# Konduyt then charges the same amount automatically every interval.
curl -X POST {{API}}/v1/payment_sessions \\
  -H "Authorization: Bearer $KONDUYT_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100000,
    "currency": "KES",
    "recurring": true,
    "interval": "monthly",
    "reference": "sub_pro_plan"
  }'
# Returns {"id": "sess_...", ...} -- pass that id to Konduyt.checkout({ sessionId })` },
      { title: 'Split payment', code:
`# One checkout, proceeds split across sellers using the provider's own
# real split capability -- Konduyt never holds or redistributes funds.
# Register each seller once first (see the dashboard's Payment Providers tab).
curl -X POST {{API}}/v1/marketplace_payments \\
  -H "Authorization: Bearer $KONDUYT_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "paystack",
    "amount": 500000,
    "currency": "KES",
    "splits": [
      { "seller_id": "seller_123", "amount": 400000 }
    ]
  }'
# The remaining 100000 (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`# amount is computed from real usage, not typed in or fixed -- e.g.
# metered API calls, storage, or minutes used this billing period.
UNITS=340
PRICE_PER_UNIT=25
AMOUNT=$((UNITS * PRICE_PER_UNIT))

curl -X POST {{API}}/v1/payment_sessions \\
  -H "Authorization: Bearer $KONDUYT_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"amount\\": $AMOUNT,
    \\"currency\\": \\"KES\\",
    \\"recurring\\": false,
    \\"reference\\": \\"usage_$(date +%s)\\"
  }"` },
    ],
  },
  {
    id: 'js', label: 'JavaScript', icon: 'js',
    sections: [
      { title: 'One-time payment', code:
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

// amount either comes from the shopper, or is a price you already know:
const amount = Number(req.body.amount);   // whatever the shopper typed in (a donation)
// const amount = selectedItem.price;      // a fixed price you already know (a product)
const payment = await createPayment({ amount, email: req.body.email });
// res.redirect(payment.authorization_url);` },
      { title: 'Wire it to the Buy button (intelligence.html)', code:
`// intelligence.html's Buy button (Step 2 above) POSTs to exactly this
// route -- amountInput/emailInput are its real field ids. Express shown
// here; any Node framework (Fastify, Koa, raw http) mounts the same way.
import express from "express";
const app = express();
app.use(express.json());

app.post("/api/create-payment", async (req, res) => {
  const payment = await createPayment({ amount: req.body.amount, email: req.body.email });
  res.json(payment);
});

app.listen(3000, () => console.log("Backend running on http://localhost:3000"));` },
      { title: 'Recurring subscription', code:
`// A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
// Creates a session; the customer authorizes once in the checkout popup,
// Konduyt then charges the same amount automatically every interval.
async function createSubscriptionSession() {
  const res = await fetch("{{API}}/v1/payment_sessions", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${KONDUYT_SECRET_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 100000, currency: "KES",
      recurring: true, interval: "monthly",
      reference: "sub_pro_plan",
    }),
  });
  return res.json(); // { id: "sess_...", ... }
}

// Client-side, once you have the session id:
// Konduyt.checkout({ sessionId: session.id })` },
      { title: 'Split payment', code:
`// One checkout, proceeds split across sellers using the provider's own
// real split capability -- Konduyt never holds or redistributes funds.
// Register each seller once first (see the dashboard's Payment Providers tab).
async function createSplitPayment({ amount, sellerId, sellerAmount }) {
  const res = await fetch("{{API}}/v1/marketplace_payments", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${KONDUYT_SECRET_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "paystack", amount, currency: "KES",
      splits: [{ seller_id: sellerId, amount: sellerAmount }],
    }),
  });
  return res.json();
}
// The remainder (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`// amount is computed from real usage, not typed in or fixed -- e.g.
// metered API calls, storage, or minutes used this billing period.
async function createUsageBillSession(unitsUsed, pricePerUnit) {
  const amount = unitsUsed * pricePerUnit;

  const res = await fetch("{{API}}/v1/payment_sessions", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${KONDUYT_SECRET_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount, currency: "KES", recurring: false,
      reference: \`usage_\${Date.now()}\`,
    }),
  });
  return res.json();
}
// e.g. createUsageBillSession(340, 25) -- 340 real units at 25 each` },
    ],
  },
  {
    id: 'python', label: 'Python', icon: 'python',
    sections: [
      { title: 'Dependency', code: `pip install requests` },
      { title: 'One-time payment', code:
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

# amount either comes from the shopper, or is a price you already know:
amount = int(request.form["amount"])   # whatever the shopper typed in (a donation)
# amount = selected_item.price          # a fixed price you already know (a product)
payment = create_payment(amount, request.form["email"])` },
      { title: 'Wire it to the Buy button (intelligence.html)', code:
`# intelligence.html's Buy button (Step 2 above) POSTs to exactly this
# route -- amountInput/emailInput are its real field ids. Flask shown
# here; FastAPI/Django mount the same route the same way.
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route("/api/create-payment", methods=["POST"])
def handle_create_payment():
    body = request.get_json()
    payment = create_payment(body["amount"], body["email"])
    return jsonify(payment)

if __name__ == "__main__":
    app.run(port=3000)
    print("Backend running on http://localhost:3000")` },
      { title: 'Recurring subscription', code:
`# A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
# Creates a session; the customer authorizes once in the checkout popup,
# Konduyt then charges the same amount automatically every interval.
def create_subscription_session():
    res = requests.post(
        "{{API}}/v1/payment_sessions",
        headers={"Authorization": f"Bearer {KONDUYT_SECRET_KEY}"},
        json={
            "amount": 100000, "currency": "KES",
            "recurring": True, "interval": "monthly",
            "reference": "sub_pro_plan",
        },
    )
    return res.json()  # {"id": "sess_...", ...}

# Client-side, once you have the session id:
# Konduyt.checkout({ sessionId: session.id })` },
      { title: 'Split payment', code:
`# One checkout, proceeds split across sellers using the provider's own
# real split capability -- Konduyt never holds or redistributes funds.
# Register each seller once first (see the dashboard's Payment Providers tab).
def create_split_payment(amount, seller_id, seller_amount):
    res = requests.post(
        "{{API}}/v1/marketplace_payments",
        headers={"Authorization": f"Bearer {KONDUYT_SECRET_KEY}"},
        json={
            "provider": "paystack", "amount": amount, "currency": "KES",
            "splits": [{"seller_id": seller_id, "amount": seller_amount}],
        },
    )
    return res.json()
# The remainder (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`# amount is computed from real usage, not typed in or fixed -- e.g.
# metered API calls, storage, or minutes used this billing period.
import time

def create_usage_bill_session(units_used, price_per_unit):
    amount = units_used * price_per_unit
    res = requests.post(
        "{{API}}/v1/payment_sessions",
        headers={"Authorization": f"Bearer {KONDUYT_SECRET_KEY}"},
        json={
            "amount": amount, "currency": "KES", "recurring": False,
            "reference": f"usage_{int(time.time())}",
        },
    )
    return res.json()
# e.g. create_usage_bill_session(340, 25) -- 340 real units at 25 each` },
    ],
  },
  {
    id: 'php', label: 'PHP', icon: 'php',
    sections: [
      { title: 'One-time payment', code:
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

// amount either comes from the shopper, or is a price you already know:
$amount = (int) $_POST["amount"];       // whatever the shopper typed in (a donation)
// $amount = $selectedItem["price"];    // a fixed price you already know (a product)
$payment = create_payment($secret, $amount, $_POST["email"]);` },
      { title: 'Wire it to the Buy button (intelligence.html)', code:
`<?php
// intelligence.html's Buy button (Step 2 above) POSTs to exactly this
// path -- amountInput/emailInput are its real field ids. No framework
// needed: PHP's built-in server routes by file/path natively.
// Save as api/create-payment.php, run: php -S localhost:3000
$body = json_decode(file_get_contents("php://input"), true);
header("Content-Type: application/json");
echo json_encode(create_payment($secret, (int) $body["amount"], $body["email"]));` },
      { title: 'Recurring subscription', code:
`<?php
// A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
// Creates a session; the customer authorizes once in the checkout popup,
// Konduyt then charges the same amount automatically every interval.
function create_subscription_session($secret) {
    $ch = curl_init("{{API}}/v1/payment_sessions");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $secret,
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            "amount" => 100000, "currency" => "KES",
            "recurring" => true, "interval" => "monthly",
            "reference" => "sub_pro_plan",
        ]),
    ]);
    $session = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $session; // ["id" => "sess_...", ...]
}
// Client-side, once you have the session id:
// Konduyt.checkout({ sessionId: session.id })` },
      { title: 'Split payment', code:
`<?php
// One checkout, proceeds split across sellers using the provider's own
// real split capability -- Konduyt never holds or redistributes funds.
// Register each seller once first (see the dashboard's Payment Providers tab).
function create_split_payment($secret, $amount, $sellerId, $sellerAmount) {
    $ch = curl_init("{{API}}/v1/marketplace_payments");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $secret,
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            "provider" => "paystack", "amount" => $amount, "currency" => "KES",
            "splits" => [["seller_id" => $sellerId, "amount" => $sellerAmount]],
        ]),
    ]);
    $payment = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $payment;
}
// The remainder (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`<?php
// amount is computed from real usage, not typed in or fixed -- e.g.
// metered API calls, storage, or minutes used this billing period.
function create_usage_bill_session($secret, $unitsUsed, $pricePerUnit) {
    $amount = $unitsUsed * $pricePerUnit;
    $ch = curl_init("{{API}}/v1/payment_sessions");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $secret,
            "Content-Type: application/json",
        ],
        CURLOPT_POSTFIELDS => json_encode([
            "amount" => $amount, "currency" => "KES", "recurring" => false,
            "reference" => "usage_" . time(),
        ]),
    ]);
    $session = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $session;
}
// e.g. create_usage_bill_session($secret, 340, 25) -- 340 real units at 25 each` },
    ],
  },
  {
    id: 'go', label: 'Go', icon: 'go',
    sections: [
      { title: 'One-time payment', code:
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
	// amount either comes from the shopper, or is a price you already know --
	// pass whichever one applies as the amount parameter above.
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
      { title: 'Wire it to the Buy button (intelligence.html)', code:
`// intelligence.html's Buy button (Step 2 above) POSTs to exactly this
// route -- amountInput/emailInput are its real field ids. net/http shown
// here (no framework needed); Gin/Echo mount the same route the same way.
func main() {
	http.HandleFunc("/api/create-payment", func(w http.ResponseWriter, r *http.Request) {
		var in struct {
			Amount int    ` + "`json:\"amount\"`" + `
			Email  string ` + "`json:\"email\"`" + `
		}
		json.NewDecoder(r.Body).Decode(&in)
		payment, _ := createPayment(in.Amount, in.Email)
		json.NewEncoder(w).Encode(payment)
	})

	fmt.Println("Backend running on http://localhost:3000")
	http.ListenAndServe(":3000", nil)
}` },
      { title: 'Recurring subscription', code:
`// A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
// Creates a session; the customer authorizes once in the checkout popup,
// Konduyt then charges the same amount automatically every interval.
func createSubscriptionSession() (map[string]any, error) {
	body, _ := json.Marshal(map[string]any{
		"amount": 100000, "currency": "KES",
		"recurring": true, "interval": "monthly",
		"reference": "sub_pro_plan",
	})

	req, _ := http.NewRequest("POST", "{{API}}/v1/payment_sessions", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+konduytSecret)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var session map[string]any
	json.NewDecoder(res.Body).Decode(&session) // {"id": "sess_...", ...}
	return session, nil
}
// Client-side, once you have the session id:
// Konduyt.checkout({ sessionId: session.id })` },
      { title: 'Split payment', code:
`// One checkout, proceeds split across sellers using the provider's own
// real split capability -- Konduyt never holds or redistributes funds.
// Register each seller once first (see the dashboard's Payment Providers tab).
func createSplitPayment(amount int, sellerID string, sellerAmount int) (map[string]any, error) {
	body, _ := json.Marshal(map[string]any{
		"provider": "paystack", "amount": amount, "currency": "KES",
		"splits": []map[string]any{{"seller_id": sellerID, "amount": sellerAmount}},
	})

	req, _ := http.NewRequest("POST", "{{API}}/v1/marketplace_payments", bytes.NewBuffer(body))
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
}
// The remainder (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`import "fmt"
import "time"

// amount is computed from real usage, not typed in or fixed -- e.g.
// metered API calls, storage, or minutes used this billing period.
func createUsageBillSession(unitsUsed int, pricePerUnit int) (map[string]any, error) {
	amount := unitsUsed * pricePerUnit
	body, _ := json.Marshal(map[string]any{
		"amount": amount, "currency": "KES", "recurring": false,
		"reference": fmt.Sprintf("usage_%d", time.Now().Unix()),
	})

	req, _ := http.NewRequest("POST", "{{API}}/v1/payment_sessions", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+konduytSecret)
	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var session map[string]any
	json.NewDecoder(res.Body).Decode(&session)
	return session, nil
}
// e.g. createUsageBillSession(340, 25) -- 340 real units at 25 each` },
    ],
  },
  {
    id: 'ruby', label: 'Ruby', icon: 'ruby',
    sections: [
      { title: 'One-time payment', code:
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

# amount either comes from the shopper, or is a price you already know:
amount = params[:amount].to_i     # whatever the shopper typed in (a donation)
# amount = selected_item.price    # a fixed price you already know (a product)
payment = create_payment(amount, params[:email])` },
      { title: 'Wire it to the Buy button (intelligence.html)', code:
`# intelligence.html's Buy button (Step 2 above) POSTs to exactly this
# route -- amountInput/emailInput are its real field ids. Sinatra shown
# here (gem install sinatra); Rails mounts the same route the same way.
require "sinatra"
require "json"

post "/api/create-payment" do
  body = JSON.parse(request.body.read)
  payment = create_payment(body["amount"], body["email"])
  content_type :json
  payment.to_json
end
# Run: ruby server.rb -- backend on http://localhost:3000` },
      { title: 'Recurring subscription', code:
`# A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
# Creates a session; the customer authorizes once in the checkout popup,
# Konduyt then charges the same amount automatically every interval.
def create_subscription_session
  uri = URI("{{API}}/v1/payment_sessions")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer #{KONDUYT_SECRET_KEY}"
  req["Content-Type"] = "application/json"
  req.body = {
    amount: 100000, currency: "KES",
    recurring: true, interval: "monthly",
    reference: "sub_pro_plan",
  }.to_json

  JSON.parse(http.request(req).body) # {"id" => "sess_...", ...}
end
# Client-side, once you have the session id:
# Konduyt.checkout({ sessionId: session.id })` },
      { title: 'Split payment', code:
`# One checkout, proceeds split across sellers using the provider's own
# real split capability -- Konduyt never holds or redistributes funds.
# Register each seller once first (see the dashboard's Payment Providers tab).
def create_split_payment(amount, seller_id, seller_amount)
  uri = URI("{{API}}/v1/marketplace_payments")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer #{KONDUYT_SECRET_KEY}"
  req["Content-Type"] = "application/json"
  req.body = {
    provider: "paystack", amount: amount, currency: "KES",
    splits: [{ seller_id: seller_id, amount: seller_amount }],
  }.to_json

  JSON.parse(http.request(req).body)
end
# The remainder (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`# amount is computed from real usage, not typed in or fixed -- e.g.
# metered API calls, storage, or minutes used this billing period.
def create_usage_bill_session(units_used, price_per_unit)
  amount = units_used * price_per_unit
  uri = URI("{{API}}/v1/payment_sessions")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  req = Net::HTTP::Post.new(uri)
  req["Authorization"] = "Bearer #{KONDUYT_SECRET_KEY}"
  req["Content-Type"] = "application/json"
  req.body = {
    amount: amount, currency: "KES", recurring: false,
    reference: "usage_#{Time.now.to_i}",
  }.to_json

  JSON.parse(http.request(req).body)
end
# e.g. create_usage_bill_session(340, 25) -- 340 real units at 25 each` },
    ],
  },
  {
    id: 'rust', label: 'Rust', icon: 'rust',
    sections: [
      { title: 'Dependency (Cargo.toml)', code:
`[dependencies]
reqwest = { version = "0.12", features = ["json", "blocking"] }
serde_json = "1"` },
      { title: 'One-time payment', code:
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
}
// amount either comes from the shopper, or is a price you already know --
// pass whichever one applies as the amount parameter above.` },
      { title: 'Wire it to the Buy button (intelligence.html)', code:
`// intelligence.html's Buy button (Step 2 above) POSTs to exactly this
// route -- amountInput/emailInput are its real field ids. tiny_http shown
// here (cargo add tiny_http); Actix/Axum mount the same route the same way.
use tiny_http::{Server, Response, Method};
use std::io::Read;

fn main() {
    let server = Server::http("0.0.0.0:3000").unwrap();
    println!("Backend running on http://localhost:3000");

    for mut request in server.incoming_requests() {
        if request.method() != &Method::Post || request.url() != "/api/create-payment" {
            request.respond(Response::from_string("").with_status_code(404)).ok();
            continue;
        }
        let mut body_str = String::new();
        request.as_reader().read_to_string(&mut body_str).ok();
        let body: serde_json::Value = serde_json::from_str(&body_str).unwrap_or(json!({}));

        let amount = body["amount"].as_u64().unwrap_or(0);
        let email = body["email"].as_str().unwrap_or("");
        let payment = create_payment(amount, email).unwrap();
        request.respond(Response::from_string(payment.to_string())).ok();
    }
}` },
      { title: 'Recurring subscription', code:
`// A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
// Creates a session; the customer authorizes once in the checkout popup,
// Konduyt then charges the same amount automatically every interval.
fn create_subscription_session() -> Result<serde_json::Value, reqwest::Error> {
    let secret = env::var("KONDUYT_SECRET_KEY").expect("KONDUYT_SECRET_KEY not set");
    let client = reqwest::blocking::Client::new();
    client
        .post("{{API}}/v1/payment_sessions")
        .bearer_auth(secret)
        .json(&json!({
            "amount": 100000, "currency": "KES",
            "recurring": true, "interval": "monthly",
            "reference": "sub_pro_plan"
        }))
        .send()?
        .json() // {"id": "sess_...", ...}
}
// Client-side, once you have the session id:
// Konduyt.checkout({ sessionId: session.id })` },
      { title: 'Split payment', code:
`// One checkout, proceeds split across sellers using the provider's own
// real split capability -- Konduyt never holds or redistributes funds.
// Register each seller once first (see the dashboard's Payment Providers tab).
fn create_split_payment(amount: u64, seller_id: &str, seller_amount: u64) -> Result<serde_json::Value, reqwest::Error> {
    let secret = env::var("KONDUYT_SECRET_KEY").expect("KONDUYT_SECRET_KEY not set");
    let client = reqwest::blocking::Client::new();
    client
        .post("{{API}}/v1/marketplace_payments")
        .bearer_auth(secret)
        .json(&json!({
            "provider": "paystack", "amount": amount, "currency": "KES",
            "splits": [{ "seller_id": seller_id, "amount": seller_amount }]
        }))
        .send()?
        .json()
}
// The remainder (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`use std::time::{SystemTime, UNIX_EPOCH};

// amount is computed from real usage, not typed in or fixed -- e.g.
// metered API calls, storage, or minutes used this billing period.
fn create_usage_bill_session(units_used: u64, price_per_unit: u64) -> Result<serde_json::Value, reqwest::Error> {
    let amount = units_used * price_per_unit;
    let secret = env::var("KONDUYT_SECRET_KEY").expect("KONDUYT_SECRET_KEY not set");
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let client = reqwest::blocking::Client::new();
    client
        .post("{{API}}/v1/payment_sessions")
        .bearer_auth(secret)
        .json(&json!({
            "amount": amount, "currency": "KES", "recurring": false,
            "reference": format!("usage_{}", now)
        }))
        .send()?
        .json()
}
// e.g. create_usage_bill_session(340, 25) -- 340 real units at 25 each` },
    ],
  },
  {
    id: 'csharp', label: 'C#', icon: 'csharp',
    sections: [
      { title: 'One-time payment', code:
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
}
// amount either comes from the shopper, or is a price you already know --
// pass whichever one applies as the amount parameter above.` },
      { title: 'Wire it to the Buy button (intelligence.html)', code:
`// intelligence.html's Buy button (Step 2 above) POSTs to exactly this
// route -- amountInput/emailInput are its real field ids. ASP.NET Core
// minimal API shown here (dotnet new web); MVC controllers mount the
// same route the same way.
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapPost("/api/create-payment", async (HttpRequest req) => {
    var body = await JsonSerializer.DeserializeAsync<JsonElement>(req.Body);
    var amount = body.GetProperty("amount").GetInt32();
    var email = body.GetProperty("email").GetString();
    var payment = await CreatePayment(amount, email);
    return Results.Content(payment, "application/json");
});

app.Urls.Add("http://localhost:3000");
app.Run();` },
      { title: 'Recurring subscription', code:
`// A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
// Creates a session; the customer authorizes once in the checkout popup,
// Konduyt then charges the same amount automatically every interval.
async Task<string> CreateSubscriptionSession() {
    var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", secret);

    var body = new StringContent(JsonSerializer.Serialize(new {
        amount = 100000, currency = "KES",
        recurring = true, interval = "monthly",
        reference = "sub_pro_plan"
    }), Encoding.UTF8, "application/json");

    var res = await client.PostAsync("{{API}}/v1/payment_sessions", body);
    return await res.Content.ReadAsStringAsync(); // { "id": "sess_...", ... }
}
// Client-side, once you have the session id:
// Konduyt.checkout({ sessionId: session.id })` },
      { title: 'Split payment', code:
`// One checkout, proceeds split across sellers using the provider's own
// real split capability -- Konduyt never holds or redistributes funds.
// Register each seller once first (see the dashboard's Payment Providers tab).
async Task<string> CreateSplitPayment(int amount, string sellerId, int sellerAmount) {
    var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", secret);

    var body = new StringContent(JsonSerializer.Serialize(new {
        provider = "paystack", amount, currency = "KES",
        splits = new[] { new { seller_id = sellerId, amount = sellerAmount } }
    }), Encoding.UTF8, "application/json");

    var res = await client.PostAsync("{{API}}/v1/marketplace_payments", body);
    return await res.Content.ReadAsStringAsync();
}
// The remainder (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`// amount is computed from real usage, not typed in or fixed -- e.g.
// metered API calls, storage, or minutes used this billing period.
async Task<string> CreateUsageBillSession(int unitsUsed, int pricePerUnit) {
    int amount = unitsUsed * pricePerUnit;
    var client = new HttpClient();
    client.DefaultRequestHeaders.Authorization =
        new AuthenticationHeaderValue("Bearer", secret);

    var body = new StringContent(JsonSerializer.Serialize(new {
        amount, currency = "KES", recurring = false,
        reference = $"usage_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}"
    }), Encoding.UTF8, "application/json");

    var res = await client.PostAsync("{{API}}/v1/payment_sessions", body);
    return await res.Content.ReadAsStringAsync();
}
// e.g. CreateUsageBillSession(340, 25) -- 340 real units at 25 each` },
    ],
  },
  {
    id: 'java', label: 'Java (Android Studio)', icon: 'java', platform: 'Android',
    sections: [
      { title: 'Dependency (app/build.gradle)', code:
`dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
}

// AndroidManifest.xml — allow internet
// <uses-permission android:name="android.permission.INTERNET" />` },
      { title: 'MainActivity.java — wired to activity_main.xml (Step 2 above)', code:
`// app/src/main/java/.../MainActivity.java
//
// The secret key must live on YOUR server, never inside the Android app --
// anything shipped in the APK can be extracted, including a value injected
// via BuildConfig at build time. There is no safe way to hold
// KONDUYT_SECRET_KEY on-device. This Activity calls YOUR OWN backend
// endpoint below; that backend (in Node, Python, or whatever you run --
// see the other language tabs here for what it does with this) holds
// KONDUYT_SECRET_KEY and is the only thing that ever calls Konduyt directly.
package com.example.konduytdemo;

import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import okhttp3.*;
import java.io.IOException;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {
    // Your own backend, from the Android emulator -- not Konduyt directly.
    private static final String BACKEND = "http://10.0.2.2:3000";

    private EditText amountInput;
    private EditText emailInput;
    private TextView resultText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main); // Step 2's real activity_main.xml

        // These ids come straight from activity_main.xml above --
        // change one there and this line breaks, on purpose.
        amountInput = findViewById(R.id.amountInput);
        emailInput = findViewById(R.id.emailInput);
        resultText = findViewById(R.id.resultText);

        Button buyButton = findViewById(R.id.buyButton);
        buyButton.setOnClickListener(v -> {
            // amount either comes from the shopper (typed into amountInput,
            // a donation), or is a fixed price you already know (a product)
            // -- same field either way.
            int amount = Integer.parseInt(amountInput.getText().toString());
            String email = emailInput.getText().toString();
            createPayment(amount, email);
        });
    }

    void createPayment(int amount, String email) {
        OkHttpClient client = new OkHttpClient();
        Executors.newSingleThreadExecutor().execute(() -> {
            String json = "{"
                + "\\"amount\\": " + amount + ","
                + "\\"email\\": \\"" + email + "\\""
                + "}";

            // Your own backend, not Konduyt -- POST /api/create-payment,
            // the exact route every backend language tab implements.
            Request request = new Request.Builder()
                .url(BACKEND + "/api/create-payment")
                .post(RequestBody.create(json, MediaType.parse("application/json")))
                .build();

            try (Response response = client.newCall(request).execute()) {
                String payment = response.body().string();
                // your backend returns whatever Konduyt gave it -- update
                // resultText on the main thread, or open authorization_url
                // in a Chrome Custom Tab
                runOnUiThread(() -> resultText.setText(payment));
            } catch (IOException e) {
                runOnUiThread(() -> resultText.setText("Could not reach your backend -- is it running?"));
            }
        });
    }
}` },
      { title: 'Recurring subscription — call YOUR backend', code:
`// A fixed subscription price -- your backend creates the real Konduyt
// session (recurring: true) using its own secret key; your app only ever
// talks to your own endpoint below, then opens the checkout it gets back.
// Wire this into the same MainActivity above (e.g. a second button).
void createSubscription(String email) throws IOException {
    OkHttpClient client = new OkHttpClient();
    String json = "{\\"email\\": \\"" + email + "\\", \\"plan\\": \\"pro_monthly\\"}";

    Request request = new Request.Builder()
        .url(BACKEND + "/api/create-subscription")
        .post(RequestBody.create(json, MediaType.parse("application/json")))
        .build();

    try (Response response = client.newCall(request).execute()) {
        String session = response.body().string();
        // your backend returns the real Konduyt session id --
        // open Konduyt's checkout with it in a Chrome Custom Tab
    }
}` },
      { title: 'Split payment — call YOUR backend', code:
`// Your backend creates the real split payment via Konduyt's
// /v1/marketplace_payments (see the other language tabs); your app only
// ever sends what it split for, never a Konduyt key.
void createSplitPurchase(int amount, String sellerId, String email) throws IOException {
    OkHttpClient client = new OkHttpClient();
    String json = "{\\"amount\\": " + amount + ", \\"sellerId\\": \\"" + sellerId
        + "\\", \\"email\\": \\"" + email + "\\"}";

    Request request = new Request.Builder()
        .url(BACKEND + "/api/create-split-payment")
        .post(RequestBody.create(json, MediaType.parse("application/json")))
        .build();

    try (Response response = client.newCall(request).execute()) {
        String payment = response.body().string();
    }
}` },
      { title: 'Pay-as-you-go — call YOUR backend', code:
`// Your backend computes the real bill from usage it already tracks
// server-side, and creates the real Konduyt session -- your app just asks
// "what do I owe right now", never sends an amount it computed itself.
void requestUsageBill(String userId) throws IOException {
    OkHttpClient client = new OkHttpClient();
    String json = "{\\"userId\\": \\"" + userId + "\\"}";

    Request request = new Request.Builder()
        .url(BACKEND + "/api/create-usage-bill")
        .post(RequestBody.create(json, MediaType.parse("application/json")))
        .build();

    try (Response response = client.newCall(request).execute()) {
        String session = response.body().string();
        // open Konduyt's checkout with the returned session id
    }
}` },
    ],
  },
  {
    id: 'kotlin', label: 'Kotlin (Android Studio)', icon: 'kotlin', platform: 'Android',
    sections: [
      { title: 'Dependency (app/build.gradle.kts)', code:
`dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}

// AndroidManifest.xml
// <uses-permission android:name="android.permission.INTERNET" />` },
      { title: 'MainActivity.kt — wired to activity_main.xml (Step 2 above)', code:
`// app/src/main/java/.../MainActivity.kt
//
// The secret key must live on YOUR server, never inside the Android app --
// anything shipped in the APK can be extracted, including a value injected
// via BuildConfig at build time. There is no safe way to hold
// KONDUYT_SECRET_KEY on-device. This Activity calls YOUR OWN backend
// endpoint below; that backend holds KONDUYT_SECRET_KEY (see the other
// language tabs here for what it does with this) and is the only thing
// that ever calls Konduyt directly.
package com.example.konduytdemo

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

class MainActivity : AppCompatActivity() {
    // Your own backend, from the Android emulator -- not Konduyt directly.
    private val backend = "http://10.0.2.2:3000"

    private lateinit var amountInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var resultText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main) // Step 2's real activity_main.xml

        // These ids come straight from activity_main.xml above --
        // change one there and this line breaks, on purpose.
        amountInput = findViewById(R.id.amountInput)
        emailInput = findViewById(R.id.emailInput)
        resultText = findViewById(R.id.resultText)

        findViewById<Button>(R.id.buyButton).setOnClickListener {
            // amount either comes from the shopper (typed into amountInput,
            // a donation), or is a fixed price you already know (a product)
            // -- same field either way.
            val amount = amountInput.text.toString().toInt()
            val email = emailInput.text.toString()
            createPayment(amount, email)
        }
    }

    fun createPayment(amount: Int, email: String) {
        CoroutineScope(Dispatchers.IO).launch {
            val client = OkHttpClient()
            val json = "application/json".toMediaType()
            val payload = """{ "amount": $amount, "email": "$email" }"""

            // Your own backend, not Konduyt -- POST /api/create-payment,
            // the exact route every backend language tab implements.
            val request = Request.Builder()
                .url("$backend/api/create-payment")
                .post(payload.toRequestBody(json))
                .build()

            try {
                client.newCall(request).execute().use { res ->
                    val payment = res.body?.string()
                    withContext(Dispatchers.Main) { resultText.text = payment }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { resultText.text = "Could not reach your backend -- is it running?" }
            }
        }
    }
}` },
      { title: 'Recurring subscription — call YOUR backend', code:
`// A fixed subscription price -- your backend creates the real Konduyt
// session (recurring: true) using its own secret key; your app only ever
// talks to your own endpoint below, then opens the checkout it gets back.
// Wire this into the same MainActivity above (e.g. a second button).
fun createSubscription(email: String) {
    val client = OkHttpClient()
    val json = """{ "email": "$email", "plan": "pro_monthly" }""".trimIndent()

    val request = Request.Builder()
        .url("$backend/api/create-subscription")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    client.newCall(request).execute().use { response ->
        val session = response.body?.string()
        // your backend returns the real Konduyt session id --
        // open Konduyt's checkout with it in a Chrome Custom Tab
    }
}` },
      { title: 'Split payment — call YOUR backend', code:
`// Your backend creates the real split payment via Konduyt's
// /v1/marketplace_payments (see the other language tabs); your app only
// ever sends what it split for, never a Konduyt key.
fun createSplitPurchase(amount: Int, sellerId: String, email: String) {
    val client = OkHttpClient()
    val json = """{ "amount": $amount, "sellerId": "$sellerId", "email": "$email" }""".trimIndent()

    val request = Request.Builder()
        .url("$backend/api/create-split-payment")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    client.newCall(request).execute().use { response ->
        val payment = response.body?.string()
    }
}` },
      { title: 'Pay-as-you-go — call YOUR backend', code:
`// Your backend computes the real bill from usage it already tracks
// server-side, and creates the real Konduyt session -- your app just asks
// "what do I owe right now", never sends an amount it computed itself.
fun requestUsageBill(userId: String) {
    val client = OkHttpClient()
    val json = """{ "userId": "$userId" }""".trimIndent()

    val request = Request.Builder()
        .url("$backend/api/create-usage-bill")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    client.newCall(request).execute().use { response ->
        val session = response.body?.string()
        // open Konduyt's checkout with the returned session id
    }
}` },
    ],
  },
  {
    id: 'swift', label: 'Swift', icon: 'swift', platform: 'iOS',
    sections: [
      { title: 'ViewController.swift — wired to Main.storyboard (Step 2 above)', code:
`// ViewController.swift
//
// The secret key must live on YOUR server, never inside the iOS app --
// anything shipped in the binary can be extracted, including a value
// injected via Info.plist at build time. There is no safe way to hold
// KONDUYT_SECRET_KEY on-device. This ViewController calls YOUR OWN backend
// endpoint below; that backend holds KONDUYT_SECRET_KEY (see the other
// language tabs here for what it does with this) and is the only thing
// that ever calls Konduyt directly.
//
// customClass="ViewController" in Main.storyboard is what makes iOS
// instantiate THIS class for that scene -- the @IBOutlet/@IBAction names
// below must match the storyboard's ids/selector exactly, or the app
// crashes at launch with an unrecognized-selector error.
import UIKit

class ViewController: UIViewController {
    // These match Main.storyboard's ids exactly -- amountField, emailField,
    // resultLabel. Connect each in Interface Builder by ctrl-dragging from
    // the storyboard element to these properties.
    @IBOutlet weak var amountField: UITextField!
    @IBOutlet weak var emailField: UITextField!
    @IBOutlet weak var resultLabel: UILabel!

    // Your own backend, from the iOS Simulator -- not Konduyt directly.
    let backend = "http://localhost:3000"

    // Matches the storyboard's action selector "createPaymentTapped:"
    // exactly, connected to buyButton's Touch Up Inside event.
    @IBAction func createPaymentTapped(_ sender: Any) {
        // amount either comes from the shopper (typed into amountField, a
        // donation), or is a fixed price you already know (a product) --
        // same field either way.
        let amount = Int(amountField.text ?? "") ?? 0
        let email = emailField.text ?? ""
        Task { await createPayment(amount: amount, email: email) }
    }

    func createPayment(amount: Int, email: String) async {
        // Your own backend, not Konduyt -- POST /api/create-payment,
        // the exact route every backend language tab implements.
        var request = URLRequest(url: URL(string: "\\(backend)/api/create-payment")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["amount": amount, "email": email])

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            // your backend returns whatever Konduyt gave it
            resultLabel.text = String(data: data, encoding: .utf8) ?? ""
        } catch {
            resultLabel.text = "Could not reach your backend -- is it running?"
        }
    }
}
// e.g. try await createPayment(amount: selectedItem.price, email: email)` },
      { title: 'Recurring subscription — call YOUR backend', code:
`// A fixed subscription price -- your backend creates the real Konduyt
// session (recurring: true) using its own secret key; your app only ever
// talks to your own endpoint below, then opens the checkout it gets back.
// Wire this into the same ViewController above (e.g. a second button).
func createSubscription(email: String) async throws -> [String: Any] {
    var request = URLRequest(url: URL(string: "\\(backend)/api/create-subscription")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = ["email": email, "plan": "pro_monthly"]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, _) = try await URLSession.shared.data(for: request)
    // your backend returns the real Konduyt session id --
    // open Konduyt's checkout with it
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}` },
      { title: 'Split payment — call YOUR backend', code:
`// Your backend creates the real split payment via Konduyt's
// /v1/marketplace_payments (see the other language tabs); your app only
// ever sends what it split for, never a Konduyt key.
func createSplitPurchase(amount: Int, sellerId: String, email: String) async throws -> [String: Any] {
    var request = URLRequest(url: URL(string: "\\(backend)/api/create-split-payment")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = ["amount": amount, "sellerId": sellerId, "email": email]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, _) = try await URLSession.shared.data(for: request)
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}` },
      { title: 'Pay-as-you-go — call YOUR backend', code:
`// Your backend computes the real bill from usage it already tracks
// server-side, and creates the real Konduyt session -- your app just asks
// "what do I owe right now", never sends an amount it computed itself.
func requestUsageBill(userId: String) async throws -> [String: Any] {
    var request = URLRequest(url: URL(string: "\\(backend)/api/create-usage-bill")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: Any] = ["userId": userId]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, _) = try await URLSession.shared.data(for: request)
    // open Konduyt's checkout with the returned session id
    return try JSONSerialization.jsonObject(with: data) as! [String: Any]
}` },
    ],
  },
  {
    id: 'cpp', label: 'C++', icon: 'cpp',
    sections: [
      { title: 'Dependency', code:
`# Using libcurl (install via your package manager)
sudo apt-get install libcurl4-openssl-dev   # Debian/Ubuntu` },
      { title: 'One-time payment', code:
`#include <curl/curl.h>
#include <cstdlib>
#include <string>

void create_payment(long amount, const std::string& email) {
    // Read the key from the environment — never hardcode it.
    const char* secret = std::getenv("KONDUYT_SECRET_KEY");
    if (!secret) return;

    // amount either comes from the shopper, or is a price you already
    // know -- pass whichever one applies as the amount parameter above.
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
      { title: 'Wire it to the Buy button (intelligence.html)', code:
`// intelligence.html's Buy button (Step 2 above) POSTs to exactly this
// route -- amountInput/emailInput are its real field ids. cpp-httplib
// shown here (a single header, no framework needed).
#include <httplib.h>
#include <string>

int main() {
    httplib::Server svr;

    svr.Post("/api/create-payment", [](const httplib::Request& req, httplib::Response& res) {
        // Parsing req.body's real "amount"/"email" fields is left to a
        // JSON library of your choice -- create_payment above takes them.
        long amount = 5000; // parse from req.body in a real integration
        std::string email = "customer@example.com";
        create_payment(amount, email);
        res.set_content("{\\"status\\": \\"submitted\\"}", "application/json");
    });

    printf("Backend running on http://localhost:3000\\n");
    svr.listen("0.0.0.0", 3000);
}` },
      { title: 'Recurring subscription', code:
`#include <curl/curl.h>
#include <cstdlib>
#include <string>

// A fixed subscription price -- e.g. a Pro Plan at KES 1,000/month.
// Creates a session; the customer authorizes once in the checkout popup,
// Konduyt then charges the same amount automatically every interval.
void create_subscription_session() {
    const char* secret = std::getenv("KONDUYT_SECRET_KEY");
    if (!secret) return;

    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string body =
        "{\\"amount\\": 100000, \\"currency\\": \\"KES\\","
        " \\"recurring\\": true, \\"interval\\": \\"monthly\\","
        " \\"reference\\": \\"sub_pro_plan\\" }";

    std::string auth = "Authorization: Bearer " + std::string(secret);
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, auth.c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, "{{API}}/v1/payment_sessions");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_perform(curl); // response has {"id": "sess_...", ...}

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}
// Client-side, once you have the session id:
// Konduyt.checkout({ sessionId: session.id })` },
      { title: 'Split payment', code:
`#include <curl/curl.h>
#include <cstdlib>
#include <string>

// One checkout, proceeds split across sellers using the provider's own
// real split capability -- Konduyt never holds or redistributes funds.
// Register each seller once first (see the dashboard's Payment Providers tab).
void create_split_payment(long amount, const std::string& sellerId, long sellerAmount) {
    const char* secret = std::getenv("KONDUYT_SECRET_KEY");
    if (!secret) return;

    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string body =
        "{\\"provider\\": \\"paystack\\", \\"amount\\": " + std::to_string(amount) +
        ", \\"currency\\": \\"KES\\", \\"splits\\": [{ \\"seller_id\\": \\"" + sellerId +
        "\\", \\"amount\\": " + std::to_string(sellerAmount) + " }] }";

    std::string auth = "Authorization: Bearer " + std::string(secret);
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, auth.c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, "{{API}}/v1/marketplace_payments");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}
// The remainder (amount minus the splits) is your own commission.` },
      { title: 'Pay-as-you-go', code:
`#include <curl/curl.h>
#include <cstdlib>
#include <string>
#include <ctime>

// amount is computed from real usage, not typed in or fixed -- e.g.
// metered API calls, storage, or minutes used this billing period.
void create_usage_bill_session(long unitsUsed, long pricePerUnit) {
    const char* secret = std::getenv("KONDUYT_SECRET_KEY");
    if (!secret) return;

    long amount = unitsUsed * pricePerUnit;
    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string body =
        "{\\"amount\\": " + std::to_string(amount) +
        ", \\"currency\\": \\"KES\\", \\"recurring\\": false,"
        " \\"reference\\": \\"usage_" + std::to_string(std::time(nullptr)) + "\\" }";

    std::string auth = "Authorization: Bearer " + std::string(secret);
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, auth.c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, "{{API}}/v1/payment_sessions");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
}
// e.g. create_usage_bill_session(340, 25) -- 340 real units at 25 each` },
    ],
  },
];
