import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import ClassSectionSelect from './ClassSectionSelect';
import StatCard from './StatCard';
import useDebounce from '../hooks/useDebounce';
import { STATUS_LABELS, STATUS_OPTIONS, STATUS_COLORS } from '../utils/attendanceStatus';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Inclusive list of yyyy-mm-dd strings between two dates, capped at 62 days
// so a mistyped range can't trigger hundreds of writes.
function dateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const days = [];
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 62) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return days;
}

export default function TakeAttendance() {
  const [classSection, setClassSection] = useState({ className: '', section: '' });
  const [date, setDate] = useState(todayStr());
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [remarksMap, setRemarksMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [offDayOpen, setOffDayOpen] = useState(false);
  const [offDayStart, setOffDayStart] = useState(todayStr());
  const [offDayEnd, setOffDayEnd] = useState(todayStr());
  const [offDayStatus, setOffDayStatus] = useState('holiday');
  const [offDaySelected, setOffDaySelected] = useState(new Set());
  const [offDayNotes, setOffDayNotes] = useState('');
  const [offDaySaving, setOffDaySaving] = useState(false);
  const [offDayBanner, setOffDayBanner] = useState('');
  const [offDayQuery, setOffDayQuery] = useState('');
  const [offDaySuggestOpen, setOffDaySuggestOpen] = useState(false);

  const loadAttendance = () => {
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
  };

  useEffect(() => {
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSection, date]);

  // Reset the off-day panel's picks whenever the class/section changes, since
  // the roster it's picking from just changed.
  useEffect(() => {
    setOffDaySelected(new Set());
    setOffDayQuery('');
    setOffDayBanner('');
  }, [classSection]);

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
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name?.toLowerCase().includes(q) ||
      s.studentId?.toLowerCase().includes(q) ||
      s.roll?.toLowerCase?.().includes(q)
    );
  });

  // Counts per status among the currently loaded class/section roster for the selected date.
  const summary = useMemo(() => {
    const counts = {};
    STATUS_OPTIONS.forEach((s) => (counts[s] = 0));
    students.forEach((s) => {
      const status = statusMap[s._id];
      if (status) counts[status] += 1;
    });
    return counts;
  }, [students, statusMap]);

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

  const toggleOffDayStudent = (studentId) => {
    setOffDaySelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const offDayDates = useMemo(() => dateRange(offDayStart, offDayEnd), [offDayStart, offDayEnd]);

  const offDaySuggestions = useMemo(() => {
    const q = offDayQuery.trim().toLowerCase();
    const pool = students.filter((s) => !offDaySelected.has(s._id));
    const matches = q
      ? pool.filter((s) => {
          const name = (s.name || '').toLowerCase();
          const sid = (s.studentId || '').toLowerCase();
          return name.includes(q) || sid.includes(q);
        })
      : pool;
    return matches.slice(0, 8);
  }, [students, offDaySelected, offDayQuery]);

  const selectedOffDayStudents = useMemo(
    () => Array.from(offDaySelected).map((id) => students.find((s) => s._id === id)).filter(Boolean),
    [offDaySelected, students]
  );

  const addOffDayStudent = (studentId) => {
    setOffDaySelected((prev) => new Set(prev).add(studentId));
    setOffDayQuery('');
  };

  const selectAllOffDay = () => {
    setOffDaySelected(new Set(students.map((s) => s._id)));
  };

  const saveOffDay = async () => {
    setOffDayBanner('');
    if (offDaySelected.size === 0) {
      setOffDayBanner('Select at least one student.');
      return;
    }
    if (offDayDates.length === 0) {
      setOffDayBanner('Choose a valid date range (end date on or after the start date).');
      return;
    }
    setOffDaySaving(true);
    try {
      const res = await api.post('/attendance/off-day', {
        ...classSection,
        studentIds: Array.from(offDaySelected),
        dates: offDayDates,
        status: offDayStatus,
        notes: offDayNotes,
      });
      setOffDayBanner(
        `${STATUS_LABELS[offDayStatus]} set for ${res.data.studentCount} student${res.data.studentCount === 1 ? '' : 's'} across ${res.data.dayCount} day${res.data.dayCount === 1 ? '' : 's'}.`
      );
      if (offDayDates.includes(date)) loadAttendance();
    } catch (err) {
      setOffDayBanner(err.response?.data?.message || 'Failed to set off day');
    } finally {
      setOffDaySaving(false);
    }
  };

  return (
    <div>
      <div className="ta-toolbar">
        <ClassSectionSelect value={classSection} onChange={setClassSection} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 170 }} />
        <input
          type="text"
          placeholder="Search student by name or ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: 220 }}
        />
        <button className="btn btn-outline ta-toolbar-btn" onClick={() => markAll('present')}>Mark all present</button>
        <button className="btn btn-outline ta-toolbar-btn" onClick={() => markAll('absent')}>Mark all absent</button>
        <button className="btn btn-outline ta-toolbar-btn" onClick={() => setOffDayOpen((v) => !v)}>
          {offDayOpen ? 'Close off day panel' : 'Set off day'}
        </button>
      </div>

      {classSection.className && (
        <div className="ta-summary-grid" style={{ marginBottom: 20 }}>
          {STATUS_OPTIONS.map((s) => (
            <StatCard key={s} label={STATUS_LABELS[s]} value={summary[s]} color={STATUS_COLORS[s]} />
          ))}
        </div>
      )}

      {offDayOpen && (
        <div className="modal-wrapper ta-offday-panel" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Set off day</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: -8 }}>
            Bulk-mark a holiday or leave for selected students across a date range, in {classSection.className || 'the selected class'} - {classSection.section || ''}.
          </p>

          <div className="ta-offday-fields">
            <label className="ta-offday-label">
              Start date
              <input type="date" value={offDayStart} onChange={(e) => setOffDayStart(e.target.value)} />
            </label>
            <label className="ta-offday-label">
              End date
              <input type="date" value={offDayEnd} onChange={(e) => setOffDayEnd(e.target.value)} />
            </label>
            <label className="ta-offday-label">
              Status
              <select value={offDayStatus} onChange={(e) => setOffDayStatus(e.target.value)}>
                <option value="holiday">Holiday</option>
                <option value="leave">Leave</option>
              </select>
            </label>
          </div>

          <div style={{ margin: '14px 0 6px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Students ({offDaySelected.size} selected)
          </div>

          {selectedOffDayStudents.length > 0 && (
            <div className="ta-offday-chips">
              {selectedOffDayStudents.map((s) => (
                <span key={s._id} className="ta-offday-chip">
                  {s.name}
                  <button
                    type="button"
                    className="ta-offday-chip-remove"
                    onClick={() => toggleOffDayStudent(s._id)}
                    aria-label={`Remove ${s.name}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="ta-offday-search">
            <input
              type="text"
              placeholder="Search students to add..."
              value={offDayQuery}
              onChange={(e) => setOffDayQuery(e.target.value)}
              onFocus={() => setOffDaySuggestOpen(true)}
              onBlur={() => setTimeout(() => setOffDaySuggestOpen(false), 120)}
              style={{ width: '100%' }}
            />
            {offDaySuggestOpen && (
              <div className="ta-offday-suggestions">
                {offDaySuggestions.length === 0 && (
                  <div className="ta-offday-suggestion-empty">
                    {students.length === offDaySelected.size ? 'All students already selected.' : 'No students match.'}
                  </div>
                )}
                {offDaySuggestions.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    className="ta-offday-suggestion-item"
                    onMouseDown={() => addOffDayStudent(s._id)}
                  >
                    <span className="ta-offday-suggestion-name">{s.name}</span>
                    <span className="ta-offday-suggestion-meta">{s.studentId || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="btn btn-outline" style={{ marginTop: 10 }} onClick={selectAllOffDay}>
            Select all in class
          </button>

          <input
            type="text"
            placeholder="Optional note (e.g. 'Eid holiday')"
            value={offDayNotes}
            onChange={(e) => setOffDayNotes(e.target.value)}
            style={{ width: '100%', marginTop: 14 }}
          />

          <div className="ta-offday-footer" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn btn-primary" onClick={saveOffDay} disabled={offDaySaving}>
              {offDaySaving ? 'Saving...' : `Apply to ${offDayDates.length} day${offDayDates.length === 1 ? '' : 's'}`}
            </button>
            {offDayBanner && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{offDayBanner}</span>}
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading students...</p>
      ) : !classSection.className ? (
        <p style={{ color: 'var(--text-secondary)' }}>Select a class and section to take attendance.</p>
      ) : students.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No students found in this class/section.</p>
      ) : (
        <div className="modal-wrapper">
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
                      <select
                        value={statusMap[s._id] || ''}
                        onChange={(e) => setStatus(s._id, e.target.value)}
                        className={statusMap[s._id] ? `badge badge-${statusMap[s._id]}` : ''}
                        style={{
                          border: '1px solid var(--border-color)',
                          fontWeight: 600,
                          padding: '5px 8px',
                          minWidth: 110,
                        }}
                      >
                        <option value="">Not marked</option>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{STATUS_LABELS[opt]}</option>
                        ))}
                      </select>
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

      <style>{`
        .ta-toolbar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 20px;
        }
        .ta-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 14px;
        }
        .ta-offday-fields {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .ta-offday-label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ta-offday-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .ta-offday-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          border-radius: 999px;
          padding: 5px 6px 5px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
          max-width: 100%;
        }
        .ta-offday-chip-remove {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 999px;
        }
        .ta-offday-chip-remove:hover {
          color: var(--text-primary);
          background: var(--border-color);
        }
        .ta-offday-search {
          position: relative;
        }
        .ta-offday-suggestions {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          z-index: 6;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: var(--shadow);
          max-height: 220px;
          overflow-y: auto;
          padding: 4px;
        }
        .ta-offday-suggestion-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          width: 100%;
          background: transparent;
          border: none;
          border-radius: 6px;
          padding: 9px 10px;
          font-size: 13px;
          color: var(--text-primary);
          text-align: left;
          cursor: pointer;
        }
        .ta-offday-suggestion-item:hover,
        .ta-offday-suggestion-item:focus {
          background: var(--bg-hover);
          outline: none;
        }
        .ta-offday-suggestion-name {
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ta-offday-suggestion-meta {
          font-size: 11.5px;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .ta-offday-suggestion-empty {
          padding: 10px 12px;
          font-size: 12.5px;
          color: var(--text-muted);
        }

        /* ===== Laptop (901px–1024px) ===== */
        @media (max-width: 1024px) {
          .ta-summary-grid {
            grid-template-columns: repeat(auto-fit, minmax(115px, 1fr));
            gap: 12px;
          }
          .ta-offday-fields {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* ===== Tablet (641px–900px) ===== */
        @media (max-width: 900px) {
          .ta-toolbar {
            gap: 10px;
          }
          .ta-summary-grid {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 10px;
          }
          .ta-offday-panel {
            padding: 16px !important;
          }
          .ta-offday-fields {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          table {
            font-size: 13px;
          }
        }

        /* ===== Mobile (≤640px) ===== */
        @media (max-width: 640px) {
          .ta-toolbar {
            width: 100%;
          }
          .ta-toolbar input,
          .ta-toolbar-btn,
          .ta-toolbar > select {
            flex: 1 1 auto;
            width: 100%;
          }
          .ta-summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .ta-offday-panel {
            padding: 14px !important;
          }
          .ta-offday-fields {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .ta-offday-footer {
            flex-direction: column;
            align-items: stretch !important;
          }
          .ta-offday-footer .btn {
            width: 100%;
          }
          .ta-offday-chip {
            font-size: 12px;
          }
        }

        /* ===== Small mobile (≤480px) ===== */
        @media (max-width: 480px) {
          .ta-summary-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
          }
          .ta-offday-suggestions {
            max-height: 180px;
          }
        }
      `}</style>
    </div>
  );
}
