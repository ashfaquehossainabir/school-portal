import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    api
      .get(`/attendance/student/${user._id}`, {
        params: { month: now.getMonth() + 1, year: now.getFullYear() },
      })
      .then((res) => setStats(res.data.stats));
    api.get('/notices').then((res) => setNotices(res.data.slice(0, 3)));
  }, [user]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Hi {user?.name?.split(' ')[0]}, welcome back 👋</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        ID {user?.studentId} · {user?.className} · Section {user?.section}
      </p>

      <div className="grid grid-cols-4" style={{ margin: '20px 0' }}>
        <StatCard label="Attendance This Month" value={`${stats?.percentage ?? 0}%`} color="var(--success)" icon="📅" />
        <StatCard label="Present Days" value={stats?.present ?? 0} icon="✅" />
        <StatCard label="Absent Days" value={stats?.absent ?? 0} color="var(--danger)" icon="❌" />
        <StatCard label="Late / Excused" value={(stats?.late ?? 0) + (stats?.excused ?? 0)} color="var(--warning)" icon="⏱️" />
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent Notices</h3>
        {notices.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No notices yet.</p>}
        {notices.map((n) => (
          <div key={n._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
            <strong>{n.title}</strong>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
