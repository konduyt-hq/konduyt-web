'use client';

import { useI18n } from './i18n/I18nProvider';

// Translated primary nav links + a compact language selector, used on the
// landing page so switching language updates the nav immediately.
export default function NavLinks() {
  const { t, lang, setLang, languages } = useI18n();
  return (
    <div className="nav-links">
      <a href="/docs/">{t('nav.docs')}</a>
      <a href="/pricing/">{t('nav.pricing')}</a>
      <a href="https://github.com/konduyt-hq" target="_blank" rel="noreferrer">{t('nav.github')}</a>
      <a href="/labs/">{t('nav.labs')}</a>
      <select
        className="nav-lang"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Language"
      >
        {languages.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
      </select>
    </div>
  );
}
