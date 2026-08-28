'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://konduyt-api.onrender.com';

function authHeaders() {
  const t = typeof window !== 'undefined' ? localStorage.getItem('kdu_token') : null;
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}

const CATEGORIES = ['Provider', 'API', 'Payments', 'Tax', 'Security', 'Maintenance', 'Account', 'Feature', 'Deprecation', 'System'];
const SEVERITIES = ['info', 'warning', 'critical'];
const AUDIENCES = [
  ['all', 'Everyone'],
  ['provider', 'Provider'],
  ['payment_method', 'Payment method'],
  ['country', 'Country'],
  ['project', 'Specific project'],
];

const BLANK = {
  title: '', body: '', category: 'Provider', severity: 'info',
  provider: '', action_url: '', action_label: '',
  audience_type: 'all', audience_filter: '', expires_at: '', publish_at: '',
};

export default function AdminMessages() {
  useEffect(() => { document.title = 'Konduyt Admin'; }, []);
  const [gate, setGate] = useState('checking'); // checking | ok | denied | unconfigured
  const [list, setList] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (search) params.set('q', search);
    try {
      const r = await fetch(`${API_BASE}/admin/messages?${params}`, { headers: authHeaders() });
      if (r.status === 403) { setGate('denied'); return; }
      if (r.status === 503) { setGate('unconfigured'); return; }
      if (r.ok) {
        setGate('ok');
        const d = await r.json();
        setList(d.messages || []);
      }
    } catch (e) { setMsg('Could not reach the server.'); }
  }, [filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(publish) {
    setBusy(true); setMsg('');
    const payload = {
      ...form,
      publish,
      expires_at: form.expires_at || null,
      publish_at: form.publish_at || null,
      provider: form.provider || null,
      action_url: form.action_url || null,
      action_label: form.action_label || null,
      audience_filter: form.audience_filter || null,
    };
    try {
      const r = await fetch(`${API_BASE}/admin/messages`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        setMsg(publish ? 'Published.' : 'Saved as draft.');
        setForm(BLANK);
        load();
      } else {
        setMsg(d.detail || 'Could not create the message.');
      }
    } catch (e) { setMsg('Could not reach the server.'); }
    finally { setBusy(false); }
  }

  async function action(id, verb) {
    try {
      const method = verb === 'delete' ? 'DELETE' : 'POST';
      const url = verb === 'delete'
        ? `${API_BASE}/admin/messages/${id}`
        : `${API_BASE}/admin/messages/${id}/${verb}`;
      const r = await fetch(url, { method, headers: authHeaders() });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setMsg(d.detail || `Could not ${verb}.`);
      } else { load(); }
    } catch (e) { setMsg('Could not reach the server.'); }
  }

  if (gate === 'checking') {
    return <div className="admin-wrap"><div className="admin-note">Checking access…</div></div>;
  }
  if (gate === 'denied') {
    return <div className="admin-wrap"><div className="admin-note">You don&apos;t have access to this page.</div></div>;
  }
  if (gate === 'unconfigured') {
    return <div className="admin-wrap"><div className="admin-note">Admin isn&apos;t configured on this server yet.</div></div>;
  }

  return (
    <div className="admin-wrap">
      <div className="admin-top">
        <div>
          <h1 className="admin-h1">Admin · Messages</h1>
          <p className="admin-sub">Publish announcements, corrections and planned maintenance. Most operational messages are generated automatically — this is the 10–20% that isn&apos;t.</p>
        </div>
        <Link href="/dashboard/" className="admin-back">← Dashboard</Link>
      </div>

      <div className="admin-grid">
        {/* Composer */}
        <div className="admin-compose">
          <div className="admin-card-h">New message</div>
          <label className="admin-label">Title</label>
          <input className="admin-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Scheduled maintenance" />
          <label className="admin-label">Body</label>
          <textarea className="admin-textarea" rows={4} value={form.body} onChange={(e) => set('body', e.target.value)} placeholder="What developers need to know. Plain language — no internal system details." />

          <div className="admin-row2">
            <div>
              <label className="admin-label">Category</label>
              <select className="admin-input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="admin-label">Severity</label>
              <select className="admin-input" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="admin-row2">
            <div>
              <label className="admin-label">Audience</label>
              <select className="admin-input" value={form.audience_type} onChange={(e) => set('audience_type', e.target.value)}>
                {AUDIENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="admin-label">
                {form.audience_type === 'provider' ? 'Provider (e.g. paystack)'
                  : form.audience_type === 'payment_method' ? 'Method (e.g. mpesa)'
                  : form.audience_type === 'country' ? 'Country (e.g. KE)'
                  : form.audience_type === 'project' ? 'Project id'
                  : 'Filter (n/a for Everyone)'}
              </label>
              <input className="admin-input" value={form.audience_filter} disabled={form.audience_type === 'all'} onChange={(e) => set('audience_filter', e.target.value)} />
            </div>
          </div>

          <div className="admin-row2">
            <div>
              <label className="admin-label">Provider tag (optional)</label>
              <input className="admin-input" value={form.provider} onChange={(e) => set('provider', e.target.value)} placeholder="paystack" />
            </div>
            <div>
              <label className="admin-label">Expires at (optional)</label>
              <input className="admin-input" type="datetime-local" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} />
            </div>
          </div>

          <div className="admin-row2">
            <div>
              <label className="admin-label">Action label (optional)</label>
              <input className="admin-input" value={form.action_label} onChange={(e) => set('action_label', e.target.value)} placeholder="Fix connection" />
            </div>
            <div>
              <label className="admin-label">Action URL (optional)</label>
              <input className="admin-input" value={form.action_url} onChange={(e) => set('action_url', e.target.value)} placeholder="/dashboard/" />
            </div>
          </div>

          <label className="admin-label">Schedule for (optional — leave blank to publish now)</label>
          <input className="admin-input" type="datetime-local" value={form.publish_at} onChange={(e) => set('publish_at', e.target.value)} />

          <div className="admin-actions">
            <button className="admin-btn-ghost" disabled={busy || !form.title || !form.body} onClick={() => submit(false)} type="button">Save draft</button>
            <button className="admin-btn" disabled={busy || !form.title || !form.body} onClick={() => submit(true)} type="button">
              {form.publish_at ? 'Schedule' : 'Publish'}
            </button>
          </div>
          {msg && <div className="admin-msg">{msg}</div>}
        </div>

        {/* Live preview — exactly how a developer sees it */}
        <div className="admin-preview">
          <div className="admin-card-h">Preview</div>
          <div className="admin-preview-note">How developers will see this message.</div>
          <div className={`msg-card sev-${form.severity} unread`}>
            <div className="msg-card-top">
              <span className="msg-card-provider">{(form.provider || form.category || '').toUpperCase()}</span>
              <span className={`msg-sev-dot sev-${form.severity}`} />
              <span className="msg-unread-dot" />
            </div>
            <div className="msg-card-title">{form.title || 'Message title'}</div>
            <div className="msg-card-body">{form.body || 'Message body appears here.'}</div>
            {form.action_url && <span className="msg-action-btn">{form.action_label || 'View details'}</span>}
            <div className="msg-card-foot">
              <span className="msg-card-date">{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Existing messages */}
      <div className="admin-list-head">
        <div className="admin-card-h" style={{ margin: 0 }}>All messages</div>
        <div className="admin-list-filters">
          <input className="admin-input admin-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
          <select className="admin-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {['published', 'draft', 'scheduled', 'resolved', 'suppressed'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="admin-table">
        {list.length === 0 ? (
          <div className="admin-note">No messages.</div>
        ) : list.map((m) => (
          <div className="admin-tr" key={m.id}>
            <div className="admin-td-main">
              <div className="admin-td-title">
                {m.title}
                <span className={`admin-pill status-${m.status}`}>{m.status}</span>
                <span className="admin-pill src">{m.source}</span>
                <span className={`admin-pill sev-${m.severity}`}>{m.severity}</span>
              </div>
              <div className="admin-td-meta">
                {m.category}{m.provider ? ` · ${m.provider}` : ''} · {m.audience_type}{m.audience_filter ? `:${m.audience_filter}` : ''}
              </div>
            </div>
            <div className="admin-td-actions">
              {m.status === 'draft' || m.status === 'scheduled' ? (
                <button className="admin-mini" onClick={() => action(m.id, 'publish')} type="button">Publish</button>
              ) : null}
              {m.status === 'published' && (
                <>
                  <button className="admin-mini" onClick={() => action(m.id, 'resolve')} type="button">Resolve</button>
                  <button className="admin-mini" onClick={() => action(m.id, 'suppress')} type="button">Suppress</button>
                  <button className="admin-mini" onClick={() => action(m.id, 'expire')} type="button">Expire</button>
                </>
              )}
              {m.source === 'admin' && (
                <button className="admin-mini danger" onClick={() => action(m.id, 'delete')} type="button">Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
