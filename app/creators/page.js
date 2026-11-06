import NavCta from '../NavCta';
import SignInLink from '../SignInLink';
import MobileNav from '../MobileNav';
import LogoMark from '../LogoMark';
import WarmupPing from '../WarmupPing';

// The Konduyt for Creators entry point. This is intentionally a real,
// finished page rather than a placeholder: it describes the product that is
// being built, and it routes an existing Konduyt user to the account they
// already have (the dashboard) instead of asking them to register again. The
// creator workspace itself is developed separately and is out of scope here.
export default function Creators() {
  return (
    <>
      <WarmupPing />
      <div className="wrap">
        <nav>
          <div className="brand">
            <a href="/" className="brand-home">
              <LogoMark />
              <span className="brand-name">Konduyt</span>
            </a>
            <span className="beta-badge">Beta</span>
          </div>
          <div className="nav-links">
            <a href="/developers/">Developers</a>
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

        <section className="landing">
          <div className="landing-head">
            <span className="landing-eyebrow">Konduyt for Creators</span>
            <h1 className="landing-title">Your creator business, in one workspace</h1>
            <p className="landing-sub">
              Your workspace for building, growing and running a creator business.
            </p>
          </div>

          <div className="creators-panel">
            <span className="product-badge product-badge-dev">In development</span>
            <p className="creators-body">
              This is the product we are actively developing. Konduyt for Creators
              is built on the same Konduyt identity and account you already use, so
              there is nothing new to sign up for.
            </p>
            <p className="creators-body">
              The workspace itself is being built separately and will appear here
              when it is ready. Until then, your existing Konduyt account and
              dashboard are unchanged and fully available.
            </p>
            <div className="creators-cta">
              <a href="/dashboard/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Go to your Konduyt account
              </a>
              <a href="/developers/" className="link-arrow">See Developers &amp; Businesses →</a>
            </div>
          </div>
        </section>

        <footer className="site-footer">
          <div className="footer-brand">
            <LogoMark className="footer-logo" />
            <span className="footer-name">Konduyt</span>
          </div>
          <div className="footer-links">
            <a href="/">All products</a>
            <a href="/developers/">Developers &amp; Businesses</a>
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
