import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function NoticeManager() {
  const [form, setForm] = useState({ title: '', message: '', audience: 'all', priority: 'normal', className: '', section: '' });
  const [notices, setNotices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadNotices = () => {
    api.get('/notices').then((res) => setNotices(res.data));
  };

  useEffect(loadNotices, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.post('/notices', form);
      setForm({ title: '', message: '', audience: 'all', priority: 'normal', className: '', section: '' });
      setMsg('Notice published.');
      loadNotices();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to publish notice');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/notices/${id}`);
    loadNotices();
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Post a Notice</h3>
        <form onSubmit={handleSubmit}>
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={{ marginBottom: 10 }} />
          <textarea placeholder="Message" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required style={{ marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} style={{ width: 160 }}>
              <option value="all">Everyone</option>
              <option value="students">Students</option>
              <option value="teachers">Teachers</option>
              <option value="parents">Parents</option>
              <option value="class">Specific Class</option>
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ width: 140 }}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
            {form.audience === 'class' && (
              <>
                <input placeholder="Class e.g. Class 8" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} style={{ width: 140 }} />
                <input placeholder="Section e.g. A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} style={{ width: 100 }} />
              </>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Publishing...' : 'Publish Notice'}
          </button>
          {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
        </form>
      </div>

      <h3>Published Notices</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notices.map((n) => (
          <div className="card" key={n._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ margin: 0 }}>{n.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '6px 0' }}>{n.message}</p>
              </div>
              <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(n._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
