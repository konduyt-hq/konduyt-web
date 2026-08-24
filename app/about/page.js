'use client';

import Link from 'next/link';
import { useHomeHref } from '../useHomeHref';
import Logo from '../Logo';

export default function About() {
  const homeHref = useHomeHref();

  return (
    <div className="about-root">
      <nav className="about-nav">
        <Logo className="about-logo" />
        <div className="about-nav-links">
          <Link href={homeHref} className="about-navlink">Home</Link>
          <Link href="/pricing/" className="about-navlink">Pricing</Link>
          <Link href="/docs/" className="about-navlink">Docs</Link>
        </div>
      </nav>

      <main className="about-main">
        <header className="about-head">
          <span className="about-eyebrow">About Konduyt</span>
          <h1 className="about-title">However they pay. You get paid.</h1>
        </header>

        <div className="about-body">
          <p className="about-lead">
            Konduyt is a payment infrastructure company built by Collective Brains,
            based in Thika, Kenya.
          </p>

          <p>
            Businesses should not have to rebuild their payment systems every time
            they enter a new country.
          </p>

          <p>
            Konduyt gives developers one integration for payments across providers,
            payment methods, currencies, and markets. Instead of building and
            maintaining separate integrations for every payment rail, businesses
            connect to Konduyt and let the platform handle the complexity behind
            the scenes.
          </p>

          <p>
            From cards and bank payments to mobile money and local payment methods,
            Konduyt is built around one simple idea:
          </p>

          <p className="about-pull">However they pay. You get paid.</p>

          <p>
            Konduyt is part of Collective Brains, a technology company based in
            Thika, Kenya, building products that remove unnecessary complexity from
            the systems people and businesses depend on.
          </p>

          <p>We believe great technology should make complicated things feel simple.</p>

          <p>
            Konduyt is our answer to one of the biggest problems in global commerce:
            payments should work wherever your customers are.
          </p>
        </div>

        <footer className="about-foot">
          <Link href={homeHref} className="about-navlink">&larr; Back to Konduyt</Link>
        </footer>
      </main>
    </div>
  );
}
