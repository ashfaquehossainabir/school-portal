import { useAuth } from '../../context/AuthContext';
import ResultView from '../../components/ResultView';

export default function StudentResults() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>My Results</h2>
      <ResultView studentId={user?._id} student={user} />
    </div>
  );
}
