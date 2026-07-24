import { useEffect, useState } from 'react';
import api from '../api/axios';
import ClassSectionSelect from './ClassSectionSelect';
import UserSearchSelect from './UserSearchSelect';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const emptyPeriod = () => ({ subject: '', teacher: '', startTime: '', endTime: '', room: '' });

export default function RoutineManager() {
  const [classSection, setClassSection] = useState({ className: '', section: '' });
  const [selectedDay, setSelectedDay] = useState('Sunday');
  const [days, setDays] = useState({}); // { Sunday: [periods], ... }
  const [teachers, setTeachers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadRoutine = () => {
    if (!classSection.className) return;
    api.get('/routines', { params: classSection }).then((res) => {
      const existing = res.data[0];
      const map = {};
      DAYS.forEach((d) => {
        const found = existing?.days?.find((x) => x.day === d);
        map[d] = found
          ? found.periods.map((p) => ({ ...p, teacher: p.teacher?._id || p.teacher || '' }))
          : [];
      });
      setDays(map);
    });
  };

  useEffect(loadRoutine, [classSection]);

  useEffect(() => {
    api.get('/users', { params: { role: 'teacher' } }).then((res) => setTeachers(res.data));
  }, []);

  const periods = days[selectedDay] || [];

  const teacherObjFor = (id) => teachers.find((t) => t._id === id) || null;

  // Teachers already assigned to this exact class/section/subject float to the
  // top of the search suggestions, so the right person is easy to find first.
  const matchedTeacherIds = (subject) => {
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

  const updatePeriod = (i, field, value) => {
    setDays((prev) => ({
      ...prev,
      [selectedDay]: prev[selectedDay].map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    }));
  };

  const addPeriod = () => {
    setDays((prev) => ({ ...prev, [selectedDay]: [...(prev[selectedDay] || []), emptyPeriod()] }));
  };

  const removePeriod = (i) => {
    setDays((prev) => ({ ...prev, [selectedDay]: prev[selectedDay].filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        ...classSection,
        days: DAYS.filter((d) => (days[d] || []).length > 0).map((d) => ({
          day: d,
          periods: days[d].map((p) => ({ ...p, teacher: p.teacher || undefined })),
        })),
      };
      await api.post('/routines', payload);
      setMsg('Routine saved and synced to student dashboards.');
      loadRoutine();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Edit Weekly Routine</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <ClassSectionSelect value={classSection} onChange={setClassSection} />
          <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} style={{ width: 160 }}>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {periods.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
            <input placeholder="Subject" value={p.subject} onChange={(e) => updatePeriod(i, 'subject', e.target.value)} style={{ width: 140 }} />
            <UserSearchSelect
              role="teacher"
              placeholder="Search & assign teacher"
              onSelect={(u) => updatePeriod(i, 'teacher', u?._id || '')}
              initialUser={teacherObjFor(p.teacher)}
              prioritizeIds={matchedTeacherIds(p.subject)}
              width={200}
            />
            <input placeholder="Start (9:00 AM)" value={p.startTime} onChange={(e) => updatePeriod(i, 'startTime', e.target.value)} style={{ width: 130 }} />
            <input placeholder="End (9:45 AM)" value={p.endTime} onChange={(e) => updatePeriod(i, 'endTime', e.target.value)} style={{ width: 130 }} />
            <input placeholder="Room" value={p.room} onChange={(e) => updatePeriod(i, 'room', e.target.value)} style={{ width: 90 }} />
            <button type="button" className="btn btn-outline" onClick={() => removePeriod(i)}>✕</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-outline" onClick={addPeriod}>+ Add Period</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Routine'}
          </button>
        </div>
        {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
          Tip: assign teachers to a subject on the Users page first (Assign Teacher to Subject) — they'll appear at the top of the search suggestions for that class/section/subject.
        </p>
      </div>
    </div>
  );
}
