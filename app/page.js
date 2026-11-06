import NavCta from './NavCta';
import SignInLink from './SignInLink';
import MobileNav from './MobileNav';
import LogoMark from './LogoMark';
import WarmupPing from './WarmupPing';

export const metadata = {
  title: 'Konduyt — one account, three products',
  description:
    'Konduyt for Developers & Businesses: one integration to connect your business to multiple payment providers and payment methods. Konduyt for Creators: your workspace for building, growing and running a creator business. Konduyt Payroll: coming soon.',
  alternates: { canonical: 'https://konduyt.dev' },
  openGraph: {
    title: 'Konduyt',
    description:
      'One Konduyt account, three products: Developers & Businesses, Creators, and Payroll.',
    url: 'https://konduyt.dev',
  },
};

// The three product entry points. Kept as data so they stay visibly parallel
// and so "coming soon" is structural, not cosmetic: an option with no `href`
// renders as a non-interactive card, which is what makes it impossible for
// Payroll to lead anywhere broken.
const PRODUCTS = [
  {
    id: 'developers',
    title: 'Konduyt for Developers & Businesses',
    description:
      'One integration to connect your business to multiple payment providers and payment methods.',
    status: 'Existing platform. Still operational, currently undergoing major developments.',
    badge: 'Existing platform',
    badgeClass: 'product-badge product-badge-existing',
    action: 'Explore the payment platform',
    href: '/developers/',
  },
  {
    id: 'creators',
    title: 'Konduyt for Creators',
    description: 'Your workspace for building, growing and running a creator business.',
    status: 'This is the product we are actively developing.',
    badge: 'In development',
    badgeClass: 'product-badge product-badge-dev',
    action: 'Explore Konduyt for Creators',
    href: '/creators/',
  },
  {
    id: 'payroll',
    title: 'Konduyt Payroll',
    description: 'A future workspace for managing payroll and paying teams.',
    status: 'Coming soon.',
    badge: 'Coming soon',
    badgeClass: 'product-badge product-badge-soon',
    action: 'Coming soon',
    href: null,
  },
];

export default function Home() {
  return (
    <>
      <WarmupPing />
      <div className="wrap">
        {/* NAV */}
        <nav>
          <div className="brand">
            <LogoMark />
            <span className="brand-name">Konduyt</span>
            <span className="beta-badge">Beta</span>
          </div>
          <div className="nav-links">
            <a href="/developers/">Developers</a>
            <a href="/creators/">Creators</a>
            <a href="/docs/">Docs</a>
            <a href="/pricing/">Pricing</a>
            <a href="https://github.com/konduyt-hq" target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <MobileNav />
          <div className="nav-right">
            <SignInLink />
            <NavCta />
          </div>
        </nav>

        {/* HERO + PRODUCT SELECTION */}
        <section className="landing">
          <div className="landing-head">
            <span className="landing-eyebrow">One Konduyt account</span>
            <h1 className="landing-title">Three products, one Konduyt</h1>
            <p className="landing-sub">
              Same identity, same account. Pick where you want to go.
            </p>
          </div>

          <div className="product-list">
            {PRODUCTS.map((p) => {
              const inner = (
                <>
                  <div className="product-card-main">
                    <div className="product-card-head">
                      <h2 className="product-card-title">{p.title}</h2>
                      <span className={p.badgeClass}>{p.badge}</span>
                    </div>
                    <p className="product-card-desc">{p.description}</p>
                    <p className="product-card-status">{p.status}</p>
                  </div>
                  <span className="product-card-action">
                    {p.action}
                    {p.href ? ' \u2192' : ''}
                  </span>
                </>
              );

              return p.href ? (
                <a key={p.id} href={p.href} className="product-card">
                  {inner}
                </a>
              ) : (
                // No href: a coming-soon product is deliberately not a link, so
                // it cannot lead to a broken or unfinished application.
                <div
                  key={p.id}
                  className="product-card product-card-soon"
                  aria-disabled="true"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="site-footer">
          <div className="footer-brand">
            <LogoMark className="footer-logo" />
            <span className="footer-name">Konduyt</span>
          </div>
          <div className="footer-links">
            <a href="/developers/">Developers &amp; Businesses</a>
            <a href="/creators/">Creators</a>
            <a href="/docs/">Docs</a>
            <a href="/pricing/">Pricing</a>
            <a href="/terms/">Terms</a>
          </div>
          <span className="footer-copy">© 2026 Konduyt</span>
          <div className="footer-badge">
            <a href="https://launchbuck.com/p/konduyt" target="_blank" rel="noopener noreferrer">
              <img src="https://launchbuck.com/badges/card-light.png" alt="Konduyt — Featured on LaunchBuck" width="190" height="58" />
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
