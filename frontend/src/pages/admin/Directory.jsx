import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import useDebounce from '../../hooks/useDebounce';
import PersonDetailModal from '../../components/PersonDetailModal';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'teacher', label: 'Teachers', icon: '🧑‍🏫' },
  { key: 'student', label: 'Students', icon: '🎓' },
  { key: 'parent', label: 'Parents', icon: '👪' },
];

function subtitleFor(u) {
  if (u.role === 'student') return `${u.studentId || '—'} · ${u.className || '—'} ${u.section || ''}`.trim();
  if (u.role === 'teacher') return u.subject || 'No subject assigned';
  if (u.role === 'parent') return `${u.children?.length || 0} child(ren) linked`;
  return u.email;
}

export default function Directory() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/users', { params: { role: 'teacher' } }),
      api.get('/users', { params: { role: 'student' } }),
      api.get('/users', { params: { role: 'parent' } }),
    ])
      .then(([teachers, students, parents]) => {
        setPeople([...teachers.data, ...students.data, ...parents.data]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredPeople = useMemo(() => {
    const q = debouncedSearchQuery.trim().toLowerCase();
    return people
      .filter((p) => activeTab === 'all' || p.role === activeTab)
      .filter((p) => {
        if (!q) return true;
        return (
          p.name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.studentId?.toLowerCase().includes(q) ||
          p.className?.toLowerCase().includes(q) ||
          p.subject?.toLowerCase().includes(q) ||
          p.phone?.toLowerCase().includes(q)
        );
      });
  }, [people, activeTab, debouncedSearchQuery]);

  const counts = useMemo(
    () => ({
      all: people.length,
      teacher: people.filter((p) => p.role === 'teacher').length,
      student: people.filter((p) => p.role === 'student').length,
      parent: people.filter((p) => p.role === 'parent').length,
    }),
    [people]
  );

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Directory</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: -8, marginBottom: 20, fontSize: 14 }}>
        Browse every teacher, student, and parent in the school. Click a card to view full details.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: 13, padding: '8px 14px' }}
            >
              {tab.icon ? `${tab.icon} ` : ''}{tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name, email, ID, class, or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 320, marginLeft: 'auto' }}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading directory...</p>
      ) : filteredPeople.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No one matches your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3">
          {filteredPeople.map((p) => (
            <div
              key={p._id}
              className="card person-card"
              style={{ cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center' }}
              onClick={() => setSelectedId(p._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedId(p._id);
              }}
            >
              <div className="avatar" style={{ background: p.avatarColor, flexShrink: 0 }}>
                {p.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {subtitleFor(p)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge ${p.isActive ? 'badge-present' : 'badge-absent'}`} style={{ fontSize: 11 }}>
                    {p.isActive ? 'active' : 'inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedId && (
        <PersonDetailModal userId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
