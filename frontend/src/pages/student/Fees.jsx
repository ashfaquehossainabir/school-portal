import { useAuth } from '../../context/AuthContext';
import FeeView from '../../components/FeeView';

export default function StudentFees() {
  const { user } = useAuth();
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>My Fees</h2>
      <FeeView studentId={user?._id} student={user} />
    </div>
  );
}
