'use client';
import { useI18n } from './i18n/I18nProvider';

// Translated hero copy block (body, CTA, works-with label) for the landing page.
export default function HeroCopy() {
  const { t } = useI18n();
  return (
    <>
      <div className="copy">
        <p>{t('land.body1')}</p>
        <p>{t('land.body2')}</p>
        <p>{t('land.body3a')}<br />{t('land.body3b')}</p>
      </div>
      <div className="cta-row">
        <a href="/demo/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>{t('hero.viewdemo')}</a>
        <a href="/docs/" className="link-arrow">{t('hero.viewdocs')} →</a>
      </div>
      <div className="works-with">{t('land.workswith')}</div>
    </>
  );
}
