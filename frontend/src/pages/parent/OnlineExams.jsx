import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import ParentOnlineExamView from '../../components/ParentOnlineExamView';

export default function ParentOnlineExams() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Online Exams</h2>
      <ChildSelector onChange={setChild} />
      {child && <ParentOnlineExamView studentId={child._id} />}
    </div>
  );
}
