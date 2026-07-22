import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatCard from './StatCard';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AttendanceView({ studentId }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
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

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
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
      </div>

      {loading ? (
        <p>Loading attendance...</p>
      ) : (
        <>
          <div className="grid grid-cols-4" style={{ marginBottom: 20 }}>
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
            <StatCard label="Present" value={stats?.present || 0} color="var(--success)" />
            <StatCard label="Absent" value={stats?.absent || 0} color="var(--danger)" />
            <StatCard label="Late / Excused" value={(stats?.late || 0) + (stats?.excused || 0)} color="var(--warning)" />
          </div>

          <div className="card">
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
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                      <td>{r.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
