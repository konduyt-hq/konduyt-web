'use client';

// Konduyt Users -- a minimal, admin-only view of the developers on the
// platform, rendered under Dashboard -> Users.
//
// Scope is deliberately narrow. The only user endpoint the API exposes is
// GET /admin/analytics/users (read-only: name, email, presence, sessions).
// There is NO admin user-management API -- no role change, no suspend or
// deactivate, no invite, no delete-another-user. (DELETE /account exists but
// only ever deletes the AUTHENTICATED user's own account; it is not an admin
// control.) So this view offers no management controls at all rather than
// rendering buttons that would call endpoints that do not exist. That
// limitation is stated in the UI, not hidden.
//
// Everything shown is read live from the API; nothing is computed here.

import { useState, useEffect, useCallback } from 'react';

function fmtDate(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleString(); } catch (e) { return String(v); }
}
function fmtDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const s = Math.round(Number(seconds));
  if (!Number.isFinite(s)) return '—';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60), rm = m % 60;
  return `${h}h ${rm}m`;
}

export default function UsersTab({ apiBase, authHeaders, onError }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/admin/analytics/users`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const d = await r.json();
      setUsers(d.users || []); setError('');
    } catch (e) { setError(e.message); onError && onError(e.message); }
    setLoading(false);
  }, [apiBase, authHeaders, onError]);

  useEffect(() => { load(); }, [load]);

  const list = users || [];
  const online = list.filter((u) => u.online_now).length;

  return (
    <div className="an-root">
      <div className="con-home-head con-home-head-row">
        <div>
          <h1 className="con-h1">Users</h1>
          <p className="con-sub">
            Developers on the platform, read live from the API. Presence is a real heartbeat,
            not a guess.
          </p>
        </div>
        <button className="preview-checkout-btn" type="button" disabled={loading} onClick={load}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Honest limitation: there is no user-management API to drive controls. */}
      <div className="an-section">
        <p className="con-sub">
          <strong>Read-only.</strong> The API currently exposes no user-management actions — no
          role change, suspend, invite or delete-another-user endpoint exists. No controls are
          shown here rather than offering buttons that could not work.
        </p>
      </div>

      {error && !users && (
        <p className="con-sub" style={{ color: '#b91c1c' }}>
          Could not load users: {error}. This is a fetch failure — it does not mean there are no
          users.
        </p>
      )}
      {!users && !error && <p className="con-sub">Loading users…</p>}

      {users && (
        <div className="an-section">
          <h2 className="an-section-h">
            {list.length} user{list.length === 1 ? '' : 's'}
            {list.length > 0 ? ` · ${online} online now` : ''}
          </h2>
          {list.length === 0 ? (
            <p className="con-sub">No users yet.</p>
          ) : (
            <div className="fee-bands-table-wrap">
              <table className="sentinel-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Last seen</th>
                    <th>Signed up</th>
                    <th>Sessions</th>
                    <th>Avg session</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => (
                    <tr key={u.user_id}>
                      <td>{u.name || '—'}</td>
                      <td>{u.email || '—'}</td>
                      <td>
                        <span className={u.online_now
                          ? 'sentinel-pill sentinel-pill-healthy' : 'sentinel-pill sentinel-pill-idle'}>
                          {u.online_now ? 'online' : 'offline'}
                        </span>
                      </td>
                      <td>{fmtDate(u.last_seen_at)}</td>
                      <td>{fmtDate(u.signed_up_at)}</td>
                      <td>{u.session_count ?? '—'}</td>
                      <td>{fmtDuration(u.avg_session_duration_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
