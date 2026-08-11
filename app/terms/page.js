'use client';

import Link from 'next/link';

export default function Terms() {
  return (
    <div className="legal-root">
      <nav className="legal-nav">
        <Link href="/" className="legal-logo">Konduyt</Link>
        <Link href="/" className="legal-navlink">← Back to Konduyt</Link>
      </nav>

      <div className="legal-wrap">
        <header className="legal-head">
          <h1>Terms of Service &amp; Data Processing</h1>
          <p className="legal-updated">Last updated: 11 August 2026 · Version 1.0</p>
          <div className="legal-callout">
            This is a good-faith draft written to reflect how Konduyt actually works. It is not
            legal advice and has not been reviewed by a lawyer. Before you rely on it commercially,
            have it reviewed by qualified counsel in your jurisdiction — payments and data-protection
            law vary by country and change often.
          </div>
        </header>

        <section className="legal-section">
          <h2>1. What Konduyt is</h2>
          <p>
            Konduyt is a payment orchestration and intelligence layer. It gives developers a single
            integration that routes payment requests to the developer&apos;s own connected payment
            providers (such as Paystack, Stripe, PayPal, Flutterwave and others), and surfaces
            intelligence — fee and settlement comparison, routing recommendations, and reference tax
            information — on top of those payments. Konduyt does not hold, receive, settle or move
            your money. Funds always flow directly between the customer, the payment provider, and
            the developer&apos;s own provider account. Konduyt is not a bank, a money transmitter, a
            payment processor, or a tax-compliance service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. The bring-your-own-keys model</h2>
          <p>
            You connect your own provider accounts by supplying your provider API credentials.
            Konduyt uses those credentials only to route and execute payment operations that you
            initiate through the API. Your provider secret keys are encrypted at rest using
            authenticated symmetric encryption (Fernet / AES). You remain the account holder and
            the merchant of record with each payment provider, and you remain bound by each
            provider&apos;s own terms. You are responsible for keeping your credentials valid and
            for revoking them if you stop using Konduyt.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Your responsibilities</h2>
          <p>
            You are responsible for: the legality of what you sell; compliance with your payment
            providers&apos; rules and with card-network rules where applicable; your own tax
            registration, filing and remittance; obtaining any consents required to process your
            customers&apos; personal data; and the security of your Konduyt account credentials.
            Konduyt&apos;s tax figures are reference information only — standard published rates for
            awareness, not a filing and not tax advice. You must not use Konduyt for unlawful,
            fraudulent, or prohibited transactions.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. Data protection (GDPR / UK GDPR / applicable law)</h2>
          <p>
            Where Konduyt processes personal data on your behalf to provide the service, Konduyt
            acts as a <strong>data processor</strong> and you act as the <strong>data controller</strong>.
            Konduyt processes personal data only on your documented instructions (your use of the
            API), for the purpose of routing and recording payments.
          </p>
          <p>The lawful basis you rely on for your customers&apos; data is yours to establish. As processor, Konduyt commits to:</p>
          <ul className="legal-list">
            <li>Processing personal data only to provide the service and only on your instructions.</li>
            <li>Applying appropriate technical and organisational security measures, including encryption of provider credentials at rest and encryption in transit.</li>
            <li>Maintaining an append-only transaction ledger for integrity and audit; ledger records are retained as long as your account is active or as required for legal and accounting purposes.</li>
            <li>Assisting you, so far as reasonably possible, with data-subject requests (access, rectification, erasure, portability, objection) and with breach notification.</li>
            <li>Not engaging sub-processors for personal data without making them available to you; current infrastructure sub-processors include our hosting and database providers (application hosting, managed Postgres) and, where you enable them, your chosen payment providers.</li>
            <li>Deleting or returning personal data on termination, subject to legal retention requirements.</li>
          </ul>
          <p>
            Personal data may be processed and stored in data-center regions we operate in (currently
            the EU / Frankfurt for the primary database). Where data crosses borders, we rely on
            appropriate safeguards such as standard contractual clauses where required.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Data minimisation</h2>
          <p>
            Konduyt is designed to touch as little sensitive data as possible. Konduyt never stores
            raw card numbers or full payment instruments — those are handled by the payment
            providers you connect, on their PCI-compliant infrastructure. Konduyt stores payment
            metadata (amount, currency, status, provider, customer country, references) needed to
            route and record a payment.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Security</h2>
          <p>
            Konduyt uses encryption in transit (HTTPS/TLS) and encryption at rest for secret
            credentials, token-based authentication, and least-privilege access to provider
            operations. No system is perfectly secure; you use the service on an &quot;as is&quot;
            basis and should maintain your own safeguards, including promptly rotating any credential
            you believe may be exposed.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Availability &amp; changes</h2>
          <p>
            Konduyt is provided on a commercially reasonable-efforts basis and may change,
            add or remove features. We aim to give reasonable notice of material changes. Provider
            availability, fees, settlement times and tax rates are outside Konduyt&apos;s control;
            reference figures are provided for convenience and may lag real-world changes.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Fees</h2>
          <p>
            Konduyt&apos;s own fees (if any) are described on the Pricing page. Payment providers
            charge their own fees directly; those are between you and each provider. Konduyt does not
            take a cut of your transactions and does not touch settlement.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Liability</h2>
          <p>
            To the maximum extent permitted by law, Konduyt is not liable for indirect or
            consequential loss, lost profits, or loss arising from provider outages, incorrect
            reference data (including tax rates and filing cycles), or your own misconfiguration.
            Nothing in these terms excludes liability that cannot lawfully be excluded.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Termination</h2>
          <p>
            You may stop using Konduyt at any time and disconnect your provider accounts. We may
            suspend or terminate access for breach of these terms or unlawful use. On termination,
            your credentials are deleted and personal data is handled per section 4.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Contact</h2>
          <p>
            For privacy requests, data-processing questions, or anything about these terms, contact
            the Konduyt team through the details on konduyt.dev. Data-subject requests will be
            routed to you as controller where Konduyt acts as processor.
          </p>
        </section>

        <footer className="legal-foot">
          <Link href="/" className="legal-navlink">← Back to Konduyt</Link>
          <span className="legal-copy">© 2026 Konduyt</span>
        </footer>
      </div>
    </div>
  );
}
