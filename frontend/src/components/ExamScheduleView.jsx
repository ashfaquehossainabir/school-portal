import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function ExamScheduleView({ className, section }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!className || !section) return;
    api
      .get('/exams', { params: { className, section } })
      .then((res) => setExams(res.data))
      .finally(() => setLoading(false));
  }, [className, section]);

  if (loading) return <p>Loading exam schedule...</p>;
  if (exams.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>No exam schedules published yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {exams.map((exam) => (
        <div className="modal-wrapper" key={exam._id}>
          <h3 style={{ marginTop: 0 }}>{exam.title}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Room</th>
                </tr>
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
