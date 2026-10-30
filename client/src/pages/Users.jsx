import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import Spinner from '../components/Spinner';
import { useToast, extractErrorMessage } from '../context/ToastContext';

const emptyForm = { name: '', userId: '', password: '', role: 'team', assignedStage: '' };

function UserModal({ mode, initial, stages, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = [];
    if (!form.name.trim()) errs.push('Name is required');
    if (mode === 'add' && !form.userId.trim()) errs.push('User ID is required');
    if (mode === 'add' && !form.password.trim()) errs.push('Password is required');
    if (form.role === 'team' && !form.assignedStage) errs.push('Department is required for team role');
    setErrors(errs);
    if (errs.length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        assignedStage: form.role === 'team' ? Number(form.assignedStage) : undefined,
      };
      if (mode === 'add') {
        payload.userId = form.userId.trim();
        payload.password = form.password;
        await api.post('/users', payload);
        toast.success('User created');
      } else {
        if (form.password) payload.password = form.password;
        await api.put(`/users/${form._id}`, payload);
        toast.success('User updated');
      }
      onSaved();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to save user');
      setErrors([msg]);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'add' ? 'Add User' : 'Edit User'}</h3>
        <form onSubmit={handleSubmit} className="form-grid form-grid-modal">
          <label className="field">
            <span className="field-label">Name</span>
            <input type="text" value={form.name} onChange={update('name')} required />
          </label>
          <label className="field">
            <span className="field-label">User ID</span>
            <input type="text" value={form.userId} onChange={update('userId')} disabled={mode === 'edit'} required />
          </label>
          <label className="field">
            <span className="field-label">{mode === 'add' ? 'Password' : 'Reset Password (optional)'}</span>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder={mode === 'edit' ? 'Leave blank to keep current' : ''}
              required={mode === 'add'}
            />
          </label>
          <label className="field">
            <span className="field-label">Role</span>
            <select value={form.role} onChange={update('role')}>
              <option value="manager">Manager</option>
              <option value="team">Team</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {form.role === 'team' && (
            <label className="field">
              <span className="field-label">Department</span>
              <select value={form.assignedStage} onChange={update('assignedStage')} required>
                <option value="">Select stage…</option>
                {stages.map((s) => (
                  <option key={s.stageNumber} value={s.stageNumber}>
                    {s.stageNumber}. {s.stageName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </form>

        {errors.length > 0 && (
          <div className="form-error">
            <ul>
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StageModal({ mode, initial, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(initial || { stageNumber: '', stageName: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.stageNumber || !form.stageName.trim()) {
      setError('Stage number and name are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (mode === 'add') {
        await api.post('/stages', { stageNumber: Number(form.stageNumber), stageName: form.stageName.trim() });
        toast.success('Stage added');
      } else {
        await api.put(`/stages/${form._id}`, {
          stageNumber: Number(form.stageNumber),
          stageName: form.stageName.trim(),
        });
        toast.success('Stage updated');
      }
      onSaved();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to save stage');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'add' ? 'Add Stage' : 'Rename Stage'}</h3>
        <form onSubmit={handleSubmit} className="form-grid form-grid-modal">
          <label className="field">
            <span className="field-label">Stage Number</span>
            <input
              type="number"
              min="1"
              value={form.stageNumber}
              onChange={(e) => setForm((f) => ({ ...f, stageNumber: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Stage Name</span>
            <input
              type="text"
              value={form.stageName}
              onChange={(e) => setForm((f) => ({ ...f, stageName: e.target.value }))}
              required
            />
          </label>
        </form>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const chars = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0][0]];
  return chars.join('').toUpperCase();
}

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userModal, setUserModal] = useState(null);
  const [stageModal, setStageModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [movingId, setMovingId] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const stageNameByNumber = useCallback(
    (num) => stages.find((s) => s.stageNumber === num)?.stageName || (num ? `Stage ${num}` : '—'),
    [stages]
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, stagesRes] = await Promise.all([api.get('/users'), api.get('/stages')]);
      setUsers(usersRes.data);
      setStages(stagesRes.data);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleToggle = async (user) => {
    try {
      await api.patch(`/users/${user._id}/toggle`);
      toast.success(`${user.name} ${user.isActive ? 'deactivated' : 'activated'}`);
      fetchAll();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to update user'));
    }
  };

  const handleMoveStage = async (stage, direction) => {
    setMovingId(stage._id);
    try {
      const res = await api.patch(`/stages/${stage._id}/move`, { direction });
      setStages(res.data);
      // Team members follow their stage to its new number.
      const usersRes = await api.get('/users');
      setUsers(usersRes.data);
      toast.success(`${stage.stageName} moved ${direction}`);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to reorder stage'));
    } finally {
      setMovingId(null);
    }
  };

  const handleDeleteStage = async (stage) => {
    try {
      await api.delete(`/stages/${stage._id}`);
      toast.success('Stage deleted');
      setDeleteConfirm(null);
      fetchAll();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete stage'));
      setDeleteConfirm(null);
    }
  };

  if (loading) return <Spinner label="Loading…" />;

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const teamCount = users.filter((u) => u.role === 'team').length;
  const roleBadgeClass = { admin: 'badge-navy', manager: 'badge-blue', team: 'badge-grey' };
  const avatarClass = { admin: 'user-avatar-admin', manager: 'user-avatar-manager', team: 'user-avatar-team' };

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.userId.toLowerCase().includes(q);
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-subtitle">Manage accounts, roles, and department access</p>
        </div>
        <button className="btn btn-primary" onClick={() => setUserModal({ mode: 'add' })}>
          + Add User
        </button>
      </div>

      <div className="summary-row summary-row-4">
        <div className="summary-card">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a4 4 0 100-8 4 4 0 000 8zM20 20v-1a4 4 0 00-3-3.87M15 3.13a4 4 0 010 7.75"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="summary-value">{users.length}</div>
            <div className="summary-label">Total Users</div>
          </div>
        </div>
        <div className="summary-card summary-green">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="summary-value">{activeCount}</div>
            <div className="summary-label">Active</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15a6 6 0 100-12 6 6 0 000 12zM4 21a8 8 0 0116 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="summary-value">{adminCount}</div>
            <div className="summary-label">Admins</div>
          </div>
        </div>
        <div className="summary-card summary-yellow">
          <div className="summary-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4M3 10l9 4 9-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="summary-value">{teamCount}</div>
            <div className="summary-label">Team Members</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by name or User ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="toolbar-search"
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="toolbar-select">
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="team">Team</option>
          </select>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="empty-state">No users match your search.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u._id} className={u.isActive ? '' : 'row-inactive'}>
                    <td>
                      <div className="user-cell">
                        <div className={`user-avatar ${avatarClass[u.role] || ''}`}>{initials(u.name)}</div>
                        <div>
                          <div className="user-cell-name">{u.name}</div>
                          <div className="user-cell-sub mono">{u.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleBadgeClass[u.role] || 'badge-grey'} capitalize`}>{u.role}</span>
                    </td>
                    <td>{u.role === 'team' ? stageNameByNumber(u.assignedStage) : '—'}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-grey'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setUserModal({
                            mode: 'edit',
                            initial: { ...u, password: '', assignedStage: u.assignedStage || '' },
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className={`btn btn-ghost btn-sm ${u.isActive ? 'btn-danger' : ''}`}
                        onClick={() => handleToggle(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="page-header page-header-tight">
        <div className="section-head">
          <div className="section-head-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="section-head-text">
            <h2 className="section-title">Stage Management</h2>
            <div className="section-head-sub">Define production stages and their order</div>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => setStageModal({ mode: 'add' })}>
          + Add Stage
        </button>
      </div>

      <div className="card">
        {stages.length === 0 ? (
          <div className="empty-state">No stages configured yet.</div>
        ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sequence</th>
                <th>Stage Name</th>
                <th>Team</th>
                <th>Reorder</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, idx) => {
                const members = users.filter((u) => u.role === 'team' && u.assignedStage === s.stageNumber);
                return (
                <tr key={s._id}>
                  <td>
                    <span className="stage-seq">{s.stageNumber}</span>
                  </td>
                  <td>{s.stageName}</td>
                  <td className="text-muted">
                    {members.length === 0 ? '—' : `${members.length} member${members.length > 1 ? 's' : ''}`}
                  </td>
                  <td>
                    <div className="reorder-btns">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Move up"
                        aria-label={`Move ${s.stageName} up`}
                        disabled={idx === 0 || movingId !== null}
                        onClick={() => handleMoveStage(s, 'up')}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        title="Move down"
                        aria-label={`Move ${s.stageName} down`}
                        disabled={idx === stages.length - 1 || movingId !== null}
                        onClick={() => handleMoveStage(s, 'down')}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="row-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setStageModal({ mode: 'edit', initial: s })}
                    >
                      Rename
                    </button>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setDeleteConfirm(s)}>
                      Delete
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {userModal && (
        <UserModal
          mode={userModal.mode}
          initial={userModal.initial}
          stages={stages}
          onClose={() => setUserModal(null)}
          onSaved={() => {
            setUserModal(null);
            fetchAll();
          }}
        />
      )}

      {stageModal && (
        <StageModal
          mode={stageModal.mode}
          initial={stageModal.initial}
          onClose={() => setStageModal(null)}
          onSaved={() => {
            setStageModal(null);
            fetchAll();
          }}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Stage</h3>
            <p>
              Delete stage <strong>{deleteConfirm.stageNumber}. {deleteConfirm.stageName}</strong>? This cannot be
              undone if no active orders are on this stage.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-danger" onClick={() => handleDeleteStage(deleteConfirm)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
