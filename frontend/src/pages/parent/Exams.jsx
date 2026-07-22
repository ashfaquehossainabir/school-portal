import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import ExamScheduleView from '../../components/ExamScheduleView';

export default function ParentExams() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Exam Schedule</h2>
      <ChildSelector onChange={setChild} />
      {child && <ExamScheduleView className={child.className} section={child.section} />}
    </div>
  );
}
