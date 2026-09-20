import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatCard from './StatCard';
import { GRADE_COLORS } from '../utils/resultTypes';

export default function ResultView({ studentId }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api
      .get(`/results/student/${studentId}`)
      .then((res) => setResults(res.data))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <p>Loading results...</p>;

  const examsTaken = results.length;
  const avgPercentage = examsTaken > 0 ? Math.round((results.reduce((s, r) => s + r.percentage, 0) / examsTaken) * 10) / 10 : 0;
  const latest = results[0];

  return (
    <div className="rv-root">
      <div className="rv-stats-grid">
        <StatCard label="Exams Recorded" value={examsTaken} icon="📝" />
        <StatCard label="Average Score" value={`${avgPercentage}%`} color="var(--info)" icon="📊" />
        <StatCard
          label={latest ? 'Latest Exam Grade' : 'Latest Exam'}
          value={latest ? latest.overallGrade : '—'}
          color={latest ? GRADE_COLORS[latest.overallGrade] : 'var(--accent)'}
          icon="🏅"
        />
      </div>

      <h3 className="rv-section-title">Exam Results</h3>
      {results.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No results published yet.</p>}

      <div className="rv-result-list">
        {results.map((r) => {
          const isOpen = openId === r._id;
          return (
            <div className="modal-wrapper rv-result-card" key={r._id}>
              <div className="rv-result-head" onClick={() => setOpenId(isOpen ? null : r._id)}>
                <div className="rv-result-head-main">
                  <span className="badge" style={{ background: `${GRADE_COLORS[r.overallGrade]}22`, color: GRADE_COLORS[r.overallGrade] }}>
                    {r.overallGrade}
                  </span>
                  <div>
                    <div className="rv-result-title">{r.examTitle}</div>
                    <div className="rv-result-sub">
                      {r.className} {r.section}{r.term ? ` · ${r.term}` : ''}
                    </div>
                  </div>
                </div>
                <div className="rv-result-head-amounts">
                  <div>
                    <span className="rv-stat-label">Total</span>
                    <span className="rv-stat-value">{r.totalMarks} / {r.totalMaxMarks}</span>
                  </div>
                  <div>
                    <span className="rv-stat-label">Percentage</span>
                    <span className="rv-stat-value">{r.percentage}%</span>
                  </div>
                  <span className="rv-chevron">{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="rv-result-body">
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr><th>Subject</th><th>Marks</th><th>Full Marks</th><th>Grade</th></tr>
                      </thead>
                      <tbody>
                        {r.subjects.map((s, i) => (
                          <tr key={i}>
                            <td>{s.subject}</td>
                            <td>{s.marks}</td>
                            <td>{s.maxMarks}</td>
                            <td><span style={{ color: GRADE_COLORS[s.grade], fontWeight: 700 }}>{s.grade}</span></td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ fontWeight: 700 }}>Total</td>
                          <td style={{ fontWeight: 700 }}>{r.totalMarks}</td>
                          <td style={{ fontWeight: 700 }}>{r.totalMaxMarks}</td>
                          <td style={{ fontWeight: 700, color: GRADE_COLORS[r.overallGrade] }}>{r.overallGrade}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {r.remarks && <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 10 }}>Remarks: {r.remarks}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .rv-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        .rv-section-title {
          margin-bottom: 14px;
        }
        .rv-result-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .rv-result-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          cursor: pointer;
        }
        .rv-result-head-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .rv-result-title {
          font-weight: 700;
          font-size: 14.5px;
        }
        .rv-result-sub {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .rv-result-head-amounts {
          display: flex;
          align-items: center;
          gap: 22px;
        }
        .rv-stat-label {
          display: block;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
        }
        .rv-stat-value {
          display: block;
          font-weight: 700;
          font-size: 14px;
        }
        .rv-chevron {
          color: var(--text-muted);
          font-size: 12px;
        }
        .rv-result-body {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }

        /* ===== Laptop ===== */
        @media (max-width: 1024px) {
          .rv-stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* ===== Tablet ===== */
        @media (max-width: 900px) {
          table {
            font-size: 13px;
          }
        }

        /* ===== Mobile ===== */
        @media (max-width: 640px) {
          .rv-stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .rv-result-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .rv-result-head-amounts {
            width: 100%;
            justify-content: space-between;
          }
        }

        /* ===== Small mobile ===== */
        @media (max-width: 480px) {
          .rv-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
