'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useHomeHref } from '../useHomeHref';
import Logo from '../Logo';

export default function About() {
  const homeHref = useHomeHref();

  useEffect(() => { document.title = 'Konduyt About'; }, []);

  return (
    <div className="about-root">
      <nav className="about-nav">
        <Logo className="about-logo" />
      </nav>

      <main className="about-doc">
        <p>
          Konduyt is a payment infrastructure company built by Core Brains
          in Thika, Kenya.
        </p>

        <p>
          A business should not have to rebuild its payment system every time
          it enters a new country.
        </p>

        <p>But that is usually what happens.</p>

        <p>
          One provider here. Another there. Different APIs. Different payment
          methods. Different currencies. Different rules.
        </p>

        <p>Konduyt puts them behind one integration.</p>

        <p>
          Connect your providers. Write your integration once. We handle the
          messy parts underneath — payment methods, currencies, routing, and
          the differences between markets.
        </p>

        <p>
          And when a payment gets complicated, Konduyt helps figure it out.
          Which provider should take it? Which payment method fits? What
          happens if a route fails?
        </p>

        <p>
          Tax is part of the same problem. Different countries have different
          rules. Konduyt helps you understand what applies to each sale and
          what you need to do about it.
        </p>

        <p>Your customers pay the way they already do.</p>

        <p>Your money stays in your own accounts.</p>

        <p>We never touch it.</p>

        <p>However they pay, you get paid.</p>

        <p>
          Konduyt is part of Core Brains, a technology company based in
          Thika, Kenya. We build things that make complicated systems easier
          to use.
        </p>

        <p>Payments are just where we started.</p>

        <p><Link href={homeHref}>&larr; Back to Konduyt</Link></p>
      </main>
    </div>
  );
}
