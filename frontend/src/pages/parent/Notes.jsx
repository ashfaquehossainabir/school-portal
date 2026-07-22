import { useState } from 'react';
import ChildSelector from '../../components/ChildSelector';
import NotesView from '../../components/NotesView';

export default function ParentNotes() {
  const [child, setChild] = useState(null);
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Notes</h2>
      <ChildSelector onChange={setChild} />
      {child && <NotesView className={child.className} section={child.section} />}
    </div>
  );
}
