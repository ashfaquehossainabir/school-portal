import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import StatCard from './StatCard';
import { STATUS_LABELS, STATUS_OPTIONS, STATUS_COLORS } from '../utils/attendanceStatus';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const STATUS_SHORT = {
  present: 'P',
  absent: 'A',
  late: 'Lt',
  excused: 'Ex',
  'half-day': 'HD',
  leave: 'Lv',
  holiday: 'Hol',
};

export default function AttendanceView({ studentId }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [view, setView] = useState('calendar'); // 'calendar' | 'list'
  const [data, setData] = useState({ records: [], stats: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api
      .get(`/attendance/student/${studentId}`, { params: { month, year } })
      .then((res) => setData(res.data))
      .catch(() => setData({ records: [], stats: {} }))
      .finally(() => setLoading(false));
  }, [studentId, month, year]);

  const { stats, records } = data;
  const pct = stats?.percentage || 0;

  const recordsByDay = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      map[new Date(r.date).getDate()] = r;
    });
    return map;
  }, [records]);

  const calendarCells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const leading = first.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, record: recordsByDay[d] || null });
    }
    return cells;
  }, [year, month, recordsByDay]);

  const goPrev = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else { setMonth((m) => m - 1); }
  };
  const goNext = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else { setMonth((m) => m + 1); }
  };
  const goToday = () => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); };
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  return (
    <div>
      <div className="av-toolbar">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 160 }}>
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 110 }}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div className="av-view-toggle">
          <button
            type="button"
            className={`btn ${view === 'calendar' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('calendar')}
          >
            Calendar
          </button>
          <button
            type="button"
            className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setView('list')}
          >
            List
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading attendance...</p>
      ) : (
        <>
          <div className="av-stats-grid" style={{ marginBottom: 20 }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: `conic-gradient(var(--success) ${pct * 3.6}deg, var(--border-color) 0deg)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {pct}%
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Attendance Rate</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{stats?.total || 0} days recorded</div>
              </div>
            </div>
            {STATUS_OPTIONS.map((s) => (
              <StatCard key={s} label={STATUS_LABELS[s]} value={stats?.[s] || 0} color={STATUS_COLORS[s]} />
            ))}
          </div>

          {view === 'calendar' ? (
            <div className="modal-wrapper av-calendar-panel">
              <div className="av-calendar-head">
                <div className="av-month-nav">
                  <button type="button" onClick={goPrev} className="btn btn-outline" aria-label="Previous month">‹</button>
                  <span className="av-month-label">{MONTHS[month - 1]} {year}</span>
                  <button type="button" onClick={goNext} className="btn btn-outline" aria-label="Next month">›</button>
                  {!isCurrentMonth && (
                    <button type="button" onClick={goToday} className="btn btn-outline">This month</button>
                  )}
                </div>
                <div className="av-legend">
                  {STATUS_OPTIONS.map((s) => (
                    <span key={s} className="av-legend-item">
                      <span className="av-legend-dot" style={{ background: STATUS_COLORS[s] }} />
                      {STATUS_LABELS[s]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="av-weekday-row">
                {WEEKDAYS.map((wd, i) => (
                  <div key={wd} className="av-weekday-cell">
                    <span className="av-weekday-full">{wd}</span>
                    <span className="av-weekday-short">{WEEKDAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>
              <div className="av-calendar-grid">
                {calendarCells.map((cell, idx) =>
                  cell === null ? (
                    <div key={`blank-${idx}`} className="av-day-cell av-day-blank" />
                  ) : (
                    <div key={cell.day} className="av-day-cell">
                      <span className="av-day-number">{cell.day}</span>
                      {cell.record && (
                        <span
                          className="av-day-status"
                          style={{ color: STATUS_COLORS[cell.record.status] }}
                          title={STATUS_LABELS[cell.record.status]}
                        >
                          <span className="av-day-status-full">{STATUS_LABELS[cell.record.status]}</span>
                          <span className="av-day-status-short">{STATUS_SHORT[cell.record.status]}</span>
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="modal-wrapper">
              <h3 style={{ marginTop: 0 }}>Daily Records</h3>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 && (
                      <tr><td colSpan={3} style={{ color: 'var(--text-secondary)' }}>No records for this month.</td></tr>
                    )}
                    {records.map((r) => (
                      <tr key={r._id}>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                        <td><span className={`badge badge-${r.status}`}>{STATUS_LABELS[r.status]}</span></td>
                        <td>{r.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .av-toolbar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 20px;
        }
        .av-view-toggle {
          display: flex;
          gap: 8px;
        }
        .av-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 14px;
        }
        .av-calendar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }
        .av-month-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .av-month-label {
          font-weight: 700;
          font-size: 14px;
          min-width: 130px;
          text-align: center;
        }
        .av-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .av-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--text-secondary);
          font-weight: 600;
          white-space: nowrap;
        }
        .av-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .av-weekday-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 6px;
        }
        .av-weekday-cell {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 4px 0;
        }
        .av-weekday-short {
          display: none;
        }
        .av-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .av-day-cell {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          background: var(--bg-hover);
          border: 1px solid var(--border-color);
          padding: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .av-day-blank {
          background: transparent;
          border: none;
        }
        .av-day-number {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .av-day-status {
          align-self: center;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          text-align: center;
          line-height: 1.2;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .av-day-status-short {
          display: none;
        }

        /* ===== Laptop (901px–1024px) ===== */
        @media (max-width: 1024px) {
          .av-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(115px, 1fr));
            gap: 12px;
          }
          .av-calendar-panel {
            padding: 18px !important;
          }
        }

        /* ===== Tablet (641px–900px) ===== */
        @media (max-width: 900px) {
          .av-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 10px;
          }
          .av-calendar-panel {
            padding: 16px !important;
          }
          .av-calendar-grid,
          .av-weekday-row {
            gap: 5px;
          }
          .av-legend {
            gap: 8px;
          }
          .av-legend-item {
            font-size: 11px;
          }
          table {
            font-size: 13px;
          }
        }

        /* ===== Mobile (≤640px) ===== */
        @media (max-width: 640px) {
          .av-toolbar {
            width: 100%;
          }
          .av-toolbar select {
            flex: 1 1 auto;
          }
          .av-view-toggle {
            width: 100%;
          }
          .av-view-toggle .btn {
            flex: 1 1 auto;
          }
          .av-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .av-stats-grid > div:first-child {
            grid-column: 1 / -1;
          }
          .av-calendar-panel {
            padding: 14px !important;
          }
          .av-month-nav {
            width: 100%;
            justify-content: space-between;
          }
          .av-month-label {
            font-size: 13px;
            min-width: 0;
          }
          .av-weekday-full {
            display: none;
          }
          .av-weekday-short {
            display: inline;
          }
          .av-calendar-grid,
          .av-weekday-row {
            gap: 4px;
          }
          .av-day-cell {
            padding: 4px;
            border-radius: 6px;
            aspect-ratio: auto;
            min-height: 46px;
          }
          .av-day-number {
            font-size: 10.5px;
          }
          .av-day-status-full {
            display: none;
          }
          .av-day-status-short {
            display: inline;
          }
          .av-day-status {
            font-size: 9px;
          }
        }

        /* ===== Small mobile (≤480px) ===== */
        @media (max-width: 480px) {
          .av-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
          }
          .av-day-cell {
            min-height: 40px;
          }
          .av-legend {
            gap: 6px;
          }
          .av-legend-item {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
