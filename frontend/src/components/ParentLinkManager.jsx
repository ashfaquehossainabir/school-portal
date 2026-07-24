import { useEffect, useState } from 'react';
import api from '../api/axios';
import UserSearchSelect from './UserSearchSelect';

export default function ParentLinkManager() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [linkParent, setLinkParent] = useState(null);
  const [linkStudent, setLinkStudent] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const load = () => {
    api.get('/users', { params: { role: 'parent' } }).then((res) => setParents(res.data));
    api.get('/users', { params: { role: 'student' } }).then((res) => setStudents(res.data));
  };

  useEffect(load, []);

  const handleLink = async () => {
    if (!linkParent || !linkStudent) {
      setMsg('Search and select both a parent and a student first.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await api.post('/users/link-child', { parentId: linkParent._id, studentId: linkStudent._id });
      setMsg(`Linked ${linkParent.name} to ${linkStudent.name}.`);
      setLinkParent(null);
      setLinkStudent(null);
      setResetSignal((n) => n + 1);
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to link');
    } finally {
      setSaving(false);
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
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <UserSearchSelect
          role="parent"
          placeholder="Search parent by name or email"
          onSelect={setLinkParent}
          resetSignal={resetSignal}
        />
        <UserSearchSelect
          role="student"
          placeholder="Search student by name or ID"
          onSelect={setLinkStudent}
          resetSignal={resetSignal}
        />
        <button className="btn btn-primary" onClick={handleLink} disabled={saving}>
          {saving ? 'Linking...' : 'Link'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 10 }}>
        Type a few letters of the parent's or student's name (or the Student ID) and click a suggestion to select them.
      </p>
      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Linked') ? 'var(--success)' : 'var(--danger)', marginBottom: 10 }}>{msg}</p>}

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
