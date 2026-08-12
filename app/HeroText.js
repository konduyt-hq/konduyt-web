'use client';

import { useI18n } from './i18n/I18nProvider';

// Translated hero block for the landing page.
export default function HeroText() {
  const { t } = useI18n();
  return (
    <>
      <span className="hero-eyebrow">{t('hero.eyebrow')}</span>
      <h1>{t('hero.title')}</h1>
      <p className="hero-sub">{t('hero.sub')}</p>
      <div className="hero-cta">
        <a href="/demo/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>{t('hero.viewdemo')}</a>
        <a href="/docs/" className="link-arrow">{t('hero.viewdocs')} →</a>
      </div>
    </>
  );
}
