import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import StudentFeeStatus from '../../components/StudentFeeStatus';

export default function ParentFees() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Fee Status</h2>
      <ChildSelector onChange={setChild} />
      {child && <StudentFeeStatus studentId={child._id} />}
    </div>
  );
}
