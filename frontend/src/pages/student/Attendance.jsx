import { useAuth } from '../../context/AuthContext';
import AttendanceView from '../../components/AttendanceView';

export default function StudentAttendance() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>My Attendance</h2>
      <AttendanceView studentId={user?._id} />
    </div>
  );
}
