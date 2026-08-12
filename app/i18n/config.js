'use client';

// The 10 languages Konduyt's UI supports. `rtl: true` triggers right-to-left
// layout (Arabic). `english_authoritative` is a flag used on legal pages to note
// the binding version is English even when the UI chrome is translated.
export const LANGUAGES = [
  { code: 'en', name: 'English',            native: 'English' },
  { code: 'sw', name: 'Swahili',            native: 'Kiswahili' },
  { code: 'fr', name: 'French',             native: 'Français' },
  { code: 'es', name: 'Spanish',            native: 'Español' },
  { code: 'ar', name: 'Arabic',             native: 'العربية', rtl: true },
  { code: 'pt', name: 'Portuguese',         native: 'Português' },
  { code: 'hi', name: 'Hindi',              native: 'हिन्दी' },
  { code: 'zh', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'de', name: 'German',             native: 'Deutsch' },
  { code: 'am', name: 'Amharic',            native: 'አማርኛ' },
];

export const DEFAULT_LANG = 'en';
export const STORAGE_KEY = 'kdu_lang';

export function isRtl(code) {
  const l = LANGUAGES.find((x) => x.code === code);
  return !!(l && l.rtl);
}
