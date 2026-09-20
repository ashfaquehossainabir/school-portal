import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import useDebounce from '../hooks/useDebounce';

// Search-and-select input for picking a user (teacher/student/parent) by
// typing their name, email, or Student ID instead of scrolling a dropdown.
// Fetches the full list for the given role once, then filters client-side
// as the person types. Clicking a suggestion fills the input and reports
// the chosen user back via onSelect.
export default function UserSearchSelect({ role, placeholder, onSelect, excludeIds = [], resetSignal, initialUser = null, width = 240, prioritizeIds = [], filterFn }) {
  const [allUsers, setAllUsers] = useState([]);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 250);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const boxRef = useRef(null);

  const labelFor = (user) =>
    role === 'student'
      ? `${user.name} (${user.studentId || user.email})`
      : `${user.name} (${user.email})`;

  useEffect(() => {
    api.get('/users', { params: { role } }).then((res) => setAllUsers(res.data));
  }, [role]);

  // Pre-fill with an already-assigned user (e.g. editing an existing period/exam entry)
  useEffect(() => {
    if (initialUser) {
      setQuery(labelFor(initialUser));
      setSelected(initialUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser?._id]);

  // Allow the parent component to clear this input after a successful action
  useEffect(() => {
    setQuery('');
    setSelected(null);
  }, [resetSignal]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const excludeSet = new Set(excludeIds);
  const prioritySet = new Set(prioritizeIds);
  const byPriority = (list) =>
    [...list].sort((a, b) => (prioritySet.has(b._id) ? 1 : 0) - (prioritySet.has(a._id) ? 1 : 0));

  const matches =
    debouncedQuery.trim().length === 0
      ? byPriority(allUsers.filter((u) => !excludeSet.has(u._id) && (!filterFn || filterFn(u)))).slice(0, 8)
      : byPriority(
          allUsers
            .filter((u) => !excludeSet.has(u._id) && (!filterFn || filterFn(u)))
            .filter((u) => {
              const q = debouncedQuery.toLowerCase();
              return (
                u.name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                u.studentId?.toLowerCase().includes(q)
              );
            })
        ).slice(0, 8);

  const handleChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (selected) {
      setSelected(null);
      onSelect(null);
    }
  };

  const handlePick = (user) => {
    setQuery(labelFor(user));
    setSelected(user);
    setOpen(false);
    onSelect(user);
  };

  const handleClear = () => {
    setQuery('');
    setSelected(null);
    onSelect(null);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', width }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          style={{ paddingRight: selected ? 28 : undefined, ...(selected ? { borderColor: 'var(--accent)' } : {}) }}
        />
        {selected && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear selection"
            className="icon-btn"
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 15,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        )}
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            boxShadow: 'var(--shadow)',
            zIndex: 30,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {matches.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
              No {role}s found
            </div>
          )}
          {matches.map((u) => (
            <div
              key={u._id}
              onMouseDown={() => handlePick(u)}
              style={{
                padding: '9px 12px',
                fontSize: 13,
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-color)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontWeight: 600 }}>
                {u.name}
                {prioritySet.has(u._id) && (
                  <span style={{ color: 'var(--accent)', fontWeight: 500, fontSize: 11 }}> · assigned</span>
                )}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                {role === 'student' ? (u.studentId || u.email) : u.email}
                {role === 'student' && u.className ? ` · ${u.className} ${u.section || ''}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
