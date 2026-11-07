'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  fetchTwinStatus, fetchTwinContext, updateTwinProfile,
  observeTwin, dismissObservation,
} from './store';

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
//
// What the creator can see and correct is first-class here: the panel lists the
// patterns the Twin has derived, each with a remove control, and offers to keep
// a page out of the Twin's view entirely. An observation the creator removes is
// removed on the server too, so it does not return on the next pass.

const QUICK = [
  { label: "I'm stuck", q: 'I am stuck on this idea' },
  { label: 'Challenge my argument', q: 'challenge my argument' },
  { label: 'Have I explored this before?', q: 'have I explored this before' },
  { label: 'Am I repeating myself?', q: 'am I repeating myself across my work' },
  { label: 'What does this connect to?', q: 'what does this connect to in my other ideas' },
  { label: 'What angles am I missing?', q: 'what other angles am I missing' },
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
  const [observing, setObserving] = useState(false);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = await fetchTwinStatus({ apiBase, token });
      if (!cancelled) {
        setStatus(d || { enabled: false, provider: { available: false } });
        if (d) onEnabledChange(!!d.enabled);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, token]);

  async function enable() {
    setBusy(true);
    try {
      const d = await updateTwinProfile({ apiBase, token, patch: { enabled: true } });
      onEnabledChange(!!(d && d.profile && d.profile.enabled));
      setStatus((s) => ({ ...(s || {}), enabled: true }));
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      await updateTwinProfile({ apiBase, token, patch: { enabled: false } });
      onEnabledChange(false);
      setStatus((s) => ({ ...(s || {}), enabled: false }));
    } finally { setBusy(false); }
  }

  async function loadContext() {
    const d = await fetchTwinContext({ apiBase, token, docId });
    setContext(d);
    setShowContext(true);
  }

  // Re-derive now. The server already does this after a sync that changed
  // something; this button exists so the creator does not have to wait for the
  // next save to see the Twin catch up.
  async function observeNow() {
    setObserving(true);
    try {
      const d = await observeTwin({ apiBase, token, force: true });
      if (d && context) setContext({ ...context, observed: d.observed || [] });
      await loadContext();
    } finally { setObserving(false); }
  }

  async function dismiss(kind, value) {
    const d = await dismissObservation({ apiBase, token, kind, value });
    if (d && context) setContext({ ...context, observed: d.observed || [] });
  }

  // Keep this page out of the Twin's view. The server enforces it; this only
  // sends the intent, so a creator's private page stays private even if the
  // client were to ask for it.
  async function toggleExcludeThisPage() {
    const current = (context && context.excluded_doc_ids) || [];
    const next = current.includes(docId)
      ? current.filter((x) => x !== docId)
      : [...current, docId];
    await updateTwinProfile({ apiBase, token, patch: { excluded_doc_ids: next } });
    await loadContext();
  }

  async function saveDirection() {
    if (!direction.trim()) return;
    await updateTwinProfile({ apiBase, token, patch: { direction } });
    setDirection('');
    await loadContext();
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
  const excluded = (context && context.excluded_doc_ids) || [];
  const isExcluded = docId && excluded.includes(docId);

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
            <button className="twin-link" onClick={observeNow} disabled={observing}>
              {observing ? 'Looking…' : 'Update what it knows'}
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
                {(context.excluded_doc_ids || []).length > 0 && (
                  <li>{context.excluded_doc_ids.length} idea(s) you&apos;ve kept out of view</li>
                )}
              </ul>

              {docId && (
                <label className="twin-exclude">
                  <input type="checkbox" checked={!!isExcluded}
                         onChange={toggleExcludeThisPage} />
                  Keep this idea out of the Twin
                </label>
              )}

              <span className="twin-context-title">
                Patterns in your writing
                {context.observed_at
                  ? <span className="twin-observed-at"> · as of {fmtWhen(context.observed_at)}</span>
                  : null}
              </span>
              {(context.observed || []).length === 0 ? (
                <p className="twin-context-note">
                  Nothing learned yet. As you write, the Twin will note patterns
                  in your own words here — you can remove any of them.
                </p>
              ) : (
                <ul className="twin-context-list">
                  {context.observed.map((o, i) => (
                    <li key={i} className="twin-observation">
                      <span>{describeObservation(o)}</span>
                      <button className="twin-observation-x"
                              title="Remove this — it won't come back"
                              onClick={() => dismiss(o.kind, o.value)}>×</button>
                    </li>
                  ))}
                </ul>
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

// Render one derived observation in the creator's own terms. Every branch shows
// the evidence the server attached, so a pattern reads as something found in the
// writing rather than an assertion about the person.
function describeObservation(o) {
  if (!o) return null;
  const note = o.evidence && o.evidence.note ? ` (${o.evidence.note})` : '';
  if (o.kind === 'recurring_subject') {
    return <>You write about <strong>{o.value}</strong> often{note}.</>;
  }
  if (o.kind === 'titles_without_body') {
    return <>{o.value} of your ideas are still just a title{note}.</>;
  }
  if (o.kind === 'status_mix') {
    const parts = Object.entries(o.value || {}).map(([k, v]) => `${v} ${k}`);
    return <>Your ideas by stage: {parts.join(', ')}.</>;
  }
  // An unrecognised kind is shown by its own name rather than hidden: a pattern
  // the client does not understand is still the creator's to see and remove.
  return <>{String(o.kind)}{note}.</>;
}

function fmtWhen(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch (e) { return ''; }
}
