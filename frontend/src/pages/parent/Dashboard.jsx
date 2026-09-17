import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import AttendanceView from '../../components/AttendanceView';
import FeeStatusWidget from '../../components/FeeStatusWidget';

export default function ParentDashboard() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Parent Dashboard</h2>
      <ChildSelector onChange={setChild} />
      {child && (
        <>
          <p style={{ color: 'var(--text-secondary)' }}>
            Viewing <strong>{child.name}</strong>'s attendance summary
          </p>
          <AttendanceView studentId={child._id} />
          <FeeStatusWidget studentId={child._id} />
        </>
      )}
    </div>
  );
}
