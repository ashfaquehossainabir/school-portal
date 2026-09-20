import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// A type-to-search class/section picker — admin can search every class,
// teachers only see (and search within) their own assignedClasses.
export default function ClassSearchSelect({ value, onChange, placeholder = 'Search class or section', width = 220 }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'teacher') {
      const seen = new Set();
      const list = [];
      (user.assignedClasses || []).forEach((c) => {
        const key = `${c.className}|${c.section}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({ className: c.className, section: c.section });
        }
      });
      setClasses(list);
      if (list.length > 0 && !value.className) onChange(list[0]);
    } else {
      api.get('/classes').then((res) => {
        const list = res.data.map((c) => ({ className: c.className, section: c.section }));
        setClasses(list);
        if (list.length > 0 && !value.className) onChange(list[0]);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Keep the visible text in sync when the class is changed from elsewhere
  // (e.g. this component is used twice on the page, sharing one value).
  useEffect(() => {
    setQuery(value.className ? `${value.className} - ${value.section}` : '');
  }, [value.className, value.section]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q.length === 0 ? classes : classes.filter((c) => `${c.className} ${c.section}`.toLowerCase().includes(q));

  const handlePick = (c) => {
    setQuery(`${c.className} - ${c.section}`);
    setOpen(false);
    onChange(c);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', width }}>
      <input type="text" value={query} placeholder={placeholder} onChange={handleChange} onFocus={() => setOpen(true)} />
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
            <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>No classes found</div>
          )}
          {matches.map((c, i) => (
            <div
              key={i}
              onMouseDown={() => handlePick(c)}
              style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {c.className} - {c.section}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
