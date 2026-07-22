import { useAuth } from '../../context/AuthContext';
import ExamScheduleView from '../../components/ExamScheduleView';

export default function StudentExams() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Exam Schedule</h2>
      <ExamScheduleView className={user?.className} section={user?.section} />
    </div>
  );
}
