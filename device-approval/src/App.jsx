import { useCallback, useEffect, useState } from 'react';
import { request, login, getToken, clearToken, UnauthorizedError } from './api';

const REFRESH_MS = 20000;
const STATUS_LABEL = { pending: 'Pending', approved: 'Approved', blocked: 'Blocked' };

function describeAgent(ua) {
  if (!ua) return 'Unknown system';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? `${browser} · ${os}` : browser;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Shield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoginScreen({ onSignedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      onSignedIn();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-mark">
          <Shield />
        </div>
        <h1>Device Approval Console</h1>
        <p className="muted">Restricted owner access for PCB Tracker</p>

        <label className="field">
          <span>Owner ID</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className="alert">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function LabelInput({ device, onSave }) {
  const [value, setValue] = useState(device.label || '');

  const save = () => {
    if (value.trim() !== (device.label || '')) onSave(device, value);
  };

  return (
    <input
      className="label-input"
      value={value}
      maxLength={60}
      placeholder="Add a name, e.g. Office PC 1"
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function DeviceCard({ device, busy, onAction, onRevoke, onSaveLabel }) {
  return (
    <div className={`device-card device-${device.status}`}>
      <div className="device-main">
        <div className="device-head">
          <span className="device-code">{device.deviceId}</span>
          <span className={`pill pill-${device.status}`}>{STATUS_LABEL[device.status]}</span>
        </div>
        <LabelInput key={device.label} device={device} onSave={onSaveLabel} />
        <dl className="device-meta">
          <div>
            <dt>System</dt>
            <dd>{describeAgent(device.userAgent)}</dd>
          </div>
          <div>
            <dt>IP address</dt>
            <dd className="mono">{device.lastIp || '—'}</dd>
          </div>
          <div>
            <dt>Requested by</dt>
            <dd>
              {device.requestedBy ? `${device.requestedBy.name} (${device.requestedBy.userId})` : '—'}
            </dd>
          </div>
          <div>
            <dt>Last used by</dt>
            <dd>{device.lastUser ? `${device.lastUser.name} (${device.lastUser.userId})` : '—'}</dd>
          </div>
          <div>
            <dt>First seen</dt>
            <dd>{formatDate(device.createdAt)}</dd>
          </div>
          <div>
            <dt>Last login attempt</dt>
            <dd>{formatDate(device.lastUsedAt)}</dd>
          </div>
        </dl>
      </div>
      <div className="device-actions">
        {device.status !== 'approved' && (
          <button className="btn btn-approve" disabled={busy} onClick={() => onAction(device, 'approve')}>
            Approve
          </button>
        )}
        {device.status !== 'blocked' && (
          <button className="btn btn-block-action" disabled={busy} onClick={() => onAction(device, 'block')}>
            Block
          </button>
        )}
        <button className="btn btn-ghost" disabled={busy} onClick={() => onRevoke(device)}>
          Revoke
        </button>
      </div>
    </div>
  );
}

function Dashboard({ onSignOut }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const handleError = useCallback(
    (err) => {
      if (err instanceof UnauthorizedError) onSignOut(err.message);
      else setError(err.message);
    },
    [onSignOut]
  );

  const load = useCallback(async () => {
    try {
      setDevices(await request('GET', '/devices'));
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const runAction = async (device, action) => {
    setBusyId(device._id);
    try {
      if (action === 'revoke') {
        await request('DELETE', `/devices/${device._id}`);
        setRevokeConfirm(null);
      } else {
        await request('PATCH', `/devices/${device._id}/${action}`);
      }
      setNotice(`${device.deviceId} ${{ approve: 'approved', block: 'blocked', revoke: 'revoked' }[action]}`);
      await load();
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId(null);
    }
  };

  const saveLabel = async (device, label) => {
    try {
      await request('PUT', `/devices/${device._id}`, { label });
      setNotice('Device name saved');
      await load();
    } catch (err) {
      handleError(err);
    }
  };

  const counts = {
    pending: devices.filter((d) => d.status === 'pending').length,
    approved: devices.filter((d) => d.status === 'approved').length,
    blocked: devices.filter((d) => d.status === 'blocked').length,
    all: devices.length,
  };

  const q = search.trim().toLowerCase();
  const visible = devices.filter((d) => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (!q) return true;
    return [d.deviceId, d.label, d.lastIp, d.requestedBy?.name, d.requestedBy?.userId, d.lastUser?.name, d.lastUser?.userId]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q));
  });

  const tabs = [
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['blocked', 'Blocked'],
    ['all', 'All'],
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Shield />
          </span>
          <div>
            <div className="brand-title">Device Approval Console</div>
            <div className="brand-sub">PCB Tracker · Owner access</div>
          </div>
        </div>
        <button className="btn btn-ghost-light" onClick={() => onSignOut()}>
          Sign out
        </button>
      </header>

      <main className="content">
        <div className="stats">
          <div className={`stat stat-pending ${counts.pending > 0 ? 'stat-alert' : ''}`}>
            <div className="stat-value">{counts.pending}</div>
            <div className="stat-label">Awaiting approval</div>
          </div>
          <div className="stat stat-approved">
            <div className="stat-value">{counts.approved}</div>
            <div className="stat-label">Approved systems</div>
          </div>
          <div className="stat stat-blocked">
            <div className="stat-value">{counts.blocked}</div>
            <div className="stat-label">Blocked</div>
          </div>
          <div className="stat">
            <div className="stat-value">{counts.all}</div>
            <div className="stat-label">Total registered</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-toolbar">
            <div className="tabs">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  className={`tab ${filter === key ? 'tab-active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  <span className="tab-count">{counts[key]}</span>
                </button>
              ))}
            </div>
            <div className="toolbar-right">
              <input
                className="search"
                placeholder="Search device ID, name, user, IP…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn btn-ghost" onClick={load}>
                Refresh
              </button>
            </div>
          </div>

          {error && <div className="alert alert-inline">{error}</div>}

          {loading ? (
            <div className="empty">Loading devices…</div>
          ) : visible.length === 0 ? (
            <div className="empty">
              {filter === 'pending' && !q
                ? 'No devices are waiting for approval.'
                : 'No devices match this view.'}
            </div>
          ) : (
            <div className="device-list">
              {visible.map((d) => (
                <DeviceCard
                  key={d._id}
                  device={d}
                  busy={busyId !== null}
                  onAction={runAction}
                  onRevoke={setRevokeConfirm}
                  onSaveLabel={saveLabel}
                />
              ))}
            </div>
          )}

          <div className="panel-foot">
            Auto-refreshes every {REFRESH_MS / 1000}s
            {updatedAt && ` · Last updated ${updatedAt.toLocaleTimeString()}`}
          </div>
        </div>
      </main>

      {notice && <div className="toast">{notice}</div>}

      {revokeConfirm && (
        <div className="overlay" onClick={() => setRevokeConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Revoke device?</h3>
            <p>
              <strong>{revokeConfirm.label || revokeConfirm.deviceId}</strong> will be signed out and removed. If it
              tries to log in again it will appear here as a new pending request.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setRevokeConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={busyId !== null}
                onClick={() => runAction(revokeConfirm, 'revoke')}
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [signedIn, setSignedIn] = useState(() => Boolean(getToken()));
  const [message, setMessage] = useState('');

  const signOut = useCallback((reason) => {
    clearToken();
    setMessage(typeof reason === 'string' ? reason : '');
    setSignedIn(false);
  }, []);

  if (!signedIn) {
    return (
      <>
        {message && <div className="toast toast-top">{message}</div>}
        <LoginScreen
          onSignedIn={() => {
            setMessage('');
            setSignedIn(true);
          }}
        />
      </>
    );
  }

  return <Dashboard onSignOut={signOut} />;
}
