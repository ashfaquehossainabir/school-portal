import { useAuth } from '../../context/AuthContext';
import RoutineView from '../../components/RoutineView';

export default function StudentRoutine() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Class Routine</h2>
      <RoutineView className={user?.className} section={user?.section} />
    </div>
  );
}
