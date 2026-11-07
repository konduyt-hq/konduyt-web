import NavCta from '../NavCta';
import SignInLink from '../SignInLink';
import MobileNav from '../MobileNav';
import LogoMark from '../LogoMark';
import WarmupPing from '../WarmupPing';

// The Konduyt for Creators entry point. This is intentionally a real, finished
// page rather than a placeholder: it describes the product that is being built
// and offers a genuine early-access action (an email request) for now.
//
// It deliberately does NOT send visitors to /dashboard/. That dashboard is the
// Konduyt for Developers & Businesses console, a different product, and a
// creator arriving there would be dropped into an experience that is not theirs.
// The creator workspace is developed separately and is out of scope here.
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
              is being built on the same Konduyt identity you already use, so there
              will be nothing new to sign up for.
            </p>
            <p className="creators-body">
              The workspace is opening in pieces. Your ideas workspace is live
              now, built on the same Konduyt identity you already use — there is
              nothing new to sign up for.
            </p>

            {/* The first piece of CreatorOS that actually works, so it is
                offered now rather than waiting for the whole workspace. It
                audits PUBLIC data only and needs no account connection. */}
            <div className="creators-feature">
              <span className="creators-feature-title">Public Creator Audit — available now</span>
              <p className="creators-feature-body">
                Audit a creator’s public YouTube, Instagram or TikTok presence and
                get an evidence-backed assessment of their content and
                performance. No account connection and no login required.
              </p>
              <a href="/creators/audit/" className="link-arrow">Open the Public Creator Audit →</a>
            </div>

            {/* Ideas is the private half: the creator's own writing, saved on
                their device first and synced in the background. */}
            <div className="creators-feature">
              <span className="creators-feature-title">Ideas — available now</span>
              <p className="creators-feature-body">
                A private workspace for capturing and developing your ideas. It
                saves on your device first, so it keeps working when your
                connection doesn’t. Sign in with your existing Konduyt account.
              </p>
              <a href="/creators/ideas/" className="link-arrow">Open your Ideas workspace →</a>
            </div>

            <div className="creators-cta">
              <a
                href="mailto:teamkonduyt@gmail.com?subject=Konduyt%20for%20Creators%20early%20access"
                className="btn-primary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Request early access
              </a>
              <a href="/developers/" className="link-arrow">See Developers &amp; Businesses →</a>
            </div>
            <p className="creators-note">
              More of the workspace is still being built. Requesting early access
              just tells us to reach out to you when the rest opens.
            </p>
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
