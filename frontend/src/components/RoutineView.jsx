import { useEffect, useState } from 'react';
import api from '../api/axios';

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function RoutineView({ className, section }) {
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!className || !section) return;
    api
      .get('/routines', { params: { className, section } })
      .then((res) => setRoutine(res.data[0] || null))
      .finally(() => setLoading(false));
  }, [className, section]);

  if (loading) return <p>Loading class routine...</p>;
  if (!routine) return <p style={{ color: 'var(--text-secondary)' }}>No routine published yet.</p>;

  const sortedDays = [...routine.days].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sortedDays.map((d) => (
        <div className="card" key={d.day}>
          <h3 style={{ marginTop: 0 }}>{d.day}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Teacher</th>
                  <th>Time</th>
                  <th>Room</th>
                </tr>
              </thead>
              <tbody>
                {d.periods.map((p) => (
                  <tr key={p._id}>
                    <td>{p.subject}</td>
                    <td>{p.teacher?.name || '—'}</td>
                    <td>{p.startTime} - {p.endTime}</td>
                    <td>{p.room || '—'}</td>
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
