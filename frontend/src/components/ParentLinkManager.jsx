import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function ParentLinkManager() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [linkParent, setLinkParent] = useState('');
  const [linkStudent, setLinkStudent] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    api.get('/users', { params: { role: 'parent' } }).then((res) => setParents(res.data));
    api.get('/users', { params: { role: 'student' } }).then((res) => setStudents(res.data));
  };

  useEffect(load, []);

  const handleLink = async () => {
    if (!linkParent || !linkStudent) return;
    setMsg('');
    try {
      await api.post('/users/link-child', { parentId: linkParent, studentId: linkStudent });
      setMsg('Parent linked to student.');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to link');
    }
  };

  const handleUnlink = async (parentId, studentId) => {
    await api.post('/users/unlink-child', { parentId, studentId });
    load();
  };

  const studentName = (id) => students.find((s) => s._id === id)?.name || 'Unknown student';

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Connect Parents with Students</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <select value={linkParent} onChange={(e) => setLinkParent(e.target.value)} style={{ width: 220 }}>
          <option value="">Select parent</option>
          {parents.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.email})</option>)}
        </select>
        <select value={linkStudent} onChange={(e) => setLinkStudent(e.target.value)} style={{ width: 220 }}>
          <option value="">Select student</option>
          {students.map((s) => <option key={s._id} value={s._id}>{s.name} — {s.className} {s.section}</option>)}
        </select>
        <button className="btn btn-primary" onClick={handleLink}>Link</button>
      </div>
      {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginBottom: 10 }}>{msg}</p>}

      <h4 style={{ margin: '10px 0 8px' }}>Existing Links</h4>
      {parents.filter((p) => p.children?.length > 0).length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No parent-student links yet.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {parents.map((p) =>
          (p.children || []).map((childId) => (
            <div
              key={`${p._id}-${childId}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-color)' }}
            >
              <span style={{ fontSize: 14 }}>
                <strong>{p.name}</strong> ({p.email}) → <strong>{studentName(childId)}</strong>
              </span>
              <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleUnlink(p._id, childId)}>
                Unlink
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
