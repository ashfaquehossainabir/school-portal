import { useEffect, useState } from 'react';
import api from '../../api/axios';
import EditUserModal from '../../components/EditUserModal';
import TeacherAssignments from '../../components/TeacherAssignments';
import ParentLinkManager from '../../components/ParentLinkManager';

const emptyForm = {
  name: '', email: '', password: '', role: 'student',
  className: '', section: '', roll: '', studentId: '', subject: '', phone: '',
};

export default function AdminUsers() {
  const [form, setForm] = useState(emptyForm);
  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = () => {
    api.get('/users', { params: filterRole ? { role: filterRole } : {} }).then((res) => setUsers(res.data));
  };

  useEffect(loadUsers, [filterRole]);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.studentId?.toLowerCase().includes(q) ||
      u.className?.toLowerCase().includes(q) ||
      u.subject?.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.post('/auth/create-user', form);
      setMsg(`${form.role} account created.`);
      setForm(emptyForm);
      if (!filterRole || filterRole === form.role) loadUsers();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Users</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Create Account</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3" style={{ marginBottom: 12 }}>
            <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input type="password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="grid grid-cols-3" style={{ marginBottom: 12 }}>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
            {form.role === 'student' && (
              <>
                <input placeholder="Class e.g. Class 8" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
                <input placeholder="Section e.g. A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
              </>
            )}
            {form.role === 'student' && (
              <>
                <input
                  placeholder="Student ID e.g. STU2026014"
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  required
                />
                <input placeholder="Roll number (optional)" value={form.roll} onChange={(e) => setForm({ ...form, roll: e.target.value })} />
              </>
            )}
            {form.role === 'teacher' && (
              <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            )}
            <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Account'}
          </button>
          {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
        </form>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>
          Student ID can be any mix of letters and numbers (e.g. <code>STU2026014</code>) and must be unique — students can log in with either their email or this ID.
        </p>
      </div>

      <TeacherAssignments />

      <ParentLinkManager />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ margin: 0 }}>All Users</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by name, email, or Student ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 260 }}
            />
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ width: 160 }}>
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="parent">Parents</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Email</th><th>Details</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr><td colSpan={6} style={{ color: 'var(--text-secondary)' }}>No users match your search.</td></tr>
              )}
              {filteredUsers.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td><span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{u.role}</span></td>
                  <td>{u.email}</td>
                  <td>
                    {u.role === 'student' && `${u.studentId || '—'} · ${u.className || '—'} ${u.section || ''}`}
                    {u.role === 'teacher' && (u.subject || '—')}
                    {u.role === 'parent' && `${u.children?.length || 0} child(ren)`}
                    {u.role === 'admin' && '—'}
                  </td>
                  <td>{u.isActive ? <span className="badge badge-present">active</span> : <span className="badge badge-absent">inactive</span>}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setEditingUser(u)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={loadUsers}
        />
      )}
    </div>
  );
}
