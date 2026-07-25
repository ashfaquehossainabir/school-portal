import { useEffect, useState } from 'react';
import api from '../api/axios';
import ClassSectionSelect from './ClassSectionSelect';
import UserSearchSelect from './UserSearchSelect';

const emptyEntry = () => ({ subject: '', teacher: '', date: '', startTime: '', endTime: '', room: '' });

export default function ExamManager() {
  const [classSection, setClassSection] = useState({ className: '', section: '' });
  const [title, setTitle] = useState('');
  const [entries, setEntries] = useState([emptyEntry()]);
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [entriesResetSignal, setEntriesResetSignal] = useState(0);

  const loadExams = () => {
    if (!classSection.className) return;
    api.get('/exams', { params: classSection }).then((res) => setExams(res.data));
  };

  useEffect(loadExams, [classSection]);

  useEffect(() => {
    api.get('/users', { params: { role: 'teacher' } }).then((res) => setTeachers(res.data));
  }, []);

  // Teachers already assigned to this class/section/subject surface first in the suggestions.
  const priorityTeacherIds = (subject) => {
    const norm = (s) => (s || '').trim().toLowerCase();
    return teachers
      .filter((t) =>
        t.assignedClasses?.some(
          (a) =>
            norm(a.className) === norm(classSection.className) &&
            norm(a.section) === norm(classSection.section) &&
            norm(a.subject) === norm(subject)
        )
      )
      .map((t) => t._id);
  };

  const updateEntry = (i, field, value) => {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));
  };

  const addEntry = () => setEntries((prev) => [...prev, emptyEntry()]);
  const removeEntry = (i) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        title,
        ...classSection,
        entries: entries.map((entry) => ({ ...entry, teacher: entry.teacher || undefined })),
      };
      await api.post('/exams', payload);
      setMsg('Exam schedule published and synced to student dashboards.');
      setTitle('');
      setEntries([emptyEntry()]);
      setEntriesResetSignal((n) => n + 1);
      loadExams();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/exams/${id}`);
    loadExams();
  };

  return (
    <div>
      <div className="modal-wrapper" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Publish Exam Schedule</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <ClassSectionSelect value={classSection} onChange={setClassSection} />
            <input
              placeholder="Exam title e.g. Mid-Term Examination 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ flex: 1, minWidth: 220 }}
            />
          </div>

          {entries.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
              <input placeholder="Subject" value={entry.subject} onChange={(e) => updateEntry(i, 'subject', e.target.value)} required style={{ width: 140 }} />
              <UserSearchSelect
                role="teacher"
                placeholder="Search & assign teacher"
                onSelect={(u) => updateEntry(i, 'teacher', u?._id || '')}
                prioritizeIds={priorityTeacherIds(entry.subject)}
                resetSignal={entriesResetSignal}
                width={190}
              />
              <input type="date" value={entry.date} onChange={(e) => updateEntry(i, 'date', e.target.value)} required style={{ width: 140 }} />
              <input placeholder="Start (10:00 AM)" value={entry.startTime} onChange={(e) => updateEntry(i, 'startTime', e.target.value)} required style={{ width: 130 }} />
              <input placeholder="End (12:00 PM)" value={entry.endTime} onChange={(e) => updateEntry(i, 'endTime', e.target.value)} required style={{ width: 130 }} />
              <input placeholder="Room" value={entry.room} onChange={(e) => updateEntry(i, 'room', e.target.value)} style={{ width: 90 }} />
              {entries.length > 1 && (
                <button type="button" className="btn btn-outline" onClick={() => removeEntry(i)}>✕</button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn btn-outline" onClick={addEntry}>+ Add Subject</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Publish Schedule'}
            </button>
          </div>
          {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
        </form>
      </div>

      <h3>Published Schedules</h3>
      {exams.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No exam schedules yet for this class.</p>}
      {exams.map((exam) => (
        <div className="modal-wrapper" key={exam._id} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>{exam.title}</h4>
            <button className="btn btn-danger" onClick={() => handleDelete(exam._id)}>Delete</button>
          </div>
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table>
              <thead>
                <tr><th>Subject</th><th>Teacher</th><th>Date</th><th>Time</th><th>Room</th></tr>
              </thead>
              <tbody>
                {exam.entries.map((e) => (
                  <tr key={e._id}>
                    <td>{e.subject}</td>
                    <td>{e.teacher?.name || '—'}</td>
                    <td>{new Date(e.date).toLocaleDateString()}</td>
                    <td>{e.startTime} - {e.endTime}</td>
                    <td>{e.room || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
