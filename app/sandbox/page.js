'use client';

import Link from 'next/link';
import { REFERENCE_APPS, STATUS_META } from './registry';

export default function SandboxPage() {
  const live = REFERENCE_APPS.filter((a) => a.status === 'live');
  const buildable = REFERENCE_APPS.filter((a) => a.status === 'planned');
  const blocked = REFERENCE_APPS.filter((a) => a.status === 'blocked');

  return (
    <div className="sbx-root">
      <header className="sbx-top">
        <Link href="/" className="sbx-logo">Konduyt<span>.</span></Link>
        <Link href="/dashboard/" className="sbx-back">Dashboard →</Link>
      </header>

      <main className="sbx-main">
        <section className="sbx-hero">
          <span className="sbx-eyebrow">Sandbox</span>
          <h1>Real applications, not a fake simulator.</h1>
          <p>
            The Konduyt Sandbox is a growing collection of working applications that
            use the real Konduyt API exactly as a customer would. Browse the code,
            copy the integration, connect your own project, and trigger real payment
            flows. Every app only uses features Konduyt supports today — nothing is
            simulated.
          </p>
        </section>

        {/* LIVE */}
        <section className="sbx-section">
          <div className="sbx-section-head">
            <h2>Live applications</h2>
            <p>{STATUS_META.live.note}</p>
          </div>
          <div className="sbx-grid">
            {live.map((app) => (
              <div className="sbx-card live" key={app.id}>
                <div className="sbx-card-top">
                  <span className="sbx-badge live">{STATUS_META.live.label}</span>
                </div>
                <h3>{app.name}</h3>
                <p className="sbx-tag">{app.tagline}</p>
                <div className="sbx-uses">
                  {app.uses.map((u) => <span key={u} className="sbx-use">{u}</span>)}
                </div>
                <div className="sbx-actions">
                  {app.openUrl && (
                    <a className="sbx-cta primary" href={app.openUrl} target="_blank" rel="noreferrer">
                      Open app →
                    </a>
                  )}
                  {app.repo && (
                    <a className="sbx-cta" href={app.repo} target="_blank" rel="noreferrer">
                      View source
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BUILDABLE NEXT */}
        <section className="sbx-section">
          <div className="sbx-section-head">
            <h2>Buildable next</h2>
            <p>{STATUS_META.planned.note}</p>
          </div>
          <div className="sbx-grid">
            {buildable.map((app) => (
              <div className="sbx-card" key={app.id}>
                <div className="sbx-card-top">
                  <span className="sbx-badge planned">{STATUS_META.planned.label}</span>
                </div>
                <h3>{app.name}</h3>
                <p className="sbx-tag">{app.tagline}</p>
                <div className="sbx-uses">
                  {app.uses.map((u) => <span key={u} className="sbx-use">{u}</span>)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* WAITING ON A FEATURE */}
        <section className="sbx-section">
          <div className="sbx-section-head">
            <h2>Waiting on a capability</h2>
            <p>These begin only when the feature they need actually exists — no pretending.</p>
          </div>
          <div className="sbx-grid">
            {blocked.map((app) => (
              <div className="sbx-card blocked" key={app.id}>
                <div className="sbx-card-top">
                  <span className="sbx-badge blocked">{STATUS_META.blocked.label}</span>
                </div>
                <h3>{app.name}</h3>
                <p className="sbx-tag">{app.tagline}</p>
                <div className="sbx-uses">
                  {app.uses.map((u) => <span key={u} className="sbx-use dim">{u}</span>)}
                </div>
                <p className="sbx-requires">{app.requires}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sbx-foot">
          <h2>How the Sandbox grows</h2>
          <p>
            A feature is only done when the API works, the dashboard supports it, and
            at least one reference application uses it. As Konduyt gains split
            payments, subscriptions, and production routing, the applications above
            move from waiting to live — each one a real client exercising the feature.
          </p>
        </section>
      </main>
    </div>
  );
}
