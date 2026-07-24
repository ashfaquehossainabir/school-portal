import { useEffect, useState } from 'react';
import api from '../api/axios';
import ClassSectionSelect from './ClassSectionSelect';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'];

export default function TakeAttendance() {
  const [classSection, setClassSection] = useState({ className: '', section: '' });
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!classSection.className || !classSection.section) return;
    setLoading(true);
    setSavedMsg('');

    Promise.all([
      api.get('/users', { params: { role: 'student', className: classSection.className, section: classSection.section } }),
      api.get('/attendance/class', { params: { ...classSection, date } }),
    ])
      .then(([studentsRes, attendanceRes]) => {
        setStudents(studentsRes.data);
        const existingStatus = {};
        const existingRemarks = {};
        attendanceRes.data.forEach((r) => {
          existingStatus[r.student._id] = r.status;
          existingRemarks[r.student._id] = r.remarks || '';
        });
        // default anyone not yet marked to "present"
        const statusInit = {};
        const remarksInit = {};
        studentsRes.data.forEach((s) => {
          statusInit[s._id] = existingStatus[s._id] || 'present';
          remarksInit[s._id] = existingRemarks[s._id] || '';
        });
        setStatusMap(statusInit);
        setRemarksMap(remarksInit);
      })
      .finally(() => setLoading(false));
  }, [classSection, date]);

  const setStatus = (studentId, status) => {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const setRemarks = (studentId, remarks) => {
    setRemarksMap((prev) => ({ ...prev, [studentId]: remarks }));
  };

  const markAll = (status) => {
    setStatusMap((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => (next[s._id] = status));
      return next;
    });
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name?.toLowerCase().includes(q) ||
      s.studentId?.toLowerCase().includes(q) ||
      s.roll?.toLowerCase?.().includes(q)
    );
  });

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const records = students.map((s) => ({
        studentId: s._id,
        status: statusMap[s._id],
        remarks: remarksMap[s._id] || '',
      }));
      await api.post('/attendance/mark', { ...classSection, date, records });
      setSavedMsg('Attendance saved and synced to student dashboards.');
    } catch (err) {
      setSavedMsg(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <ClassSectionSelect value={classSection} onChange={setClassSection} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 170 }} />
        <input
          type="text"
          placeholder="Search student by name or ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 220 }}
        />
        <button className="btn btn-outline" onClick={() => markAll('present')}>Mark all present</button>
        <button className="btn btn-outline" onClick={() => markAll('absent')}>Mark all absent</button>
      </div>

      {loading ? (
        <p>Loading students...</p>
      ) : students.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No students found in this class/section.</p>
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 && (
                  <tr><td colSpan={4} style={{ color: 'var(--text-secondary)' }}>No students match your search.</td></tr>
                )}
                {filteredStudents.map((s) => (
                  <tr key={s._id}>
                    <td>{s.studentId || s.roll || '—'}</td>
                    <td>{s.name}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setStatus(s._id, opt)}
                            className={`badge badge-${opt}`}
                            style={{
                              border: statusMap[s._id] === opt ? '2px solid currentColor' : '1px solid transparent',
                              background: statusMap[s._id] === opt ? undefined : 'var(--bg-elevated)',
                              cursor: 'pointer',
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Optional note..."
                        value={remarksMap[s._id] || ''}
                        onChange={(e) => setRemarks(s._id, e.target.value)}
                        style={{ minWidth: 160 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
            {savedMsg && <span style={{ fontSize: 13, color: 'var(--success)' }}>{savedMsg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
