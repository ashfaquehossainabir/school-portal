import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Hi {user?.name?.split(' ')[0]}, welcome back 👋</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Subject: {user?.subject || '—'}</p>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Your Classes</h3>
        {(!user?.assignedClasses || user.assignedClasses.length === 0) && (
          <p style={{ color: 'var(--text-secondary)' }}>No classes assigned yet. Contact admin.</p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {user?.assignedClasses?.map((c, i) => (
            <span
              key={i}
              className="badge"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              {c.className} - {c.section}
            </span>
          ))}
        </div>
      </div>

      <p style={{ color: 'var(--text-secondary)', marginTop: 20, fontSize: 14 }}>
        Use the sidebar to take attendance, publish exam schedules, update the class routine, or post notes and notices.
      </p>
    </div>
  );
}
