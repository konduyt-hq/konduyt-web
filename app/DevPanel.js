'use client';

import { useState } from 'react';

// ---- Universal test keys (fake, safe to show — no sign-up required) ----
const KEYS = {
  secret: 'kdu_test_secret_4f8Kd92MnQ7pXvR3sT6wY1bC5eH0jL8n',
  publishable: 'kdu_test_pub_9aB2cD4eF6gH8iJ0kL2mN4oP6qR8sT0u',
};

// ---- Language definitions: pill logo + code snippet ----
// Snippets use a tiny token markup: lines are plain strings and we colorize
// a few keywords client-side to keep it simple and dependency-free.

const LANGUAGES = [
  {
    id: 'javascript',
    label: 'JavaScript',
    filename: 'index.js',
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <rect width="128" height="128" rx="8" fill="#f0db4f" />
        <path
          d="M67.3 106.6c-3.2-4.4-5.4-7-11.9-7-4.5 0-7.7 2.4-7.7 5.8 0 4 3.2 5.7 8.6 8l2.3.9c9.5 4 15.8 9 15.8 19.6l-.1.1c0-.1 0-.1.1-.1v-40h-9.9v43.8h.9zm-25.4-2.1c1.9 3.4 4.6 5.9 9.4 5.9 4.6 0 7.2-1.8 7.2-8.6V64h9.9v38c0 12.5-7.3 18.1-18 18.1-9.7 0-15.3-5-18.2-11z"
          transform="scale(0.72) translate(24 -14)"
          fill="#323330"
        />
      </svg>
    ),
    code: `import Konduyt from 'konduyt';

const konduyt = new Konduyt({
  secretKey: '${KEYS.secret}',
});

const payment = await konduyt.payments.create({
  amount: 5000,
  currency: 'KES',
  provider: 'mpesa',
  customer: { email: 'customer@example.com' }
});

console.log(payment);`,
  },
  {
    id: 'python',
    label: 'Python',
    filename: 'main.py',
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <path
          d="M63.4 1.5c-5.3 0-10.3.5-14.7 1.3-13 2.3-15.4 7.1-15.4 16v11.7h30.8v3.9H21.6c-9 0-16.8 5.4-19.3 15.6-2.8 11.8-2.9 19.1 0 31.3 2.2 9.1 7.4 15.6 16.4 15.6h10.6V98.5c0-10.2 8.8-19.2 19.3-19.2h30.7c8.6 0 15.4-7.1 15.4-15.7V18.8c0-8.4-7.1-14.7-15.4-16-5.3-.9-10.7-1.3-16-1.3zM46.8 11c3.2 0 5.8 2.6 5.8 5.8s-2.6 5.8-5.8 5.8-5.8-2.6-5.8-5.8S43.6 11 46.8 11z"
          fill="#3776ab"
        />
        <path
          d="M96.6 34.4v11.3c0 10.6-9 19.6-19.3 19.6H46.6c-8.4 0-15.4 7.2-15.4 15.7v29.5c0 8.4 7.3 13.3 15.4 15.7 9.7 2.9 19.1 3.4 30.7 0 7.7-2.2 15.4-6.7 15.4-15.7V98.8H61.9v-3.9h46.1c9 0 12.3-6.2 15.4-15.6 3.2-9.6 3.1-18.9 0-31.3-2.2-8.9-6.4-15.6-15.4-15.6H96.6zM79.3 105.7c3.2 0 5.8 2.6 5.8 5.8s-2.6 5.8-5.8 5.8-5.8-2.6-5.8-5.8 2.6-5.8 5.8-5.8z"
          fill="#ffd43b"
        />
      </svg>
    ),
    code: `from konduyt import Konduyt

konduyt = Konduyt(secret_key="${KEYS.secret}")

payment = konduyt.payments.create(
    amount=5000,
    currency="KES",
    provider="mpesa",
    customer={"email": "customer@example.com"},
)

print(payment)`,
  },
  {
    id: 'php',
    label: 'PHP',
    filename: 'index.php',
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <path
          d="M64 33.5C41 33.5 26.7 45 21 68c8.6-11.5 18.6-15.8 30-13 6.5 1.6 11.2 6.3 16.3 11.6C75.8 75.2 85.6 85 107 85c23 0 37.3-11.5 43-34.5-8.6 11.5-18.6 15.8-30 13-6.5-1.6-11.2-6.3-16.3-11.6C95.2 43.3 85.4 33.5 64 33.5zM21 85c-23 0-37.3 11.5-43 34.5C-13.4 108-3.4 103.7 8 106.5c6.5 1.6 11.2 6.3 16.3 11.6C32.8 126.7 42.6 136.5 64 136.5c23 0 37.3-11.5 43-34.5-8.6 11.5-18.6 15.8-30 13-6.5-1.6-11.2-6.3-16.3-11.6C52.2 94.8 42.4 85 21 85z"
          transform="translate(11 -25)"
          fill="#6181b6"
        />
      </svg>
    ),
    code: `<?php
require 'vendor/autoload.php';

$konduyt = new Konduyt('${KEYS.secret}');

$payment = $konduyt->payments->create([
  'amount'   => 5000,
  'currency' => 'KES',
  'provider' => 'mpesa',
  'customer' => ['email' => 'customer@example.com'],
]);

echo json_encode($payment);`,
  },
  {
    id: 'go',
    label: 'Go',
    filename: 'main.go',
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <g fill="#00acd7">
          <path d="M9.7 59.5c-.3 0-.4-.2-.2-.4l1.9-2.5c.2-.2.5-.4.8-.4h32.4c.3 0 .4.2.2.5l-1.6 2.4c-.2.2-.5.4-.7.4zM.4 65.2c-.3 0-.4-.2-.2-.4l1.9-2.5c.2-.2.5-.4.8-.4h41.4c.3 0 .4.2.3.5l-.7 2.2c-.1.3-.4.4-.7.4zM15.3 70.9c-.3 0-.3-.2-.2-.4l1.3-2.3c.2-.2.4-.4.7-.4h18.2c.3 0 .4.2.4.5l-.2 2.2c0 .3-.3.5-.5.5z" />
          <path d="M79.5 58.4c-5.7 1.5-9.6 2.6-15.2 4-1.4.4-1.4.4-2.6-1-1.4-1.6-2.4-2.6-4.3-3.6-5.9-2.9-11.6-2-16.9 1.4-6.3 4.1-9.6 10.2-9.5 17.7.1 7.4 5.2 13.5 12.5 14.5 6.3.8 11.6-1.4 15.7-6.1.8-1 1.5-2.1 2.4-3.4H44.7c-1.9 0-2.4-1.2-1.8-2.7 1.2-2.8 3.4-7.5 4.7-9.9.3-.5 1-1.4 2.2-1.4h33.2c-.2 2.5-.2 5-.5 7.5-.9 6.4-3.3 12.3-7.2 17.5-6.4 8.5-14.8 13.8-25.5 15.2-8.8 1.2-17-.5-24.2-5.9-6.6-5-10.4-11.6-11.4-19.8-1.2-9.7 1.7-18.4 7.6-26.1 6.3-8.3 14.7-13.6 25-15.5 8.4-1.5 16.4-.5 23.6 4.4 4.7 3.1 8.1 7.4 10.3 12.6.5.8.1 1.3-.9 1.5z" />
          <path d="M99.9 100.8c-8.1-.2-15.5-2.5-21.7-7.8-5.3-4.5-8.6-10.3-9.7-17.2-1.6-10.1 1.2-19 7.3-27 6.6-8.6 14.5-13.1 25.2-15 9.1-1.6 17.7-.7 25.5 4.6 7.1 4.8 11.5 11.3 12.7 19.9 1.5 12.1-2 22-10.3 30.4-5.9 6-13.1 9.7-21.4 11.4-2.5.5-5 .6-7.6.7zm21.2-36c-.1-1.2-.1-2.1-.3-3-1.6-8.8-9.7-13.8-18.2-11.8-8.3 1.9-13.7 7.2-15.7 15.6-1.6 7 1.8 14.1 8.3 17 5 2.2 10 1.9 14.8-.5 7.3-3.8 11.2-9.7 11-17.3z" />
        </g>
      </svg>
    ),
    code: `package main

import (
    "fmt"
    "github.com/konduyt/konduyt-go"
)

func main() {
    kd := konduyt.New("${KEYS.secret}")

    payment, _ := kd.Payments.Create(&konduyt.PaymentParams{
        Amount:   5000,
        Currency: "KES",
        Provider: "mpesa",
        Customer: konduyt.Customer{Email: "customer@example.com"},
    })

    fmt.Println(payment)
}`,
  },
  {
    id: 'ruby',
    label: 'Ruby',
    filename: 'app.rb',
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <path d="M118.3 84.7c-6.3 1.9-9.7 3.5-19.5 8.9-2.4-1.4-6.6-3.7-15.4-8.6l-13.5-8-16.7 6.6-15.9-10.4L7.5 82.1 27.4 108l32.6 12.6L94 108l24.3-23.3z" fill="#a02c2c" />
        <path d="M94 108l-34-12.6L27.4 108 60 120.6z" fill="#7f1d1d" />
        <path d="M60 71.6l-16.7 6.6L27.4 108 60 95.4z" fill="#cc342d" />
        <path d="M60 71.6l23.9 5.4L94 108 60 95.4z" fill="#9c3535" />
      </svg>
    ),
    code: `require 'konduyt'

konduyt = Konduyt.new('${KEYS.secret}')

payment = konduyt.payments.create(
  amount: 5000,
  currency: 'KES',
  provider: 'mpesa',
  customer: { email: 'customer@example.com' }
)

puts payment`,
  },
  {
    id: 'rust',
    label: 'Rust',
    filename: 'main.rs',
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <path
          d="M63.5 8C33 8 8.3 32.7 8.3 63.2S33 118.4 63.5 118.4s55.2-24.7 55.2-55.2S94 8 63.5 8zm-2 12.3c1.4 0 2.5 1.1 2.5 2.5 0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5c0-1.4 1.1-2.5 2.5-2.5zm23.8 22.5c8.9 8.9 8.9 23.3 0 32.2-8.9 8.9-23.3 8.9-32.2 0s-8.9-23.3 0-32.2 23.3-8.9 32.2 0z"
          fill="#000"
        />
      </svg>
    ),
    code: `use konduyt::Konduyt;

#[tokio::main]
async fn main() {
    let kd = Konduyt::new("${KEYS.secret}");

    let payment = kd.payments().create(PaymentParams {
        amount: 5000,
        currency: "KES",
        provider: "mpesa",
        customer: Customer { email: "customer@example.com" },
    }).await.unwrap();

    println!("{:?}", payment);
}`,
  },
  {
    id: 'csharp',
    label: 'C#',
    filename: 'Program.cs',
    extra: true,
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <path fill="#9B4F96" d="M115.4 30.7L67.1 2.9c-1.3-.8-2.9-1.2-4.6-1.2s-3.3.4-4.6 1.2L9.7 30.7C7 32.3 5 35.7 5 38.8v55.5c0 1.6.5 3.3 1.4 4.9l108.8-62.8c-.9-1.6-2.4-2.9-3.8-3.7z" />
        <path fill="#68217A" d="M10.7 95.3c.5.8 1.2 1.5 1.9 1.9l48.3 27.9c1.3.8 2.9 1.2 4.6 1.2s3.3-.4 4.6-1.2l48.3-27.9c2.7-1.6 4.7-5 4.7-8.1V38.8c0-1.6-.5-3.3-1.4-4.9L10.7 95.3z" />
        <path fill="#fff" d="M85.3 76.1C81.1 83.5 73.1 88.5 64 88.5c-13.5 0-24.5-11-24.5-24.5s11-24.5 24.5-24.5c9.1 0 17.1 5 21.3 12.5l13-7.5c-6.8-11.9-19.6-20-34.3-20-21.8 0-39.5 17.7-39.5 39.5s17.7 39.5 39.5 39.5c14.6 0 27.4-8 34.2-19.8l-12.9-7.6zM97 66.2l.9-4.3h-4.2v-4.7h5.1L100 51h4.9l-1.2 6.2h3.8L108.7 51h4.8l-1.2 6.2h2.4v4.7h-3.3l-.9 4.3h4.2v4.7h-5.1l-1.2 6h-4.9l1.2-6h-3.8l-1.2 6h-4.8l1.2-6h-2.4v-4.7h3.3zm4.8 0h3.8l.9-4.3h-3.8l-.9 4.3z" />
      </svg>
    ),
    code: `using Konduyt;

var konduyt = new KonduytClient("${KEYS.secret}");

var payment = await konduyt.Payments.CreateAsync(new PaymentParams
{
    Amount = 5000,
    Currency = "KES",
    Provider = "mpesa",
    Customer = new Customer { Email = "customer@example.com" }
});

Console.WriteLine(payment);`,
  },
  {
    id: 'java',
    label: 'Java',
    filename: 'Main.java',
    extra: true,
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <path fill="#0074BD" d="M47.6 98.3s-4.9 2.9 3.5 3.8c10.2 1.2 15.4 1 26.6-1.1 0 0 3 1.8 7.1 3.4-25.2 10.8-57-.6-37.2-6.1zM44.5 84.2s-5.5 4.1 2.9 4.9c10.9 1.1 19.5 1.2 34.4-1.7 0 0 2 2.1 5.2 3.2-30.5 8.9-64.5.7-42.5-6.4z" />
        <path fill="#EA2D2E" d="M70.7 60.2c6.2 7.1-1.6 13.5-1.6 13.5s15.7-8.1 8.5-18.3c-6.7-9.5-11.9-14.2 16-30.4 0 0-44 11-23 35.2z" />
        <path fill="#0074BD" d="M107.3 108.7s3.6 3-4 5.3c-14.4 4.4-59.8 5.7-72.4.2-4.5-2 4-4.7 6.6-5.3 2.8-.6 4.4-.5 4.4-.5-5-3.5-32.6 6.9-14 9.9 50.8 8.3 92.6-3.7 79-9.6zM49.9 69.6s-23.1 5.5-8.2 7.5c6.3.8 18.9.6 30.6-.4 9.6-.8 19.2-2.5 19.2-2.5s-3.4 1.4-5.8 3.1c-23.5 6.2-68.8 3.3-55.8-3 11-5.4 20-4.8 20-4.8zM91.2 92.9c23.9-12.4 12.9-24.4 5.1-22.7-1.9.4-2.7.7-2.7.7s.7-1.1 2-1.5c15.4-5.4 27.2 15.9-4.9 24.2 0 0 .4-.4.5-.7z" />
        <path fill="#EA2D2E" d="M77 1.1s13.2 13.2-12.5 33.5c-20.6 16.3-4.7 25.6 0 36.2-12-10.9-20.9-20.5-14.9-29.4C58.4 28.3 82.3 22 77 1.1z" />
        <path fill="#0074BD" d="M52.3 126.9c22.9 1.5 58.1-.8 59-11.7 0 0-1.6 4.1-18.9 7.4-19.5 3.7-43.6 3.3-57.9.9 0 0 2.9 2.5 17.8 3.4z" />
      </svg>
    ),
    code: `import com.konduyt.Konduyt;

Konduyt konduyt = new Konduyt("${KEYS.secret}");

Payment payment = konduyt.payments().create(
    PaymentParams.builder()
        .amount(5000)
        .currency("KES")
        .provider("mpesa")
        .customer(Customer.of("customer@example.com"))
        .build()
);

System.out.println(payment);`,
  },
  {
    id: 'kotlin',
    label: 'Kotlin',
    filename: 'Main.kt',
    extra: true,
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <linearGradient id="ktg" x1="15" y1="113" x2="113" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0095D5" />
          <stop offset="0.3" stopColor="#238AD9" />
          <stop offset="0.6" stopColor="#557BDE" />
          <stop offset="0.9" stopColor="#7F52FF" />
        </linearGradient>
        <path fill="url(#ktg)" d="M128 128H0V0h128L64 64z" />
      </svg>
    ),
    code: `import com.konduyt.Konduyt

val konduyt = Konduyt("${KEYS.secret}")

val payment = konduyt.payments.create(
    amount = 5000,
    currency = "KES",
    provider = "mpesa",
    customer = Customer(email = "customer@example.com")
)

println(payment)`,
  },
  {
    id: 'swift',
    label: 'Swift',
    filename: 'main.swift',
    extra: true,
    logo: (
      <svg className="lgo" viewBox="0 0 128 128">
        <path fill="#F05138" d="M126.3 34.1c0-1.4 0-2.8-.1-4.2 0-1.2-.1-2.3-.2-3.5-.2-2.5-.5-5.1-1.4-7.5-.9-2.4-2.2-4.6-4-6.5-1.7-1.9-3.8-3.3-6.1-4.3-2.4-1-4.9-1.4-7.4-1.6-1.2-.1-2.4-.2-3.6-.2-1.4 0-2.8-.1-4.2-.1H34.1c-1.4 0-2.8 0-4.2.1-1.2 0-2.3.1-3.5.2-1.9.1-3.8.4-5.7 1-2.8.9-5.3 2.4-7.4 4.5-1.5 1.5-2.7 3.3-3.6 5.2-1.2 2.6-1.6 5.4-1.8 8.2-.1 1.2-.2 2.3-.2 3.5 0 1.4-.1 2.8-.1 4.2v59.8c0 1.4 0 2.8.1 4.2 0 1.2.1 2.3.2 3.5.2 2.8.6 5.6 1.8 8.2.9 1.9 2.1 3.7 3.6 5.2 2.1 2.1 4.6 3.6 7.4 4.5 1.9.6 3.8.9 5.7 1 1.2.1 2.3.2 3.5.2 1.4 0 2.8.1 4.2.1h59.8c1.4 0 2.8 0 4.2-.1 1.2 0 2.4-.1 3.6-.2 2.5-.2 5-.6 7.4-1.6 2.3-1 4.4-2.4 6.1-4.3 1.8-1.9 3.1-4.1 4-6.5.9-2.4 1.2-5 1.4-7.5.1-1.2.2-2.3.2-3.5 0-1.4.1-2.8.1-4.2V34.1z" />
        <path fill="#fff" d="M99.2 81.6c-.1-.2-.2-.4-.4-.6-8.9 5.4-19.6 8.9-30.7 8.9-16.8 0-31.8-8.1-42.2-20.4 4.4 2.7 9.4 4.6 14.8 5.5 11.6 2 23.1-1.3 31.6-8.1-11.5-8.8-21.8-20.3-29.4-29.3-1.6-1.6-2.8-3.5-4.1-5.3 9.6 8.8 24.9 19.8 30.3 22.9C57.5 34.5 47.3 20 47.3 20c9.5 9.6 26 22.7 32.9 26.5 2.3-6.3 4.2-13.1 4.2-20.3 0-1.6-.1-3.1-.3-4.6 4.5 8.2 4.4 18.6 1.4 27.7 12.3 15.4 8.9 32 7.3 28.9z" />
      </svg>
    ),
    code: `import Konduyt

let konduyt = Konduyt(secretKey: "${KEYS.secret}")

let payment = try await konduyt.payments.create(
    amount: 5000,
    currency: "KES",
    provider: "mpesa",
    customer: Customer(email: "customer@example.com")
)

print(payment)`,
  },
];

