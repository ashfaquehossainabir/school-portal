import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function NotesView({ className, section }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!className || !section) return;
    api
      .get('/notes', { params: { className, section } })
      .then((res) => setNotes(res.data))
      .finally(() => setLoading(false));
  }, [className, section]);

  if (loading) return <p>Loading notes...</p>;
  if (notes.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>No notes uploaded yet.</p>;

  return (
    <div className="grid grid-cols-2">
      {notes.map((n) => (
        <div className="card" key={n._id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h4 style={{ margin: '0 0 4px' }}>{n.title}</h4>
            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              {n.subject}
            </span>
          </div>
          {n.description && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{n.description}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              By {n.postedBy?.name} · {new Date(n.createdAt).toLocaleDateString()}
            </span>
            {n.fileUrl && (
              <a href={n.fileUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}>
                Open File
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
