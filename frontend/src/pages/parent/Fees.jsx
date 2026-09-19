import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import FeeView from '../../components/FeeView';

export default function ParentFees() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Fee Status</h2>
      <ChildSelector onChange={setChild} />
      {child && <FeeView studentId={child._id} student={child} />}
    </div>
  );
}
