import { useState } from 'react';
import api from '../api/axios';

export default function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    className: user.className || '',
    section: user.section || '',
    roll: user.roll || '',
    studentId: user.studentId || '',
    subject: user.subject || '',
    phone: user.phone || '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const [isActive, setIsActive] = useState(user.isActive);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setMsg('');
    try {
      await api.put(`/users/${user._id}`, form);
      setMsg('User information updated.');
      onSaved?.();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setPwMsg('Password must be at least 4 characters.');
      return;
    }
    setSavingPassword(true);
    setPwMsg('');
    try {
      await api.put(`/users/${user._id}/reset-password`, { newPassword });
      setPwMsg('Password reset successfully.');
      setNewPassword('');
    } catch (err) {
      setPwMsg(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const res = await api.patch(`/users/${user._id}/status`, { isActive: !isActive });
      setIsActive(res.data.isActive);
      onSaved?.();
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteMsg('');
    try {
      await api.delete(`/users/${user._id}`);
      onSaved?.();
      onClose();
    } catch (err) {
      setDeleteMsg(err.response?.data?.message || 'Failed to delete user');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>
            Edit {user.role}: {user.name}
            {user.isMainAdmin && (
              <span className="badge" style={{ marginLeft: 10, background: 'var(--accent)', color: '#fff', fontSize: 11, verticalAlign: 'middle' }}>
                👑 Main Admin
              </span>
            )}
          </h3>
          <button className="btn btn-outline" style={{ padding: '4px 10px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className={`badge ${isActive ? 'badge-present' : 'badge-absent'}`}>
            {isActive ? 'active' : 'inactive'}
          </span>
          {user.isMainAdmin ? (
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>The main admin account cannot be deactivated.</span>
          ) : (
            <button className="btn btn-outline" onClick={handleToggleStatus} disabled={togglingStatus}>
              {togglingStatus ? 'Updating...' : isActive ? 'Deactivate account' : 'Activate account'}
            </button>
          )}
        </div>

        <form onSubmit={handleSaveInfo} style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px' }}>Account Information</h4>
          <div className="grid grid-cols-2" style={{ marginBottom: 10 }}>
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          {user.role === 'student' && (
            <div className="grid grid-cols-2" style={{ marginBottom: 10 }}>
              <input placeholder="Student ID" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
              <input placeholder="Roll number" value={form.roll} onChange={(e) => setForm({ ...form, roll: e.target.value })} />
              <input placeholder="Class" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
              <input placeholder="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            </div>
          )}
          {user.role === 'teacher' && (
            <div className="grid grid-cols-2" style={{ marginBottom: 10 }}>
              <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
          )}
          <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={{ marginBottom: 10 }} />
          <button className="btn btn-primary" type="submit" disabled={savingInfo}>
            {savingInfo ? 'Saving...' : 'Save Changes'}
          </button>
          {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
        </form>

        <form onSubmit={handleResetPassword}>
          <h4 style={{ margin: '0 0 8px' }}>Reset Password</h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
            <button className="btn btn-outline" type="submit" disabled={savingPassword}>
              {savingPassword ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
          {pwMsg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{pwMsg}</p>}
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 8px', color: 'var(--danger)' }}>Danger Zone</h4>
          {user.isMainAdmin ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              This is the main admin account — it cannot be deleted by other admins.
            </p>
          ) : !confirmingDelete ? (
            <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
              Delete this account
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                This permanently deletes <strong>{user.name}</strong>'s account and all their login access. This cannot be undone. Are you sure?
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, delete permanently'}
                </button>
                <button className="btn btn-outline" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          {deleteMsg && <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 8 }}>{deleteMsg}</p>}
        </div>
      </div>
    </div>
  );
}
