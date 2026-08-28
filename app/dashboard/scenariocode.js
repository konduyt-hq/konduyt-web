// Real code shown in the Preview Checkouts tab's in-dashboard code viewer --
// mirrors the actual source of the two deployed example storefronts
// (konduyt-test-recurring-subscription / konduyt-test-onetime-purchase).
//
// Server-side files are shown per-language: the same real API calls
// (POST /v1/payment_sessions, POST /v1/payments), written idiomatically in
// each language, not a mechanical syntax swap. Client-side files (the
// browser HTML/JS) are NOT language-switchable -- a browser only runs
// JavaScript, so "your backend language" has no bearing on that file; it's
// shown once, as-is, regardless of which server language is selected.

export const RECURRING_SERVER_CODE = {
  js: `// server.js -- Node.js + Express
const express = require('express');
const app = express();

const SECRET_KEY = process.env.KONDUYT_SECRET_KEY;

app.post('/create-session', async (req, res) => {
  const r = await fetch('https://konduyt-api.onrender.com/v1/payment_sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${SECRET_KEY}\`,
    },
    body: JSON.stringify({
      amount: 1000000,        // minor units
      currency: 'KES',
      recurring: true,        // declared server-side -- the browser can't set this
      interval: 'monthly',
      reference: \`sub_\${Date.now()}\`,
    }),
  });
  const data = await r.json();
  res.json(data);             // browser only ever gets { session_id, expires_at }
});

app.listen(3001);`,

  python: `# server.py -- Flask
import os
import time
import requests
from flask import Flask, jsonify

app = Flask(__name__)
SECRET_KEY = os.environ["KONDUYT_SECRET_KEY"]

@app.route("/create-session", methods=["POST"])
def create_session():
    r = requests.post(
        "https://konduyt-api.onrender.com/v1/payment_sessions",
        headers={"Authorization": f"Bearer {SECRET_KEY}"},
        json={
            "amount": 1000000,        # minor units
            "currency": "KES",
            "recurring": True,        # declared server-side -- the browser can't set this
            "interval": "monthly",
            "reference": f"sub_{int(time.time())}",
        },
    )
    return jsonify(r.json())          # browser only ever gets { session_id, expires_at }

if __name__ == "__main__":
    app.run(port=3001)`,

  cpp: `// server.cpp -- using libcurl for the HTTP call
// (a minimal illustration of the request; wire into whatever HTTP
// server framework -- Crow, Drogon, cpp-httplib -- handles /create-session)
#include <curl/curl.h>
#include <string>
#include <cstdlib>

std::string create_session() {
    CURL* curl = curl_easy_init();
    std::string response;

    const char* secret_key = std::getenv("KONDUYT_SECRET_KEY");
    std::string auth_header = std::string("Authorization: Bearer ") + secret_key;

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, auth_header.c_str());

    // amount: minor units, recurring: true declared server-side --
    // the browser can never set this.
    std::string body = R"({
        "amount": 1000000,
        "currency": "KES",
        "recurring": true,
        "interval": "monthly",
        "reference": "sub_from_cpp"
    })";

    curl_easy_setopt(curl, CURLOPT_URL, "https://konduyt-api.onrender.com/v1/payment_sessions");
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    // ... set CURLOPT_WRITEFUNCTION to capture the response into the response variable...
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return response;  // browser only ever gets { session_id, expires_at }
}`,
};

export const RECURRING_CLIENT_CODE = `<!-- public/index.html -->
<script src="https://konduyt.dev/konduyt.js"></script>
<script>
  document.getElementById('subBtn').addEventListener('click', async () => {
    const r = await fetch('/create-session', { method: 'POST' });
    const { session_id } = await r.json();

    Konduyt.checkout({
      sessionId: session_id,
      onSuccess: (result) => { /* subscription started */ },
      onClose: () => {},
    });
  });
</script>`;

export const ONETIME_SERVER_CODE = {
  js: `// server.js -- Node.js + Express
const express = require('express');
const app = express();
app.use(express.json());

const SECRET_KEY = process.env.KONDUYT_SECRET_KEY;

app.post('/create-charge', async (req, res) => {
  const { method } = req.body;   // which method the shopper picked in the popup
  const r = await fetch('https://konduyt-api.onrender.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${SECRET_KEY}\`,
    },
    body: JSON.stringify({
      amount: 499900,          // minor units -- from YOUR server's config, never the browser
      currency: 'KES',
      method,
    }),
  });
  const data = await r.json();
  res.json(data);
});

app.listen(3002);`,

  python: `# server.py -- Flask
import os
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)
SECRET_KEY = os.environ["KONDUYT_SECRET_KEY"]

@app.route("/create-charge", methods=["POST"])
def create_charge():
    method = request.json.get("method")  # which method the shopper picked in the popup
    r = requests.post(
        "https://konduyt-api.onrender.com/v1/payments",
        headers={"Authorization": f"Bearer {SECRET_KEY}"},
        json={
            "amount": 499900,   # minor units -- from YOUR server's config, never the browser
            "currency": "KES",
            "method": method,
        },
    )
    return jsonify(r.json())

if __name__ == "__main__":
    app.run(port=3002)`,

  cpp: `// server.cpp -- using libcurl for the HTTP call
#include <curl/curl.h>
#include <string>
#include <cstdlib>

std::string create_charge(const std::string& method) {
    CURL* curl = curl_easy_init();
    std::string response;

    const char* secret_key = std::getenv("KONDUYT_SECRET_KEY");
    std::string auth_header = std::string("Authorization: Bearer ") + secret_key;

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, auth_header.c_str());

    // amount: minor units, from YOUR server's own config -- never trusted
    // from the browser.
    std::string body = R"({"amount": 499900, "currency": "KES", "method": ")" + method + R"("})";

    curl_easy_setopt(curl, CURLOPT_URL, "https://konduyt-api.onrender.com/v1/payments");
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    // ... set CURLOPT_WRITEFUNCTION to capture the response into the response variable...
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return response;
}`,
};

