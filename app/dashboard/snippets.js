// Real integration snippets for the Home tab. Each is a genuine HTTP call to
// the live Konduyt test payment endpoint — no fictional SDK. {{SECRET}} and
// {{API}} are replaced at render time with the developer's real test key and
// the real API base URL.

export const LANGUAGES = [
  {
    id: 'curl',
    label: 'cURL',
    install: '# No install needed — just curl',
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
    id: 'javascript',
    label: 'JavaScript',
    install: 'npm install node-fetch  # (or use built-in fetch on Node 18+)',
    code: `const res = await fetch("{{API}}/v1/payments/test", {
  method: "POST",
  headers: {
    "Authorization": "Bearer {{SECRET}}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: 5000,
    currency: "KES",
    provider: "test",
    customer: { email: "customer@example.com" },
  }),
});

const payment = await res.json();
console.log(payment);`,
  },
  {
    id: 'python',
    label: 'Python',
    install: 'pip install requests',
    code: `import requests

res = requests.post(
    "{{API}}/v1/payments/test",
    headers={"Authorization": "Bearer {{SECRET}}"},
    json={
        "amount": 5000,
        "currency": "KES",
        "provider": "test",
        "customer": {"email": "customer@example.com"},
    },
)

print(res.json())`,
  },
  {
    id: 'php',
    label: 'PHP',
    install: '# Uses built-in cURL',
    code: `<?php
$ch = curl_init("{{API}}/v1/payments/test");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer {{SECRET}}",
    "Content-Type: application/json",
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "amount" => 5000,
    "currency" => "KES",
    "provider" => "test",
    "customer" => ["email" => "customer@example.com"],
]));

echo curl_exec($ch);`,
  },
  {
    id: 'go',
    label: 'Go',
    install: '# Uses standard library',
    code: `package main

import (
    "bytes"
    "fmt"
    "io"
    "net/http"
)

func main() {
    body := []byte(\`{"amount":5000,"currency":"KES","provider":"test","customer":{"email":"customer@example.com"}}\`)
    req, _ := http.NewRequest("POST", "{{API}}/v1/payments/test", bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer {{SECRET}}")
    req.Header.Set("Content-Type", "application/json")

    res, _ := http.DefaultClient.Do(req)
    defer res.Body.Close()
    out, _ := io.ReadAll(res.Body)
    fmt.Println(string(out))
}`,
  },
];
