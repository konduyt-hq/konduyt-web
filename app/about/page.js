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
      </nav>

      <main className="about-doc">
        <p>
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
          Konduyt is built around one simple idea: however they pay, you get paid.
        </p>

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

        <p><Link href={homeHref}>&larr; Back to Konduyt</Link></p>
      </main>
    </div>
  );
}
