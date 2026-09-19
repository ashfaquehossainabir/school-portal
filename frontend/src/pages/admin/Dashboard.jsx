import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import { formatMoney } from '../../utils/feeTypes';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ students: 0, teachers: 0, parents: 0, classes: 0 });
  const [feeSummary, setFeeSummary] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/users', { params: { role: 'student' } }),
      api.get('/users', { params: { role: 'teacher' } }),
      api.get('/users', { params: { role: 'parent' } }),
      api.get('/classes'),
    ]).then(([students, teachers, parents, classes]) => {
      setCounts({
        students: students.data.length,
        teachers: teachers.data.length,
        parents: parents.data.length,
        classes: classes.data.length,
      });
    });
    api.get('/fees/summary').then((res) => setFeeSummary(res.data));
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>School Overview</h2>
      <div className="grid grid-cols-4">
        <StatCard label="Students" value={counts.students} icon="🎓" onClick={() => navigate('/admin/directory')} />
        <StatCard label="Teachers" value={counts.teachers} icon="🧑‍🏫" onClick={() => navigate('/admin/directory')} />
        <StatCard label="Parents" value={counts.parents} icon="👪" onClick={() => navigate('/admin/directory')} />
        <StatCard label="Classes" value={counts.classes} icon="🏫" onClick={() => navigate('/admin/classes')} />
      </div>

      {feeSummary && (
        <div className="grid grid-cols-4" style={{ marginTop: 18 }}>
          <StatCard label="Fees Collected" value={formatMoney(feeSummary.totalCollected)} color="var(--success)" icon="✅" onClick={() => navigate('/admin/fees')} />
          <StatCard label="Fees Outstanding" value={formatMoney(feeSummary.totalDue)} color="var(--warning)" icon="⏳" onClick={() => navigate('/admin/fees')} />
          <StatCard label="Overdue Invoices" value={feeSummary.overdueCount} color="var(--danger)" icon="⚠️" onClick={() => navigate('/admin/fees')} />
          <StatCard label="Total Invoices" value={feeSummary.invoiceCount} icon="🧾" onClick={() => navigate('/admin/fees')} />
        </div>
      )}

      <div className="modal-wrapper" style={{ marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Getting Started</h3>
        <ol style={{ color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: 20 }}>
          <li>Create classes under <strong>Classes</strong> (e.g. Class 8, Section A).</li>
          <li>Add teacher accounts under <strong>Users</strong>, then assign them to classes.</li>
          <li>Add student accounts and link parent accounts to their children.</li>
          <li>Teachers can then take attendance, and publish exams, routines, notes and notices — all synced live to student/parent dashboards.</li>
        </ol>
      </div>
    </div>
  );
}
