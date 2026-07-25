import { useEffect, useState } from 'react';
import api from '../../api/axios';
import UserSearchSelect from '../../components/UserSearchSelect';

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ className: '', section: '', subjects: '' });
  const [formTeacher, setFormTeacher] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [resetSignal, setResetSignal] = useState(0);

  const [editingId, setEditingId] = useState(null);
  const [editTeacher, setEditTeacher] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadClasses = () => {
    api.get('/classes').then((res) => setClasses(res.data));
  };

  useEffect(loadClasses, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.post('/classes', {
        className: form.className,
        section: form.section,
        subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
        classTeacher: formTeacher?._id || undefined,
      });
      setForm({ className: '', section: '', subjects: '' });
      setFormTeacher(null);
      setResetSignal((n) => n + 1);
      setMsg('Class created.');
      loadClasses();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to create class');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/classes/${id}`);
    loadClasses();
  };

  const startEditTeacher = (c) => {
    setEditingId(c._id);
    setEditTeacher(c.classTeacher || null);
  };

  const saveClassTeacher = async (id) => {
    setSavingEdit(true);
    try {
      await api.put(`/classes/${id}`, { classTeacher: editTeacher?._id || null });
      setEditingId(null);
      loadClasses();
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Classes</h2>

      <div className="modal-wrapper" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Create Class</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3" style={{ marginBottom: 12 }}>
            <input placeholder="Class name e.g. Class 8" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} required />
            <input placeholder="Section e.g. A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required />
            <input placeholder="Subjects (comma separated)" value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <UserSearchSelect
              role="teacher"
              placeholder="Search & assign class teacher (optional)"
              onSelect={setFormTeacher}
              resetSignal={resetSignal}
              width={300}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Class'}
          </button>
          {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
        </form>
      </div>

      <div className="grid grid-cols-3">
        {classes.map((c) => (
          <div className="card" key={c._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0 }}>{c.className} - {c.section}</h4>
              <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(c._id)}>Delete</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 8 }}>
              Subjects: {c.subjects?.join(', ') || '—'}
            </p>

            {editingId === c._id ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <UserSearchSelect
                  role="teacher"
                  placeholder="Search teacher..."
                  onSelect={setEditTeacher}
                  initialUser={c.classTeacher || null}
                  width={180}
                />
                <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => saveClassTeacher(c._id)} disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
                <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Class Teacher: {c.classTeacher?.name || 'Not assigned'}</span>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => startEditTeacher(c)}>
                  Edit
                </button>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
