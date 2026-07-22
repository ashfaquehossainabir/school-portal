import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import RoutineView from '../../components/RoutineView';

export default function ParentRoutine() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Class Routine</h2>
      <ChildSelector onChange={setChild} />
      {child && <RoutineView className={child.className} section={child.section} />}
    </div>
  );
}