const RESPONSE = `{
  "id": "pay_01H8X1Z2Y7Q8K9LMN0P",
  "status": "created",
  "amount": 5000,
  "currency": "KES",
  "provider": "mpesa",
  "customer": {
    "email": "customer@example.com"
  },
  "created_at": "2026-08-02T09:41:32Z"
}`;

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
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
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  // Mask the middle of the key for display, but copy the full value.
  const masked =
    value.slice(0, 16) + '•'.repeat(Math.max(0, value.length - 20)) + value.slice(-4);
  return (
    <div className="key-field">
      <span className="key-value">{masked}</span>
      <button
        className="copy-icon-btn"
        onClick={handleCopy}
        type="button"
        aria-label="Copy key"
      >
        {copied ? '✓' : '⧉'}
      </button>
    </div>
  );
}

export default function DevPanel() {
  const [activeId, setActiveId] = useState('javascript');
  const [showMore, setShowMore] = useState(false);
  const [runState, setRunState] = useState('idle'); // idle | running | done
  const active = LANGUAGES.find((l) => l.id === activeId) || LANGUAGES[0];

  const visibleLangs = LANGUAGES.filter((l) => !l.extra);
  const extraLangs = LANGUAGES.filter((l) => l.extra);

  function handleRun() {
    if (runState === 'running') return;
    setRunState('running');
    // Simulate a network round-trip to the payments API
    setTimeout(() => setRunState('done'), 1400);
  }

  function selectLang(id) {
    setActiveId(id);
    // Reset the sandbox result when the language changes
    setRunState('idle');
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="tabs">
          <div className="tab active">Quick start</div>
          <div className="tab">API reference</div>
        </div>
        <button className="btn-test" type="button">Test before you sign up</button>
      </div>
      <div className="panel-body">
        {/* Universal keys */}
        <div className="keys-row">
          <div>
            <div className="key-label">
              Universal secret key <span className="info">ⓘ</span>
            </div>
            <KeyField value={KEYS.secret} />
          </div>
          <div>
            <div className="key-label">
              Universal publishable key <span className="info">ⓘ</span>
            </div>
            <KeyField value={KEYS.publishable} />
          </div>
        </div>

        {/* 1. Language selector */}
        <div className="step-label">1. Choose your language</div>
        <div className="lang-pills">
          {visibleLangs.map((l) => (
            <button
              key={l.id}
              type="button"
              className={l.id === activeId ? 'pill active' : 'pill'}
              onClick={() => selectLang(l.id)}
            >
              {l.logo}
              {l.label}
            </button>
          ))}
          {showMore &&
            extraLangs.map((l) => (
              <button
                key={l.id}
                type="button"
                className={l.id === activeId ? 'pill active' : 'pill'}
                onClick={() => selectLang(l.id)}
              >
                {l.logo}
                {l.label}
              </button>
            ))}
          <button
            type="button"
            className="pill pill-more"
            onClick={() => setShowMore((s) => !s)}
          >
            {showMore ? 'Less ⌃' : 'More ⌄'}
          </button>
        </div>

        {/* 2. SDK example */}
        <div className="step-row">
          <div className="step-label" style={{ marginBottom: '0' }}>
            2. Copy, run, and see it work
          </div>
          <a href="#" className="view-docs">View full docs →</a>
        </div>

        <div className="code-grid">
          <div className="code-box">
            <div className="code-box-head">
              <span>{active.filename}</span>
              <CopyButton text={active.code} />
            </div>
            <pre className="code-pre">{active.code}</pre>
          </div>
          <div className="code-box">
            <div className="code-box-head">
              <span>RESPONSE</span>
              {runState === 'done' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="status-dot"></span>200 OK
                </span>
              ) : runState === 'running' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8a8a92' }}>
                  <span className="status-dot pending"></span>Sending…
                </span>
              ) : (
                <span style={{ color: '#6a6a72' }}>Awaiting request</span>
              )}
            </div>
            {runState === 'idle' && (
              <pre className="code-pre code-muted">{`// Click "Run in sandbox" to send
// a test payment and see the
// live API response here.`}</pre>
            )}
            {runState === 'running' && (
              <pre className="code-pre code-muted">{`> POST /v1/payments
> Authorizing test key…
> Creating payment…`}</pre>
            )}
            {runState === 'done' && <pre className="code-pre">{RESPONSE}</pre>}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            className="run-btn"
            type="button"
            onClick={handleRun}
            disabled={runState === 'running'}
          >
            {runState === 'running'
              ? '● Running…'
              : runState === 'done'
              ? '↻ Run again'
              : '▶ Run in sandbox'}
          </button>
          {runState === 'done' && (
            <div className="success-line">✓ Payment created successfully</div>
          )}
        </div>
      </div>
    </div>
  );
}
