import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import ResultView from '../../components/ResultView';

export default function ParentResults() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Child's Results</h2>
      <ChildSelector onChange={setChild} />
      {child && <ResultView studentId={child._id} />}
    </div>
  );
}
