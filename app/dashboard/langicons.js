// Language marks in OUTLINE style — stroked glyphs, no background fill, no filled
// text. They use currentColor so they inherit the chip's text colour (ink, or
// green when selected). Recognizable letterforms/shapes without brand fills.

const S = 'stroke="currentColor" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';

export const LANG_ICONS = {
  terminal: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  js: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9v5a1.5 1.5 0 0 1-3 0"/><path d="M13 15a1.5 1.5 0 0 0 3 0c0-1.5-3-1.5-3-3a1.5 1.5 0 0 1 3 0"/></svg>`,
  python: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><path d="M12 3c-3 0-4 1-4 3v2h5"/><path d="M8 8H6c-2 0-3 1-3 4s1 4 3 4h2v-2c0-2 1-3 3-3h3c2 0 3-1 3-3V6c0-2-1-3-4-3z"/><path d="M12 21c3 0 4-1 4-3v-2h-5"/><circle cx="9.5" cy="5.5" r="0.4"/><circle cx="14.5" cy="18.5" r="0.4"/></svg>`,
  php: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><ellipse cx="12" cy="12" rx="10" ry="6.5"/><path d="M7 10v4M7 10h1.5a1 1 0 0 1 0 2H7M11 9v6M11 12h2M13 9v6M16 10v4M16 10h1.2a1 1 0 0 1 0 2H16"/></svg>`,
  go: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 12h2a1.5 1.5 0 1 1-1.5-1.5"/><path d="M13 10.5a2 2 0 1 0 0 3 2 2 0 0 0 0-3z"/></svg>`,
  ruby: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M8 4l-2 5 6 11 6-11-2-5"/></svg>`,
  rust: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><circle cx="12" cy="12" r="8"/><path d="M9 16V8h3.5a2 2 0 0 1 0 4H9m3 0 3 4"/></svg>`,
  csharp: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><path d="M15 8.5a4 4 0 1 0 0 7"/><path d="M18 9v4M20 9v4M17 10.5h4M17 12.5h4"/></svg>`,
  java: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><path d="M6 12h10v4a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><path d="M16 13h1.5a1.5 1.5 0 0 1 0 3H16"/><path d="M9 8c1-1 0-2 0-2M12 8c1-1 0-2 0-2"/></svg>`,
  kotlin: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><path d="M4 4h16L12 12l8 8H4z"/></svg>`,
  swift: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><path d="M5 6c5 3 8 6 10 10 0-3-1-6-3-8 2 1 3 2 4 4-1-5-5-8-11-6z"/></svg>`,
  cpp: `<svg viewBox="0 0 24 24" width="15" height="15" ${S}><path d="M12 8.5a4 4 0 1 0 0 7"/><path d="M16 10v3M14.5 11.5h3M20 10v3M18.5 11.5h3"/></svg>`,
};