export const ONETIME_CLIENT_CODE = `<!-- public/index.html -->
<script src="https://konduyt.dev/konduyt.js"></script>
<script>
  document.getElementById('buyBtn').addEventListener('click', () => {
    Konduyt.checkout({
      publishableKey: 'kdu_live_pub_xxx',   // safe in the browser
      amount: 499900,
      currency: 'KES',
      onSuccess: async (result) => {
        // your server creates the real charge -- see server-side tab
        await fetch('/create-charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: result.method }),
        });
      },
      onClose: () => {},
    });
  });
</script>`;

export const FAILOVER_SERVER_CODE = {
  js: `// server.js -- Node.js + Express
const express = require('express');
const app = express();

const SECRET_KEY = process.env.KONDUYT_SECRET_KEY;

app.post('/create-payment', async (req, res) => {
  // The key difference from a normal payment: pass 'method', not
  // 'provider'. This is what actually triggers real failover -- Konduyt
  // tries every provider configured for this method, in order, stopping
  // on success and only continuing on a genuinely SAFE failure. An
  // ambiguous outcome (timeout, unclear response) is never auto-retried.
  const r = await fetch('https://konduyt-api.onrender.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${SECRET_KEY}\`,
    },
    body: JSON.stringify({ amount: 500000, currency: 'KES', method: 'mpesa' }),
  });
  const data = await r.json();

  // Fetch it back to see the real routing_attempts -- which provider(s)
  // were tried, in what order, and why.
  const r2 = await fetch(\`https://konduyt-api.onrender.com/v1/payments/\${data.id}\`, {
    headers: { Authorization: \`Bearer \${SECRET_KEY}\` },
  });
  res.json(await r2.json());
});

app.listen(3003);`,

  python: `# server.py -- Flask
import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)
SECRET_KEY = os.environ["KONDUYT_SECRET_KEY"]

@app.route("/create-payment", methods=["POST"])
def create_payment():
    # 'method', not 'provider' -- this is what triggers real failover.
    r = requests.post(
        "https://konduyt-api.onrender.com/v1/payments",
        headers={"Authorization": f"Bearer {SECRET_KEY}"},
        json={"amount": 500000, "currency": "KES", "method": "mpesa"},
    )
    data = r.json()

    # The real attempt history -- which provider(s), in what order, why.
    r2 = requests.get(
        f"https://konduyt-api.onrender.com/v1/payments/{data['id']}",
        headers={"Authorization": f"Bearer {SECRET_KEY}"},
    )
    return jsonify(r2.json())

if __name__ == "__main__":
    app.run(port=3003)`,

  cpp: `// server.cpp -- using libcurl for the HTTP calls
#include <curl/curl.h>
#include <string>
#include <cstdlib>

std::string create_payment() {
    CURL* curl = curl_easy_init();
    std::string response;

    const char* secret_key = std::getenv("KONDUYT_SECRET_KEY");
    std::string auth_header = std::string("Authorization: Bearer ") + secret_key;

    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, auth_header.c_str());

    // "method", not "provider" -- triggers real failover across every
    // provider configured for this method, stopping on success or on a
    // genuinely unsafe/ambiguous outcome, never guessing.
    std::string body = R"({"amount": 500000, "currency": "KES", "method": "mpesa"})";

    curl_easy_setopt(curl, CURLOPT_URL, "https://konduyt-api.onrender.com/v1/payments");
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    // ... set CURLOPT_WRITEFUNCTION to capture the response ...
    curl_easy_perform(curl);

    // A second GET to /v1/payments/{id} (same pattern, GET instead of POST)
    // returns the real routing_attempts history for display.

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return response;
}`,
};

export const FAILOVER_CLIENT_CODE = `<!-- public/index.html -->
<script>
  document.getElementById('buyBtn').addEventListener('click', async () => {
    const r = await fetch('/create-payment', { method: 'POST' });
    const data = await r.json();

    // data.routing_attempts: [{ attempt_number, provider, outcome, fallback_class }, ...]
    // Render each attempt -- which provider, what happened, safe or not.
    data.routing_attempts.forEach((attempt) => {
      console.log(attempt.attempt_number, attempt.provider, attempt.outcome);
    });
  });
</script>`;

// Which languages have a real server-side sample right now. The rest of
// LANG_SNIPPETS' languages (PHP, Go, Ruby, Rust, C#, Java, Kotlin, Swift)
// aren't written yet -- listed honestly as "coming soon" in the UI rather
// than silently missing or showing wrong/placeholder code.
export const SCENARIO_SERVER_LANGUAGES = ['js', 'python', 'cpp'];

