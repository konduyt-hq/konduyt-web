'use client';

import { useState, useEffect, useCallback } from 'react';

// The Creator Twin panel.
//
// Four rules are visible in this component's shape, not just in comments:
//
//  1. **Off until invited.** With the Twin disabled the panel shows a short
//     explanation and one button. It does not pre-load suggestions, and it does
//     not ask the server anything until the creator turns it on.
//
//  2. **Only when asked.** There is no timer and no watcher. `ask()` is called
//     from a button the creator pressed, and from nothing else.
//
//  3. **It never edits the document.** A response is text in this panel. Putting
//     it into the idea is a separate button (`Insert into idea`) that calls back
//     into the editor, which records the change as `twin_accepted`.
//
//  4. **It says when it cannot help.** The server reports whether a model is
//     configured; when a request needs one and none exists, the panel shows that
//     plainly rather than presenting a deterministic answer as a generated one.

const QUICK = [
  { label: "I'm stuck", q: 'I am stuck on this idea' },
  { label: 'Challenge my argument', q: 'challenge my argument' },
  { label: 'Have I explored this before?', q: 'have I explored this before' },
  { label: 'What am I missing?', q: 'what am I missing' },
  { label: 'Ask me questions', q: 'ask me questions about this' },
  { label: 'Could this be a video?', q: 'could this work as a video' },
];

