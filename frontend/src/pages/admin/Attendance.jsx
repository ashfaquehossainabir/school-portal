import { useState } from 'react';
import TakeAttendance from '../../components/TakeAttendance';
import AttendanceReport from '../../components/AttendanceReport';

export default function AdminAttendance() {
  const [tab, setTab] = useState('take'); // 'take' | 'report'

  return (
    <div>
      <div className="page-head">
        <h2 style={{ marginTop: 0 }}>Attendance</h2>
        <div className="admin-att-tabs">
          <button
            type="button"
            className={`btn ${tab === 'take' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('take')}
          >
            Take Attendance
          </button>
          <button
            type="button"
            className={`btn ${tab === 'report' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('report')}
          >
            Attendance Report
          </button>
        </div>
      </div>

      {tab === 'take' ? <TakeAttendance /> : <AttendanceReport />}

      <style>{`
        .admin-att-tabs {
          display: flex;
          gap: 8px;
        }
        @media (max-width: 640px) {
          .admin-att-tabs {
            width: 100%;
          }
          .admin-att-tabs .btn {
            flex: 1 1 auto;
          }
        }
      `}</style>
    </div>
  );
}
