import { useAuth } from '../../context/AuthContext';
import NotesView from '../../components/NotesView';

export default function StudentNotes() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Notes</h2>
      <NotesView className={user?.className} section={user?.section} />
    </div>
  );
}
