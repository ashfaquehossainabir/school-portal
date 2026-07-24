import { useEffect, useState } from 'react';
import api from '../api/axios';
import UserSearchSelect from './UserSearchSelect';

export default function TeacherAssignments() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [classSection, setClassSection] = useState('');
  const [subject, setSubject] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const load = () => {
    api.get('/users', { params: { role: 'teacher' } }).then((res) => setTeachers(res.data));
    api.get('/classes').then((res) => setClasses(res.data));
  };

  useEffect(load, []);

  const selectedTeacher = teachers.find((t) => t._id === teacherId);

  const handleAssign = async () => {
    if (!teacherId || !classSection || !subject) return;
    const [className, section] = classSection.split('||');
    setSaving(true);
    setMsg('');
    try {
      await api.post('/users/assign-subject', { teacherId, className, section, subject });
      setMsg('Assigned successfully.');
      setSubject('');
      load();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to assign');
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (className, section, subj) => {
    await api.post('/users/unassign-subject', { teacherId, className, section, subject: subj });
    load();
  };

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h3 style={{ marginTop: 0 }}>Assign Teacher to Subject</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <UserSearchSelect
          role="teacher"
          placeholder="Search teacher by name or email"
          onSelect={(u) => setTeacherId(u?._id || '')}
          resetSignal={resetSignal}
        />
        <select value={classSection} onChange={(e) => setClassSection(e.target.value)} style={{ width: 200 }}>
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c._id} value={`${c.className}||${c.section}`}>{c.className} - {c.section}</option>
          ))}
        </select>
        <input placeholder="Subject e.g. Mathematics" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: 200 }} />
        <button className="btn btn-primary" onClick={handleAssign} disabled={saving}>
          {saving ? 'Assigning...' : 'Assign'}
        </button>
      </div>
      {!teacherId && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: -4, marginBottom: 10 }}>Search and click a teacher above to select them.</p>}
      {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginBottom: 10 }}>{msg}</p>}

      {selectedTeacher && (
        <div>
          <h4 style={{ margin: '10px 0 8px' }}>{selectedTeacher.name}'s current assignments</h4>
          {(!selectedTeacher.assignedClasses || selectedTeacher.assignedClasses.length === 0) && (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No subjects assigned yet.</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {selectedTeacher.assignedClasses?.map((a, i) => (
              <span
                key={i}
                className="badge"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {a.subject} · {a.className} {a.section}
                <button
                  onClick={() => handleUnassign(a.className, a.section, a.subject)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 700, padding: 0 }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
