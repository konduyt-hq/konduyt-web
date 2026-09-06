// Shared by both surfaces that render code snippets: the landing page
// (DevPanel.js) and the dashboard's code samples (page.js, via
// langsnippets.js). One implementation, not two copies that could drift.

// Renders a code string as React elements with comments in a lighter,
// muted color (.code-muted, defined in globals.css) -- a whole
// comment-only line, or the trailing `// ...` / `# ...` portion of a
// line that has real code before it. Deliberately simple (line-based,
// not a full tokenizer) and deliberately requires a space before an
// inline `#`/`//` so it doesn't misfire on `https://` or a `#` inside a
// string/URL fragment -- good enough for these snippets' real comment
// style (always `// text` or `# text`, never packed against other
// syntax) without the risk of a heavier general-purpose highlighter
// getting a language's own edge cases wrong.
export function highlightComments(code) {
  const lines = code.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trimStart();
    const indent = line.slice(0, line.length - trimmed.length);
    // A real comment always has a space (or line-end) right after '#' --
    // a CSS hex color ('#fff', '#6a6a72') never does. That single check
    // is what actually separates the two cases in these snippets, not
    // comment-style conventions (which vary too much to rely on alone).
    const looksLikeHexColor = /^#[0-9a-fA-F]{3,8}\b/.test(trimmed);
    const isFullLineComment = (trimmed.startsWith('//') || trimmed.startsWith('#')) && !looksLikeHexColor;
    let codePart = line, commentPart = null;
    if (!isFullLineComment) {
      const m = line.match(/^(.*?)( +)(\/\/.*|#(?=\s|$).*)$/);
      if (m) { codePart = m[1] + m[2]; commentPart = m[3]; }
    }
    const rendered = isFullLineComment
      ? <span className="code-muted">{indent}{trimmed}</span>
      : commentPart
        ? <>{codePart}<span className="code-muted">{commentPart}</span></>
        : line;
    return <span key={i}>{rendered}{i < lines.length - 1 ? '\n' : ''}</span>;
  });
}
