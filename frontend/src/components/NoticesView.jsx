import { useEffect, useState } from 'react';
import api from '../api/axios';

const PRIORITY_COLOR = {
  normal: 'var(--info)',
  important: 'var(--warning)',
  urgent: 'var(--danger)',
};

export default function NoticesView() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notices').then((res) => setNotices(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading notices...</p>;
  if (notices.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>No notices posted yet.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {notices.map((n) => (
        <div className="modal-wrapper notice-card" key={n._id} style={{ borderLeft: `4px solid ${PRIORITY_COLOR[n.priority]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <h4 style={{ margin: 0 }}>{n.title}</h4>
            <span className="badge" style={{ background: 'var(--bg-elevated)', color: PRIORITY_COLOR[n.priority] }}>
              {n.priority}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '8px 0' }}>{n.message}</p>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {n.postedBy?.name} · {new Date(n.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}
