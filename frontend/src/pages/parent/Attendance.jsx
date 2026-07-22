import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import AttendanceView from '../../components/AttendanceView';

export default function ParentAttendance() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Child's Attendance</h2>
      <ChildSelector onChange={setChild} />
      {child && <AttendanceView studentId={child._id} />}
    </div>
  );
}
