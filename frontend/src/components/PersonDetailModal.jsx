import { useEffect, useState } from 'react';
import api from '../api/axios';

const ROLE_ICON = { student: '🎓', teacher: '🧑‍🏫', parent: '👪', admin: '🛡️' };

function InfoRow({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// Fetches the full record for a person (populating parent/children) and
// shows it in a modal. Used by the admin Directory page when a card is clicked.
export default function PersonDetailModal({ userId, onClose }) {
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/users/${userId}`)
      .then((res) => {
        if (!cancelled) setPerson(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-wrapper pdm-card" onClick={(e) => e.stopPropagation()}>
        {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading details...</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

        {person && (
          <>
            <div className="pdm-header">
              <div className="pdm-header-main">
                <div
                  className="avatar"
                  style={{ background: person.avatarColor, width: 52, height: 52, fontSize: 20, flexShrink: 0 }}
                >
                  {person.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, overflowWrap: 'anywhere' }}>{person.name}</h3>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span className={`role-badge role-${person.role}`} style={{ display: 'inline-block' }}>
                      {ROLE_ICON[person.role]} {person.role}
                    </span>
                    {person.isMainAdmin && (
                      <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>👑 Main Admin</span>
                    )}
                  </div>
                </div>
              </div>
              <button className="btn btn-outline icon-btn pdm-close-btn" onClick={onClose}>✕</button>
            </div>

            <div style={{ marginBottom: 6 }}>
              <span className={`badge ${person.isActive ? 'badge-present' : 'badge-absent'}`}>
                {person.isActive ? 'active' : 'inactive'}
              </span>
            </div>

            <h4 style={{ margin: '16px 0 4px' }}>Contact Information</h4>
            <InfoRow label="Email" value={person.email} />
            <InfoRow label="Phone" value={person.phone || '—'} />

            {person.role === 'student' && (
              <>
                <h4 style={{ margin: '16px 0 4px' }}>Academic Details</h4>
                <InfoRow label="Student ID" value={person.studentId} />
                <InfoRow label="Class" value={person.className} />
                <InfoRow label="Section" value={person.section} />
                <InfoRow label="Roll number" value={person.roll} />
                <h4 style={{ margin: '16px 0 4px' }}>Parent / Guardian</h4>
                {person.parent ? (
                  <InfoRow label={person.parent.name} value={person.parent.email} />
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No parent linked yet.</p>
                )}
              </>
            )}

            {person.role === 'teacher' && (
              <>
                <h4 style={{ margin: '16px 0 4px' }}>Teaching Details</h4>
                <InfoRow label="Subject" value={person.subject || '—'} />
                <h4 style={{ margin: '16px 0 4px' }}>Assigned Classes</h4>
                {person.assignedClasses?.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {person.assignedClasses.map((a, i) => (
                      <span
                        key={i}
                        className="badge"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      >
                        {a.subject} · {a.className} {a.section}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No subjects assigned yet.</p>
                )}
              </>
            )}

            {person.role === 'parent' && (
              <>
                <h4 style={{ margin: '16px 0 4px' }}>Children</h4>
                {person.children?.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {person.children.map((c) => (
                      <div
                        key={c._id}
                        style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-color)', fontSize: 13 }}
                      >
                        <strong>{c.name}</strong> — {c.studentId || '—'} · {c.className || '—'} {c.section || ''}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No children linked yet.</p>
                )}
              </>
            )}

            {person.role === 'admin' && (
              <>
                <h4 style={{ margin: '16px 0 4px' }}>Access Level</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  Full system administrator — can manage all users, classes, fees, results, and school-wide settings.
                  {person.isMainAdmin && ' This is the main admin account and cannot be deleted or deactivated by other admins.'}
                </p>
              </>
            )}

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 18 }}>
              Joined on {new Date(person.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </>
        )}

        <style>{`
          .pdm-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 16px;
          }
          .pdm-header-main {
            display: flex;
            gap: 14px;
            align-items: center;
            min-width: 0;
          }
          .pdm-close-btn {
            padding: 4px 10px;
            flex-shrink: 0;
          }

          @media (max-width: 480px) {
            .pdm-header-main {
              gap: 10px;
            }
            .pdm-header-main .avatar {
              width: 42px !important;
              height: 42px !important;
              font-size: 16px !important;
            }
            .pdm-card h3 {
              font-size: 17px;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