export default function TwinPanel({
  apiBase, token, docId, docTitle, enabled, onEnabledChange, onInsert, onClose,
}) {
  const [status, setStatus] = useState(null);
  const [thread, setThread] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [direction, setDirection] = useState('');

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${apiBase}/creatoros/twin/status`,
                               { headers: authHeaders() });
        const d = await r.json();
        if (!cancelled) { setStatus(d); onEnabledChange(!!d.enabled); }
      } catch (e) {
        if (!cancelled) setStatus({ enabled: false, provider: { available: false } });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, token]);

  async function enable() {
    setBusy(true);
    try {
      const r = await fetch(`${apiBase}/creatoros/twin/profile`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ enabled: true }),
      });
      const d = await r.json();
      onEnabledChange(!!d.profile.enabled);
      setStatus((s) => ({ ...(s || {}), enabled: true }));
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      await fetch(`${apiBase}/creatoros/twin/profile`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ enabled: false }),
      });
      onEnabledChange(false);
      setStatus((s) => ({ ...(s || {}), enabled: false }));
    } finally { setBusy(false); }
  }

  async function loadContext() {
    try {
      const r = await fetch(`${apiBase}/creatoros/twin/context?doc_id=${encodeURIComponent(docId || '')}`,
                            { headers: authHeaders() });
      setContext(await r.json());
      setShowContext(true);
    } catch (e) { setContext(null); }
  }

  async function saveDirection() {
    if (!direction.trim()) return;
    await fetch(`${apiBase}/creatoros/twin/profile`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ direction }),
    });
    setDirection('');
  }

  async function ask(question) {
    const q = (question || input).trim();
    if (!q || busy) return;
    setBusy(true);
    setThread((t) => [...t, { role: 'you', text: q }]);
    setInput('');
    try {
      const r = await fetch(`${apiBase}/creatoros/twin/ask`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ question: q, doc_id: docId, mode: 'conversation' }),
      });
      const d = await r.json();
      setThread((t) => [...t, {
        role: 'twin', text: d.response, kind: d.response_kind,
        provider: d.provider, id: d.suggestion_id, reason: d.reason,
      }]);
    } catch (e) {
      setThread((t) => [...t, {
        role: 'twin', kind: 'error',
        text: "I couldn't reach the server. Your writing is safe — it's saved on this device.",
      }]);
    } finally { setBusy(false); }
  }

  async function decide(id, accepted) {
    if (!id) return;
    try {
      await fetch(`${apiBase}/creatoros/twin/suggestions/${id}/decide`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(accepted ? { accepted: true } : { rejected: true }),
      });
      setThread((t) => t.map((m) => (m.id === id ? { ...m, decided: accepted ? 'accepted' : 'rejected' } : m)));
    } catch (e) { /* the decision is not worth blocking on */ }
  }

  const modelAvailable = status?.provider?.available;

  return (
    <aside className="twin-panel">
      <div className="twin-head">
        <span className="twin-title">Creator Twin</span>
        <button className="twin-close" onClick={onClose} title="Close">×</button>
      </div>

      {!enabled ? (
        <div className="twin-off">
          <p>
            The Twin helps you think about what you&apos;re writing: it can tell
            you what you&apos;ve already said about a subject, where you&apos;ve
            been before, and ask you questions about the idea in front of you.
          </p>
          <p className="twin-off-note">
            It stays off until you switch it on, it only runs when you ask, and
            it never changes your words. Turning it on is your decision and you
            can turn it off at any time.
          </p>
          <button className="btn-primary" onClick={enable} disabled={busy}>
            {busy ? 'Turning on…' : 'Turn on my Twin'}
          </button>
        </div>
      ) : (
        <>
          <div className="twin-status">
            <span className="twin-on-dot" />
            <span>On · {modelAvailable ? `using ${status?.provider?.model || 'a model'}` : 'your own writing only'}</span>
            <button className="twin-link" onClick={disable} disabled={busy}>Turn off</button>
          </div>

          {!modelAvailable && (
            <p className="twin-note">
              No AI provider is set up for this deployment, so the Twin works
              from your own writing and clear analysis. Anything that would need
              a model — like writing a draft for you — it will decline rather
              than guess.
            </p>
          )}

          <div className="twin-context-row">
            <button className="twin-link" onClick={loadContext}>
              What does my Twin know?
            </button>
          </div>

          {showContext && context && (
            <div className="twin-context">
              <span className="twin-context-title">What it can see</span>
              <ul className="twin-context-list">
                <li>
                  Your direction: {context.declared?.direction || <em>not set</em>}
                </li>
                <li>Interests: {(context.declared?.interests || []).join(', ') || <em>none set</em>}</li>
                <li>{context.idea_count} of your ideas, by title</li>
              </ul>
              {(context.observed || []).length > 0 && (
                <>
                  <span className="twin-context-title">Patterns in your writing</span>
                  <ul className="twin-context-list">
                    {context.observed.slice(0, 5).map((o, i) => (
                      <li key={i}>
                        {o.kind === 'recurring_subject'
                          ? <>You write about <strong>{o.value}</strong> often ({o.evidence?.note}).</>
                          : o.kind === 'titles_without_body'
                            ? <>{o.value} of your ideas are still just a title.</>
                            : <>Your ideas by stage: {Object.entries(o.value || {}).map(([k, v]) => `${k} ${v}`).join(', ')}.</>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="twin-context-note">
                These are patterns in what you&apos;ve written, not claims about
                you. Tell the Twin your direction below and it will use that
                instead of guessing.
              </p>
              <div className="twin-direction">
                <input
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  placeholder="e.g. weekly long-form video about craft"
                />
                <button onClick={saveDirection}>Save</button>
              </div>
            </div>
          )}

          <div className="twin-quick">
            {QUICK.map((k) => (
              <button key={k.label} className="twin-chip" onClick={() => ask(k.q)}
                      disabled={busy}>{k.label}</button>
            ))}
          </div>

          <div className="twin-thread">
            {thread.length === 0 && (
              <p className="twin-empty">
                Ask about {docTitle ? `“${docTitle}”` : 'this idea'}. Nothing
                happens until you do.
              </p>
            )}
            {thread.map((m, i) => (
              <div key={i} className={`twin-msg twin-msg-${m.role}`}>
                <span className="twin-msg-role">{m.role === 'you' ? 'You' : 'Twin'}</span>
                <p className="twin-msg-text">{m.text}</p>
                {m.role === 'twin' && m.kind === 'unavailable' && (
                  <span className="twin-msg-tag twin-msg-tag-warn">
                    No model configured — this needed one
                  </span>
                )}
                {m.role === 'twin' && m.kind === 'draft' && (
                  <span className="twin-msg-tag">Generated — yours to edit or discard</span>
                )}
                {m.role === 'twin' && m.text && m.kind !== 'error' && (
                  <div className="twin-msg-actions">
                    <button
                      className="twin-insert"
                      onClick={() => onInsert(m.text)}
                      title="Adds this to the end of your idea as a new block"
                    >
                      Insert into idea
                    </button>
                    {m.id && !m.decided && (
                      <>
                        <button className="twin-link" onClick={() => decide(m.id, true)}>Keep</button>
                        <button className="twin-link" onClick={() => decide(m.id, false)}>Discard</button>
                      </>
                    )}
                    {m.decided && (
                      <span className="twin-decided">
                        {m.decided === 'accepted' ? 'Kept' : 'Discarded'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="twin-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this idea…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); }
              }}
            />
            <button className="btn-primary" onClick={() => ask()} disabled={busy || !input.trim()}>
              {busy ? '…' : 'Ask'}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
