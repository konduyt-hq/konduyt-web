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
          <h1 className="about-title">Kenya&rsquo;s answer to the Yozma miracle</h1>
        </header>

        <div className="about-body">
          <p className="about-lead">
            Konduyt is part of a larger ambition: to build Kenya&rsquo;s answer to the
            Yozma miracle &mdash; a technology ecosystem capable of producing globally
            competitive companies from Kenya, for the world.
          </p>

          <p>
            Under <strong>The Daring Initiative</strong>, or <strong>StudioJune</strong>{' '}
            (working name), we are building the infrastructure and companies we believe can
            become Kenya&rsquo;s version of Silicon Valley: not by copying Silicon Valley, but
            by creating the conditions for ambitious founders, engineers, researchers, and
            builders to do their best work here.
          </p>

          <p>Konduyt is one of those companies.</p>

          <p className="about-pull">
            We believe Kenya should not merely consume the world&rsquo;s technology.
            Kenya should build it. Own it. Export it.
          </p>

          <p>
            Our ambition extends beyond a single product. We want to help create an ecosystem
            where world-class technology companies can emerge from Kenya and compete globally.
          </p>

          <aside className="about-disclaimer" role="note">
            <div className="about-disclaimer-label">Important clarification</div>
            <p>
              The Daring Initiative, StudioJune, and Konduyt are private initiatives and have
              no affiliation with, endorsement from, or official relationship with the
              Government of Kenya. References to Kenya&rsquo;s technological or economic future
              are expressions of our own vision and ambitions, not government policy or
              representation.
            </p>
          </aside>
        </div>

        <footer className="about-foot">
          <Link href={homeHref} className="about-navlink">&larr; Back to Konduyt</Link>
        </footer>
      </main>
    </div>
  );
}
