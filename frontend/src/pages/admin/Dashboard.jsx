import { useEffect, useState } from 'react';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({ students: 0, teachers: 0, parents: 0, classes: 0 });

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
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>School Overview</h2>
      <div className="grid grid-cols-4">
        <StatCard label="Students" value={counts.students} icon="🎓" />
        <StatCard label="Teachers" value={counts.teachers} icon="🧑‍🏫" />
        <StatCard label="Parents" value={counts.parents} icon="👪" />
        <StatCard label="Classes" value={counts.classes} icon="🏫" />
      </div>

      <div className="card" style={{ marginTop: 20 }}>
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
