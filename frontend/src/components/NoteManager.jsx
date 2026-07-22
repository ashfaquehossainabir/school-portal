import { useEffect, useState } from 'react';
import api from '../api/axios';
import ClassSectionSelect from './ClassSectionSelect';

export default function NoteManager() {
  const [classSection, setClassSection] = useState({ className: '', section: '' });
  const [form, setForm] = useState({ title: '', subject: '', description: '', fileUrl: '' });
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadNotes = () => {
    if (!classSection.className) return;
    api.get('/notes', { params: classSection }).then((res) => setNotes(res.data));
  };

  useEffect(loadNotes, [classSection]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.post('/notes', { ...form, ...classSection });
      setForm({ title: '', subject: '', description: '', fileUrl: '' });
      setMsg('Note posted.');
      loadNotes();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to post note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/notes/${id}`);
    loadNotes();
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Post a Note</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <ClassSectionSelect value={classSection} onChange={setClassSection} />
            <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required style={{ width: 160 }} />
          </div>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={{ marginBottom: 10 }} />
          <textarea placeholder="Description (optional)" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 10 }} />
          <input placeholder="File link (Google Drive, etc. — optional)" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} style={{ marginBottom: 10 }} />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Posting...' : 'Post Note'}
          </button>
          {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
        </form>
      </div>

      <h3>Existing Notes</h3>
      <div className="grid grid-cols-2">
        {notes.map((n) => (
          <div className="card" key={n._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h4 style={{ margin: '0 0 4px' }}>{n.title}</h4>
              <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(n._id)}>Delete</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{n.description}</p>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{n.subject}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
