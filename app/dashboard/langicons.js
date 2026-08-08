// Language marks in their OFFICIAL colours (the logo keeps its real look), plus
// each language's signature brand colour for the chip outline. The chip TEXT
// stays Konduyt's default ink — only the border + logo carry the language colour.

export const LANG_BRAND = {
  curl:   '#073551',
  js:     '#f7df1e',
  python: '#3776ab',
  php:    '#777bb3',
  go:     '#00add8',
  ruby:   '#cc342d',
  rust:   '#dea584',
  csharp: '#512bd4',
  java:   '#ea2d2e',
  kotlin: '#7f52ff',
  swift:  '#f05138',
  cpp:    '#00599c',
};

// Official-look colored marks.
export const LANG_ICONS = {
  curl: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#073551" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  js: `<svg viewBox="0 0 24 24" width="16" height="16"><rect width="24" height="24" rx="3" fill="#f7df1e"/><text x="12" y="17" font-family="Arial,sans-serif" font-size="11" font-weight="700" text-anchor="middle" fill="#000">JS</text></svg>`,
  python: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M11.9 2c-2 0-3.8.3-3.8 2.5v1.8h4v.5H5.6c-1.9 0-3.6 1.2-3.6 4.2s1.5 4.3 3.6 4.3h1.4v-2c0-2 1.7-3.4 3.6-3.4h3.9c1.6 0 2.9-1.3 2.9-2.9V4.5C17.4 3 16 2 11.9 2zM9.7 3.6c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7z" fill="#3776ab"/><path d="M12.1 22c2 0 3.8-.3 3.8-2.5v-1.8h-4v-.5h6.5c1.9 0 3.6-1.2 3.6-4.2s-1.5-4.3-3.6-4.3h-1.4v2c0 2-1.7 3.4-3.6 3.4H9.5c-1.6 0-2.9 1.3-2.9 2.9v3.5C6.6 21 8 22 12.1 22zm2.2-1.6c-.4 0-.7-.3-.7-.7s.3-.7.7-.7.7.3.7.7-.3.7-.7.7z" fill="#ffd43b"/></svg>`,
  php: `<svg viewBox="0 0 24 24" width="16" height="16"><ellipse cx="12" cy="12" rx="11" ry="7" fill="#777bb3"/><text x="12" y="15" font-family="Arial,sans-serif" font-size="7" font-weight="700" text-anchor="middle" fill="#fff">php</text></svg>`,
  go: `<svg viewBox="0 0 24 24" width="16" height="16"><rect width="24" height="24" rx="3" fill="#00add8"/><text x="12" y="16" font-family="Arial,sans-serif" font-size="9" font-weight="700" text-anchor="middle" fill="#fff">Go</text></svg>`,
  ruby: `<svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2L2 9l10 13L22 9z" fill="#cc342d"/><path d="M12 2L2 9h20z" fill="#e04a3f"/></svg>`,
  rust: `<svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" fill="#000"/><text x="12" y="16" font-family="Arial,sans-serif" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">R</text></svg>`,
  csharp: `<svg viewBox="0 0 24 24" width="16" height="16"><rect width="24" height="24" rx="3" fill="#512bd4"/><text x="12" y="16" font-family="Arial,sans-serif" font-size="9" font-weight="700" text-anchor="middle" fill="#fff">C#</text></svg>`,
  java: `<svg viewBox="0 0 24 24" width="16" height="16"><rect width="24" height="24" rx="3" fill="#ea2d2e"/><text x="12" y="16" font-family="Arial,sans-serif" font-size="9" font-weight="700" text-anchor="middle" fill="#fff">J</text></svg>`,
  kotlin: `<svg viewBox="0 0 24 24" width="16" height="16"><defs><linearGradient id="ktg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7f52ff"/><stop offset="1" stop-color="#e44857"/></linearGradient></defs><rect width="24" height="24" rx="3" fill="url(#ktg)"/><text x="12" y="16" font-family="Arial,sans-serif" font-size="9" font-weight="700" text-anchor="middle" fill="#fff">K</text></svg>`,
  swift: `<svg viewBox="0 0 24 24" width="16" height="16"><rect width="24" height="24" rx="3" fill="#f05138"/><text x="12" y="16" font-family="Arial,sans-serif" font-size="8" font-weight="700" text-anchor="middle" fill="#fff">Sw</text></svg>`,
  cpp: `<svg viewBox="0 0 24 24" width="16" height="16"><rect width="24" height="24" rx="3" fill="#00599c"/><text x="12" y="16" font-family="Arial,sans-serif" font-size="7" font-weight="700" text-anchor="middle" fill="#fff">C++</text></svg>`,
};
