'use client';

import { useI18n } from './I18nProvider';

// A language selector. Changing it updates the language site-wide (persisted).
export default function LanguageSelect({ className = '' }) {
  const { lang, setLang, languages } = useI18n();
  return (
    <select
      className={className || 'lang-select'}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label="Language"
    >
      {languages.map((l) => (
        <option key={l.code} value={l.code}>{l.native}</option>
      ))}
    </select>
  );
}
