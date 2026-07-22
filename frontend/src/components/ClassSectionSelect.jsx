import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Lets admin pick any class; restricts teachers to their assignedClasses.
export default function ClassSectionSelect({ value, onChange }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (user?.role === 'teacher') {
      const list = (user.assignedClasses || []).map((c) => ({
        className: c.className,
        section: c.section,
      }));
      setClasses(list);
      if (list.length > 0 && !value.className) {
        onChange(list[0]);
      }
    } else {
      api.get('/classes').then((res) => {
        const list = res.data.map((c) => ({ className: c.className, section: c.section }));
        setClasses(list);
        if (list.length > 0 && !value.className) {
          onChange(list[0]);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChange = (e) => {
    const idx = Number(e.target.value);
    onChange(classes[idx]);
  };

  const selectedIndex = classes.findIndex(
    (c) => c.className === value.className && c.section === value.section
  );

  return (
    <select value={selectedIndex >= 0 ? selectedIndex : ''} onChange={handleChange} style={{ width: 220 }}>
      {classes.length === 0 && <option value="">No classes available</option>}
      {classes.map((c, i) => (
        <option key={i} value={i}>
          {c.className} - {c.section}
        </option>
      ))}
    </select>
  );
}
