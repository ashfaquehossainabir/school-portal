import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import AttendanceView from '../../components/AttendanceView';
import FeeSummaryWidget from '../../components/FeeSummaryWidget';

export default function ParentDashboard() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Parent Dashboard</h2>
      <ChildSelector onChange={setChild} />
      {child && (
        <>
          <FeeSummaryWidget studentId={child._id} linkTo="/parent/fees" />
          <p style={{ color: 'var(--text-secondary)', marginTop: 24 }}>
            Viewing <strong>{child.name}</strong>'s attendance summary
          </p>
          <AttendanceView studentId={child._id} />
        </>
      )}
    </div>
  );
}
