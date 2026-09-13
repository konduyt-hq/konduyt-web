// Shared by both surfaces that render code snippets: the landing page
// (DevPanel.js) and the dashboard's code samples (page.js, via
// langsnippets.js). One implementation, not two copies that could drift.
//
// Real syntax highlighting via Prism -- keywords, strings, types, function
// names, comments, each genuinely tokenized and colored per that
// language's own real grammar, not just a comment/code split. Prism is a
// real, established, widely-used library (not a custom highlighter risking
// a language's own edge cases), themed here to resemble a real native
// dark editor rather than using Prism's own default light theme.

import Prism from 'prismjs';
// Dependency order matters here, and gets it wrong silently until a
// language is actually used -- both of these were real errors caught
// building this, not assumed:
// clike/c first -- csharp, java, and kotlin all extend clike; cpp
// extends c, which itself extends clike.
// markup, then markup-templating, before php -- php's own grammar
// directly references Prism.languages['markup-templating'] (PHP is
// often embedded inside HTML), which itself references
// Prism.languages.markup.
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-cpp';

// This project's own language ids -> Prism's real grammar names. Not a
// 1:1 match everywhere (curl's snippets are real bash; html/android/ios
// are all real markup -- HTML or XML, Prism's own "markup" grammar
// covers both correctly).
const PRISM_LANG = {
  curl: 'bash',
  js: 'javascript',
  python: 'python',
  php: 'php',
  go: 'go',
  ruby: 'ruby',
  rust: 'rust',
  csharp: 'csharp',
  java: 'java',
  kotlin: 'kotlin',
  swift: 'swift',
  cpp: 'cpp',
  html: 'markup',
  android: 'markup',
  ios: 'markup',
};

// Real, dynamic HTML -- Prism.highlight() returns a string, not React
// elements, so this goes through dangerouslySetInnerHTML (the same
// pattern already used elsewhere in this codebase for the language pill
// icon SVGs) rather than being re-parsed into a React tree by hand.
// Falls back to the language's own escaped, unhighlighted text if the
// requested language isn't one of the ones loaded above, rather than
// throwing -- a genuinely unknown language should degrade, not crash a
// whole code sample over one bad id.
export function highlightCode(code, langId) {
  const prismLang = PRISM_LANG[langId];
  const grammar = prismLang && Prism.languages[prismLang];
  const html = grammar ? Prism.highlight(code, grammar, prismLang) : escapeHtml(code);
  return <code dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
