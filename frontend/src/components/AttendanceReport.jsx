import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import useDebounce from '../hooks/useDebounce';
import { STATUS_LABELS, STATUS_OPTIONS, STATUS_SHORT, STATUS_COLORS } from '../utils/attendanceStatus';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AttendanceReport() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState({ className: '', section: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/classes').then((res) => {
      setClasses(res.data.map((c) => ({ className: c.className, section: c.section })));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get('/attendance/report', {
        params: {
          month,
          year,
          className: classFilter.className || undefined,
          section: classFilter.section || undefined,
        },
      })
      .then((res) => setReport(res.data.report))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load attendance report'))
      .finally(() => setLoading(false));
  }, [month, year, classFilter]);

  const handleClassChange = (e) => {
    const idx = e.target.value;
    if (idx === '') {
      setClassFilter({ className: '', section: '' });
    } else {
      setClassFilter(classes[Number(idx)]);
    }
  };

  const selectedClassIndex = classes.findIndex(
    (c) => c.className === classFilter.className && c.section === classFilter.section
  );

  const filteredReport = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return report;
    return report.filter((r) => {
      const s = r.student;
      return (
        s.name?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q) ||
        s.roll?.toLowerCase?.().includes(q)
      );
    });
  }, [report, debouncedSearchQuery]);

  return (
    <div>
      <div className="ar-toolbar">
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
        <select value={selectedClassIndex >= 0 ? selectedClassIndex : ''} onChange={handleClassChange} style={{ width: 200 }}>
          <option value="">All classes</option>
          {classes.map((c, i) => (
            <option key={i} value={i}>{c.className} - {c.section}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search student by name or ID"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ar-search"
        />
      </div>

      <div className="modal-wrapper">
        {loading ? (
          <p style={{ margin: 0 }}>Loading attendance report...</p>
        ) : error ? (
          <p style={{ margin: 0, color: 'var(--danger)' }}>{error}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ar-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Class</th>
                  {STATUS_OPTIONS.map((s) => (
                    <th key={s} title={STATUS_LABELS[s]} style={{ color: STATUS_COLORS[s] }}>
                      {STATUS_SHORT[s]}
                    </th>
                  ))}
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredReport.length === 0 && (
                  <tr>
                    <td colSpan={4 + STATUS_OPTIONS.length} style={{ color: 'var(--text-secondary)' }}>
                      No students match this search.
                    </td>
                  </tr>
                )}
                {filteredReport.map((r) => (
                  <tr key={r.student._id}>
                    <td>{r.student.studentId || r.student.roll || '—'}</td>
                    <td>{r.student.name}</td>
                    <td>{r.student.className} - {r.student.section}</td>
                    {STATUS_OPTIONS.map((s) => (
                      <td key={s}>{r[s] || 0}</td>
                    ))}
                    <td style={{ fontWeight: 700 }}>{r.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .ar-toolbar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 20px;
        }
        .ar-search {
          flex: 1 1 220px;
          min-width: 180px;
        }
        .ar-table {
          min-width: 720px;
        }

        /* ===== Laptop (901px–1024px) ===== */
        @media (max-width: 1024px) {
          .modal-wrapper {
            padding: 18px !important;
          }
        }

        /* ===== Tablet (641px–900px) ===== */
        @media (max-width: 900px) {
          .modal-wrapper {
            padding: 16px !important;
          }
          .ar-table {
            font-size: 13px;
          }
        }

        /* ===== Mobile (≤640px) ===== */
        @media (max-width: 640px) {
          .ar-toolbar {
            width: 100%;
          }
          .ar-toolbar select,
          .ar-search {
            flex: 1 1 auto;
            width: 100%;
          }
          .modal-wrapper {
            padding: 14px !important;
          }
          .ar-table {
            font-size: 12.5px;
            min-width: 620px;
          }
        }
      `}</style>
    </div>
  );
}
