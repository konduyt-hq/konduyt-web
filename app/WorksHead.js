'use client';
import { useI18n } from './i18n/I18nProvider';

// Translated "In the works" heading block.
export default function WorksHead() {
  const { t } = useI18n();
  return (
    <div className="works-head">
      <span className="works-eyebrow">{t('land.works.eyebrow')}</span>
      <h2 className="works-title">{t('land.works.title')}</h2>
      <p className="works-sub">{t('land.works.sub')}</p>
    </div>
  );
}
