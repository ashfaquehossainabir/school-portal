import { useEffect, useState } from 'react';
import api from '../api/axios';

// Fetches the logged-in parent's children and lets them pick which one to view.
// Calls onChange(child) whenever the selection changes (also on initial load).
export default function ChildSelector({ onChange }) {
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/users/parent/children')
      .then((res) => {
        setChildren(res.data);
        if (res.data.length > 0) {
          setSelectedId(res.data[0]._id);
          onChange(res.data[0]);
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    const child = children.find((c) => c._id === id);
    onChange(child);
  };

  if (loading) return <p>Loading children...</p>;
  if (children.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>No children linked to your account yet. Contact the school admin.</p>;

  return (
    <div style={{ marginBottom: 20 }}>
      <select value={selectedId} onChange={handleChange} style={{ width: 260 }}>
        {children.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name} ({c.studentId}) — {c.className} {c.section}
          </option>
        ))}
      </select>
    </div>
  );
}
