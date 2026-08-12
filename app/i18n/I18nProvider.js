'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LANGUAGES, DEFAULT_LANG, STORAGE_KEY, isRtl } from './config';
import { STRINGS } from './strings';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && LANGUAGES.some((l) => l.code === saved)) setLangState(saved);
    } catch (e) {}
  }, []);

  // Reflect language + direction on <html> so CSS (and screen readers) know.
  useEffect(() => {
    try {
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', isRtl(lang) ? 'rtl' : 'ltr');
    } catch (e) {}
  }, [lang]);

  const setLang = useCallback((code) => {
    if (!LANGUAGES.some((l) => l.code === code)) return;
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
    setLangState(code);
  }, []);

  // t(key) -> translated string, falling back to English, then the key itself.
  const t = useCallback((key) => {
    const entry = STRINGS[key];
    if (!entry) return key;
    return entry[lang] || entry[DEFAULT_LANG] || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, rtl: isRtl(lang), languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  // Safe fallback if a component renders outside the provider (SSR edge).
  if (!ctx) {
    return { lang: DEFAULT_LANG, setLang: () => {}, t: (k) => (STRINGS[k]?.[DEFAULT_LANG] || k), rtl: false, languages: LANGUAGES };
  }
  return ctx;
}
